/**
Chat -> request translation.

Turns the node tree into the flat message array the API expects: the system
prompt first, then the main path, with tool calls and their results expanded
into assistant/tool pairs and images folded into multimodal user parts.

A thread is a detour, not a fork of history: everything up to the anchor node
is shared, then a marker explains that the rest is a side conversation that
never re-enters the main one.
 */
import { mainPath, threadPath } from "./store";
import { systemPrompt } from "./prompt";
import type { Chat, Node } from "./types";

export function cleanContentForLlm(text?: string | null): string {
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

export function buildMessages(c: Chat, threadId?: string | null, excludeId?: string): any[] {
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
