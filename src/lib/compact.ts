/**
Context compaction.

When the transcript gets long, older turns are handed to a sub-agent that
writes a structured handover; those nodes are then hidden and replaced by the
summary. Nothing is deleted — the originals stay in the tree with
`hidden: true`, so the UI can still reveal them.

Section 8 of the handover is deliberately an "Aside": tangents and jokes get
appended to notes/aside.md rather than cluttering the working summary.
 */
import { connOf, mainPath, useApp } from "./store";

const S = () => useApp.getState();

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

  const conn = connOf(S().settings);
  if (conn.requireKey && !conn.apiKey) throw new Error("Add an API key in settings.");
  const res = await fetch(`${conn.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(conn.apiKey ? { Authorization: `Bearer ${conn.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: conn.model,
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
