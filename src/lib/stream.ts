/**
The streaming HTTP layer.

One SSE round-trip against an OpenAI-compatible /chat/completions endpoint,
with two pieces of resilience baked in:

  * a per-provider model fallback chain (configured model, then the
    provider's defaults), retried without `temperature` if the provider
    rejects it
  * inline tool-call recovery — models that emit <tool_call>, ```tool_call```
    or <call:name> blocks in prose instead of using the tool_calls field still
    get their calls executed

Content deltas are pushed to onDelta as the accumulated string so far, so the
caller only ever has to render what it is given.
 */
import { useApp, uid, connOf } from "./store";

const S = () => useApp.getState();

export interface StreamOut { content: string; toolCalls: { id: string; name: string; args: string }[]; reasoning?: string; }

function extractInlineToolCalls(text: string): { id: string; name: string; args: string }[] {
  const calls: { id: string; name: string; args: string }[] = [];

  // Pattern A: <tool_call> ... </tool_call>
  const tagRegex = /<tool_call>([\s\S]*?)<\/tool_call>/gi;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const name = parsed.name || parsed.tool;
      const rawArgs = parsed.arguments || parsed.args || {};
      const args = typeof rawArgs === "string" ? rawArgs : JSON.stringify(rawArgs);
      if (name) calls.push({ id: uid("call"), name, args });
    } catch {}
  }

  // Pattern B: ```tool_call ... ``` or ```call:tool_name ... ```
  const codeRegex = /```(?:tool_call|call|tool)(?::(\w+))?\s*([\s\S]*?)```/gi;
  while ((match = codeRegex.exec(text)) !== null) {
    try {
      const langTool = match[1];
      const parsed = JSON.parse(match[2].trim());
      const name = langTool || parsed.name || parsed.tool;
      const rawArgs = langTool ? parsed : (parsed.arguments || parsed.args || {});
      const args = typeof rawArgs === "string" ? rawArgs : JSON.stringify(rawArgs);
      if (name) calls.push({ id: uid("call"), name, args });
    } catch {}
  }

  // Pattern C: <call:(\w+)> ... </call:\1>
  const tagCallRegex = /<call:(\w+)>([\s\S]*?)<\/call:\1>/gi;
  while ((match = tagCallRegex.exec(text)) !== null) {
    try {
      const name = match[1];
      const parsed = JSON.parse(match[2].trim());
      const args = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
      if (name) calls.push({ id: uid("call"), name, args });
    } catch {}
  }

  return calls;
}

export async function streamChat(
  messages: any[],
  tools: any[],
  onDelta: (t: string) => void,
  signal?: AbortSignal,
  onReasoning?: (t: string) => void
): Promise<StreamOut> {
  const conn = connOf(S().settings);
  const { temperature } = S().settings;
  if (conn.requireKey && !conn.apiKey) throw new Error("Add an API key in settings.");
  if (!conn.baseUrl) throw new Error("Set a base URL in settings.");
  if (!conn.model) throw new Error("Set a model in settings.");

  const attempt = async (m: string, withTemp: boolean) => {
    const body: any = {
      model: m,
      messages,
      stream: true,
      ...(tools.length ? { tools: tools.map((t) => ({ type: "function", function: t })), tool_choice: "auto", parallel_tool_calls: true } : {}),
    };
    if (withTemp) body.temperature = temperature;
    const res = await fetch(`${conn.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(conn.apiKey ? { Authorization: `Bearer ${conn.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      const txt = await res.text();
      const err: any = new Error(txt.slice(0, 400));
      err.status = res.status; err.body = txt;
      throw err;
    }
    return res;
  };

  const chain = [conn.model, ...conn.fallbacks].filter((v, i, a) => v && a.indexOf(v) === i);
  let res: Response | null = null;
  let lastErr: any = null;
  for (const m of chain) {
    try { res = await attempt(m, true); break; }
    catch (e: any) {
      lastErr = e;
      if (/temperature/i.test(e.body || "")) { try { res = await attempt(m, false); break; } catch (e2) { lastErr = e2; } }
      if (!/model|not exist|not found|unsupported|does not/i.test(e.body || "")) break;
    }
  }
  if (!res) throw lastErr ?? new Error("request failed");

  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let content = "";
  let reasoning = "";
  const calls: Record<number, { id: string; name: string; args: string }> = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const l = line.trim();
      if (!l.startsWith("data:")) continue;
      const payload = l.slice(5).trim();
      if (payload === "[DONE]") continue;
      let j: any;
      try { j = JSON.parse(payload); } catch { continue; }
      const d = j.choices?.[0]?.delta;
      if (!d) continue;
      /* chain-of-thought channel: reasoning_content is the de-facto field
         across OpenAI-compatible providers (DeepSeek, Qwen, vLLM, OpenRouter
         passthrough); `reasoning` is the common alias. It streams before
         content begins. */
      const rd = d.reasoning_content ?? d.reasoning;
      if (rd) { reasoning += rd; onReasoning?.(reasoning); }
      if (d.content) { content += d.content; onDelta(content); }
      for (const tc of d.tool_calls ?? []) {
        const i = tc.index ?? 0;
        const acc = (calls[i] ??= { id: tc.id || uid("call"), name: "", args: "" });
        if (tc.id) acc.id = tc.id;
        if (tc.function?.name) acc.name += tc.function.name;
        if (tc.function?.arguments) acc.args += tc.function.arguments;
      }
    }
  }

  const resultCalls = Object.values(calls);
  if (!resultCalls.length && content) {
    const inlineCalls = extractInlineToolCalls(content);
    if (inlineCalls.length) {
      return { content, toolCalls: inlineCalls, reasoning: reasoning || undefined };
    }
  }

  return { content, toolCalls: resultCalls, reasoning: reasoning || undefined };
}
