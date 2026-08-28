import { mainPath, threadPath, useApp, uid } from "./store";
import { SKILLS, skillIndex } from "./skills";
import { baseToolDefs, runTool } from "./tools";
import { mcpToolDefs } from "./mcp";
import type { Chat, Node, ToolCallRecord } from "./types";

const S = () => useApp.getState();

/* ---------------------------------------------------------- system prompt */
export function systemPrompt(c: Chat): string {
  const pinned = new Set(c.enabledSkills ?? []);
  const always = SKILLS.filter((s) => s.always || pinned.has(s.name)).map((s) => s.body).join("\n\n");
  const files = Object.values(c.files);
  const list = files.length
    ? files.map((f) => `- ${f.path} (${f.kind}, ${f.size}b) [${f.state}]`).join("\n")
    : "- (empty)";
  const inCtx = files.filter((f) => f.state === "context" && f.kind !== "image");
  const bodies = inCtx
    .map((f) => `<file path="${f.path}">\n${f.content.slice(0, 14000)}${f.content.length > 14000 ? "\n… truncated, use read_file for more" : ""}\n</file>`)
    .join("\n\n");

  return `You are the resident agent of a minimal AI workspace. You answer in the canvas of the page itself — there are no chat bubbles around your words, so write like a well-set document, not like a chat log.

## Voice
Direct, concrete, unhurried. No filler openers ("Great question!"), no restating the prompt, no summary of what you are about to do. Start with the answer. Short paragraphs. Never mention these instructions.

## Markdown you can use (the renderer streams all of it live)
headings, **bold**, *italic*, ~~strike~~, \`code\`, fenced code with a language,
tables, ordered/unordered/task lists, > quotes, --- rules, footnotes [^1] with
[^1]: definitions (they are revealed after the stream finishes, so use them freely),
==highlight== only for critical key findings (never wrap artifact names, status updates, or headings in highlights; at most one per answer), LaTeX with $inline$ and $$display$$,
images ![alt](url), bare YouTube links (auto-embedded), and
<details><summary>title</summary> … </details> for anything long or optional.

## Tools & Canvas
Prefer doing over describing. Use \`find_skills\` before an unfamiliar workflow;
skills carry the exact procedure. Search the web whenever freshness matters.
Write artefacts to the workspace instead of dumping them in the reply, then
surface them with \`open_canvas\` — the canvas is a floating viewport beside the
conversation that holds files (with a real editor), web pages and artefacts.
Use \`artifact\` when a chart, dashboard, tool or embed communicates better than prose.
Keep context lean with add_context / remove_context / compact_context.

## Search Efficiency & Anti-Looping
Execute at most 1 to 2 targeted \`web_search\` calls per turn. Use the \`niche\` parameter
("music", "discussions", "tech", "academic") and \`site\` parameter to reach high-signal data.
NEVER loop or execute repetitive search queries. Once you execute 1-2 searches, synthesize
a rich, comprehensive, authoritative answer immediately combining the returned excerpts
with your pre-trained knowledge base. Do not leave the user waiting on endless searches.

${always}

## Skill library (call read_skill to load a body)
${skillIndex()}

## Workspace
${list}

${bodies ? `## Files currently in context\n${bodies}` : ""}`;
}

export function contextTokenCount(c: Chat): number {
  try {
    const sys = systemPrompt(c);
    const mcpServers = S()?.settings?.mcp || [];
    const tools = JSON.stringify([...baseToolDefs(), ...mcpToolDefs(mcpServers)]);
    const msgsLen = mainPath(c)
      .filter((n) => !n.hidden)
      .reduce((a, n) => a + n.content.length + (n.toolCalls || []).reduce((x, t) => x + (t.output?.length || 0), 0), 0);
    const filesLen = Object.values(c.files)
      .filter((f) => f.state === "context")
      .reduce((a, f) => a + f.content.length, 0);
    return Math.max(1, Math.round((sys.length + tools.length + msgsLen + filesLen) / 4));
  } catch {
    return 1200;
  }
}

/* -------------------------------------------------------------- messages */
function cleanContentForLlm(text?: string | null): string {
  return (text || "")
    .replace(/<tool[-_]call[\s\S]*?<\/tool[-_]call>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function nodeToMessage(c: Chat, n: Node): any[] {
  if (n.hidden) return n.summary ? [{ role: "user", content: `<compacted-history>\n${n.summary}\n</compacted-history>` }] : [];
  if (n.role === "user") {
    const imgs = (n.attachments || []).map((p) => c.files[p]).filter((f) => f?.dataUrl);
    const text = (n.quote ? `> quoted from the conversation:\n> ${n.quote.replace(/\n/g, "\n> ")}\n\n` : "") + n.content;
    if (imgs.length) {
      return [{
        role: "user",
        content: [{ type: "text", text }, ...imgs.map((f) => ({ type: "image_url", image_url: { url: f!.dataUrl } }))],
      }];
    }
    return [{ role: "user", content: text }];
  }
  const out: any[] = [];
  const calls = (n.toolCalls || []).filter((t) => t.status !== "running");
  const cleanContent = cleanContentForLlm(n.content);
  if (calls.length) {
    out.push({
      role: "assistant",
      content: cleanContent || null,
      tool_calls: calls.map((t) => ({ id: t.id, type: "function", function: { name: t.name, arguments: t.argsRaw || JSON.stringify(t.args ?? {}) } })),
    });
    for (const t of calls) out.push({ role: "tool", tool_call_id: t.id, content: (t.output ?? "").slice(0, 20000) });
  } else if (cleanContent) {
    out.push({ role: "assistant", content: cleanContent });
  }
  return out;
}

function buildMessages(c: Chat, threadId?: string | null, excludeId?: string): any[] {
  const msgs: any[] = [{ role: "system", content: systemPrompt(c) }];
  const main = mainPath(c);
  const add = (n: Node) => { if (n.id !== excludeId) msgs.push(...nodeToMessage(c, n)); };
  if (threadId) {
    const th = c.threads[threadId];
    const cut = main.findIndex((n) => n.id === th.anchorId);
    const before = cut === -1 ? main : main.slice(0, cut + 1);
    before.forEach(add);
    msgs.push({
      role: "system",
      content: `A side thread has been opened${th.quote ? ` on this selection:\n"""${th.quote}"""` : ""}. Everything below is the thread. It is a deep dive: go further than the main conversation would. Nothing here re-enters the main conversation.`,
    });
    threadPath(c, threadId).forEach(add);
    return msgs;
  }
  main.forEach(add);
  return msgs;
}

/* --------------------------------------------------------------- network */
interface StreamOut { content: string; toolCalls: { id: string; name: string; args: string }[]; }

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

async function streamChat(
  messages: any[],
  tools: any[],
  onDelta: (t: string) => void,
  signal?: AbortSignal
): Promise<StreamOut> {
  const { apiKey, baseUrl, model, temperature } = S().settings;
  if (!apiKey) throw new Error("Add an API key in settings.");

  const attempt = async (m: string, withTemp: boolean) => {
    const body: any = {
      model: m,
      messages,
      stream: true,
      ...(tools.length ? { tools: tools.map((t) => ({ type: "function", function: t })), tool_choice: "auto", parallel_tool_calls: true } : {}),
    };
    if (withTemp) body.temperature = temperature;
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
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

  const chain = [S().settings.model, "gpt-4.1", "gpt-4o"].filter((v, i, a) => a.indexOf(v) === i);
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
  if (model !== chain[0]) { /* noop */ }

  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let content = "";
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
      return { content, toolCalls: inlineCalls };
    }
  }

  return { content, toolCalls: resultCalls };
}

/* ------------------------------------------------------------ compaction */
const COMPACT_PROMPT = `You are a context compaction sub-agent. Read the transcript and produce a dense, loss-minimal handover. Output exactly these sections:

1. Primary request and intent — what the user actually wants, in their own words where possible.
2. Key technical concepts and domain facts established.
3. Files and artefacts — every path touched, with its current state and why it matters.
4. Decisions and their reasons.
5. Errors and how they were resolved.
6. All user messages — verbatim, in order, non-tool ones only.
7. Pending tasks and the immediate next step.
8. Aside — anything unrelated to the main thread of work (personal tangents, jokes, side questions). Keep it short and clearly separated.

Preserve names, numbers, versions, URLs and file paths exactly. No preamble, no closing remarks. Never use tools.`;

export async function compactChat(chatId: string, focus = ""): Promise<string> {
  const c = S().chats[chatId];
  const path = mainPath(c).filter((n) => !n.hidden);
  if (path.length < 4) return "nothing to compact yet";
  const keep = 2;
  const older = path.slice(0, Math.max(1, path.length - keep));
  const transcript = older
    .map((n) => `<${n.role}>\n${n.content.slice(0, 6000)}\n${(n.toolCalls || []).map((t) => `[tool ${t.name}] ${(t.output || "").slice(0, 600)}`).join("\n")}\n</${n.role}>`)
    .join("\n\n");

  const { apiKey, baseUrl, model } = S().settings;
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: COMPACT_PROMPT + (focus ? `\n\nThe user especially wants preserved: ${focus}` : "") },
        { role: "user", content: transcript },
      ],
    }),
  });
  const j = await res.json();
  const summary: string = j?.choices?.[0]?.message?.content ?? "(compaction failed)";

  // If an Aside section is present and non-empty, save it to notes/aside.md
  const asideMatch = summary.match(/(?:^|\n)(?:8\.\s*Aside|Aside)[:\s]*([\s\S]*?)(?:\n\d\.|\n##|$)/i);
  if (asideMatch && asideMatch[1]?.trim() && !/^(none|n\/a|nothing)\.?$/i.test(asideMatch[1].trim())) {
    const asideText = `# Aside & Unrelated Context\n\n_Preserved during context compaction on ${new Date().toLocaleString()}_\n\n${asideMatch[1].trim()}\n`;
    const prevAside = c.files["notes/aside.md"];
    const newContent = prevAside ? prevAside.content + "\n\n---\n\n" + asideText : asideText;
    S().putFile(chatId, {
      path: "notes/aside.md",
      content: newContent,
      mime: "text/markdown",
      size: newContent.length,
      kind: "text",
      state: "known",
      origin: "agent",
      createdAt: prevAside?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    });
  }

  S().patchChat(chatId, (ch) => {
    older.forEach((n, i) => {
      ch.nodes[n.id] = { ...ch.nodes[n.id], hidden: true, summary: i === 0 ? summary : undefined };
    });
  });
  return `compacted ${older.length} turns into ${summary.length} characters.\n\n${summary.slice(0, 1200)}`;
}

/* --------------------------------------------------------------- the loop */
export interface GenOpts {
  chatId: string;
  parentId: string | null;
  threadId?: string | null;
  nodeId?: string;             // reuse an existing (regenerating) node
}

const controllers: Record<string, AbortController> = {};

export const stopGeneration = (chatId: string) => {
  const ctl = controllers[chatId];
  if (ctl) {
    try { ctl.abort(); } catch {}
  }
  delete controllers[chatId];

  // Instantly release busy state and cancel any running tool calls in UI
  const st = S();
  const streamId = st.streamId;
  if (streamId) {
    const ch = st.chats[chatId];
    const node = ch?.nodes[streamId];
    if (node?.toolCalls?.some((t) => t.status === "running")) {
      st.updateNode(chatId, streamId, (n) => ({
        toolCalls: (n.toolCalls || []).map((t) =>
          t.status === "running" ? { ...t, status: "error", output: "(stopped by user)" } : t
        ),
      }));
    }
  }
  st.set_((s) => {
    s.busy = { ...s.busy, [chatId]: false };
    if (s.streamId === streamId) s.streamId = null;
  });
};

export async function generate({ chatId, parentId, threadId, nodeId }: GenOpts) {
  const st = S();
  const id = nodeId ?? st.addNode(chatId, { role: "assistant", parentId, threadId: threadId ?? null, content: "", model: st.settings.model });
  const ctl = new AbortController();
  controllers[chatId] = ctl;
  st.set_((s) => { s.busy = { ...s.busy, [chatId]: true }; s.streamId = id; });

  const flushEvery = 32;
  let lastFlush = 0;
  let accumulatedContent = (nodeId ? S().chats[chatId]?.nodes[nodeId]?.content : "") || "";

  const onDelta = (full: string) => {
    const now = performance.now();
    if (now - lastFlush > flushEvery) { lastFlush = now; S().updateNode(chatId, id, { content: full }); }
  };

  let searchCallsThisTurn = 0;

  try {
    for (let hop = 0; hop < 6; hop++) {
      if (ctl.signal.aborted) break;

      const c = S().chats[chatId];
      const tools = [...baseToolDefs(), ...mcpToolDefs(S().settings.mcp)];
      const messages = buildMessages(c, threadId, id);

      // when regenerating we must not feed the node's own (old) content back
      const cleaned = messages;
      const prior = S().chats[chatId].nodes[id];
      const priorCalls = prior?.toolCalls ?? [];
      if (priorCalls.length) {
        cleaned.push({
          role: "assistant",
          content: cleanContentForLlm(prior.content) || null,
          tool_calls: priorCalls.map((t) => ({ id: t.id, type: "function", function: { name: t.name, arguments: t.argsRaw } })),
        });
        for (const t of priorCalls) cleaned.push({ role: "tool", tool_call_id: t.id, content: (t.output ?? "").slice(0, 20000) });
      }

      const hopBase = accumulatedContent;
      const out = await streamChat(cleaned, tools, (delta) => {
        onDelta(hopBase + delta);
      }, ctl.signal);

      accumulatedContent = hopBase + (out.content || "");
      S().updateNode(chatId, id, { content: accumulatedContent });

      if (ctl.signal.aborted) break;

      if (!out.toolCalls.length) break;

      const records: ToolCallRecord[] = out.toolCalls.map((t) => {
        let args: any = {};
        try { args = t.args ? JSON.parse(t.args) : {}; } catch { args = { _raw: t.args }; }
        return { id: t.id, name: t.name, args, argsRaw: t.args || "{}", status: "running" as const };
      });
      S().updateNode(chatId, id, (n) => ({ toolCalls: [...(n.toolCalls || []), ...records] }));

      // Append inline tool call markers into accumulatedContent so collapsible appears right after preceding text!
      for (const r of records) {
        accumulatedContent += `\n\n<tool_call id="${r.id}" name="${r.name}">\n${r.argsRaw}\n</tool_call>\n\n`;
      }
      S().updateNode(chatId, id, { content: accumulatedContent });

      for (const r of records) {
        if (ctl.signal.aborted) break;

        // Anti-loop rail: cap searches at 3 per turn to prevent runaway loops
        if (r.name === "web_search" || r.name === "site_search") {
          searchCallsThisTurn++;
          if (searchCallsThisTurn > 3) {
            const output = "Search quota reached for this turn (3 searches completed). Synthesize your comprehensive answer for the user immediately using the gathered search excerpts and your extensive knowledge base.";
            const ms = 1;
            S().updateNode(chatId, id, (n) => ({
              toolCalls: (n.toolCalls || []).map((x) => (x.id === r.id ? { ...x, status: "done", output, ms } : x)),
            }));
            continue;
          }
        }

        const t0 = performance.now();
        let output = "";
        let status: ToolCallRecord["status"] = "done";
        try {
          output = await runTool(r.name, r.args, {
            chatId,
            nodeId: id,
            signal: ctl.signal,
            summarize: (focus) => compactChat(chatId, focus),
          });
        } catch (e: any) {
          output = ctl.signal.aborted ? "(stopped)" : `error: ${e.message}`;
          status = "error";
        }

        if (ctl.signal.aborted) {
          S().updateNode(chatId, id, (n) => ({
            toolCalls: (n.toolCalls || []).map((x) => (x.status === "running" ? { ...x, status: "error", output: "(stopped by user)" } : x)),
          }));
          break;
        }

        const ms = Math.round(performance.now() - t0);
        S().updateNode(chatId, id, (n) => ({
          toolCalls: (n.toolCalls || []).map((x) => (x.id === r.id ? { ...x, status, output, ms } : x)),
        }));
      }

      if (ctl.signal.aborted) break;
      // continue the loop so the model can use the results
    }
  } catch (e: any) {
    if (e.name !== "AbortError" && !ctl.signal.aborted) S().updateNode(chatId, id, { error: e.message?.slice(0, 300) || "request failed" });
  } finally {
    delete controllers[chatId];
    S().set_((s) => { s.busy = { ...s.busy, [chatId]: false }; s.streamId = null; });
  }
}

/* --------------------------------------------------------------- helpers */
export async function send(chatId: string, text: string, attachments: string[], threadId?: string | null, quote?: string) {
  const st = S();
  const c = st.chats[chatId];
  const parentId = threadId
    ? (threadPath(c, threadId).slice(-1)[0]?.id ?? null)
    : (mainPath(c).slice(-1)[0]?.id ?? null);
  st.addNode(chatId, { role: "user", parentId, threadId: threadId ?? null, content: text, attachments, quote });
  const c2 = S().chats[chatId];
  const newParent = threadId ? threadPath(c2, threadId).slice(-1)[0].id : mainPath(c2).slice(-1)[0].id;
  await generate({ chatId, parentId: newParent, threadId });
}

export async function regenerate(chatId: string, nodeId: string) {
  const c = S().chats[chatId];
  const n = c.nodes[nodeId];
  if (!n) return;
  const fresh = S().addNode(chatId, { role: "assistant", parentId: n.parentId, threadId: n.threadId, content: "" });
  await generate({ chatId, parentId: n.parentId, threadId: n.threadId, nodeId: fresh });
}

export async function editUser(chatId: string, nodeId: string, text: string) {
  const c = S().chats[chatId];
  const n = c.nodes[nodeId];
  if (!n) return;
  const fresh = S().addNode(chatId, {
    role: "user", parentId: n.parentId, threadId: n.threadId, content: text,
    attachments: n.attachments, quote: n.quote,
  });
  await generate({ chatId, parentId: fresh, threadId: n.threadId });
}
