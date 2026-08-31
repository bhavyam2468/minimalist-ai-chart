/**
The agent turn loop.

`generate` is the whole thing: build messages, stream a completion, and while
the model keeps asking for tools, run them and stream again — up to six hops.
Tool calls are written into the node as they start so the UI shows them
running, then patched with output and timing as they finish.

`stopGeneration` aborts the in-flight request and marks anything still running
as stopped, so a cancel is immediate rather than waiting for the next hop.

`send`, `regenerate` and `editUser` are the three ways a turn begins; each one
just appends a node and calls `generate`.
 */
import { connOf, mainPath, threadPath, useApp } from "./store";
import { baseToolDefs } from "./tool-defs";
import { runTool } from "./run-tool";
import { mcpToolDefs } from "./mcp";
import { buildMessages, cleanContentForLlm } from "./messages";
import { streamChat } from "./stream";
import { compactChat } from "./compact";
import type { ToolCallRecord } from "./types";

const S = () => useApp.getState();

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
  const id = nodeId ?? st.addNode(chatId, { role: "assistant", parentId, threadId: threadId ?? null, content: "", model: connOf(st.settings).model });
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
      }, ctl.signal, (r) => {
        S().updateNode(chatId, id, { reasoning: r });
      });

      accumulatedContent = hopBase + (out.content || "");
      S().updateNode(chatId, id, { content: accumulatedContent, reasoning: out.reasoning });

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

/* ---- the three ways a turn begins ---- */
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
