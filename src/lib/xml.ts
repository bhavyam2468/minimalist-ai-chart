/* ===========================================================================
   xml.ts — every chat is a folder: one chat.xml describing the whole tree
   (branches, threads, tool calls, compaction markers) plus the attached files
   sitting beside it as real files. Exported as a zip.
   ========================================================================= */
import type { Chat, Node } from "./types";
import { threadsFor } from "./store";

const esc = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cdata = (s: string) => `<![CDATA[${String(s ?? "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;

function nodeXml(c: Chat, n: Node, depth: number, siblingIndex: number, siblingCount: number): string {
  const pad = "  ".repeat(depth);
  const attrs = [
    `id="${n.id}"`,
    `role="${n.role}"`,
    `at="${new Date(n.createdAt).toISOString()}"`,
    siblingCount > 1 ? `branch="${siblingIndex + 1}/${siblingCount}"` : "",
    n.hidden ? `compacted="true"` : "",
    n.model ? `model="${esc(n.model)}"` : "",
  ].filter(Boolean).join(" ");

  const parts: string[] = [`${pad}<message ${attrs}>`];
  if (n.quote) parts.push(`${pad}  <quote>${cdata(n.quote)}</quote>`);
  for (const a of n.attachments ?? []) parts.push(`${pad}  <attachment path="${esc(a)}" />`);
  if (n.summary) parts.push(`${pad}  <summary>${cdata(n.summary)}</summary>`);
  for (const t of n.toolCalls ?? []) {
    parts.push(`${pad}  <tool name="${esc(t.name)}" status="${t.status}"${t.ms ? ` ms="${t.ms}"` : ""}>`);
    parts.push(`${pad}    <args>${cdata(t.argsRaw || JSON.stringify(t.args))}</args>`);
    parts.push(`${pad}    <result>${cdata((t.output || "").slice(0, 20000))}</result>`);
    parts.push(`${pad}  </tool>`);
  }
  for (const id of n.artifactIds ?? []) {
    const cv = c.artifacts[id];
    if (cv) parts.push(`${pad}  <artifact ref="${esc(cv.ref)}" kind="${cv.kind}" title="${esc(cv.title)}"${cv.note ? ` note="${esc(cv.note)}"` : ""} />`);
  }
  if (n.content) parts.push(`${pad}  <content>${cdata(n.content)}</content>`);

  for (const th of threadsFor(c, n.id)) {
    parts.push(`${pad}  <thread id="${th.id}" title="${esc(th.title)}" isolated="true">`);
    if (th.quote) parts.push(`${pad}    <quote>${cdata(th.quote)}</quote>`);
    th.rootIds.forEach((rid, i) => parts.push(childrenXml(c, rid, depth + 2, i, th.rootIds.length)));
    parts.push(`${pad}  </thread>`);
  }

  parts.push(`${pad}</message>`);
  return parts.join("\n");
}

function childrenXml(c: Chat, id: string, depth: number, idx: number, count: number): string {
  const n = c.nodes[id];
  if (!n) return "";
  const out = [nodeXml(c, n, depth, idx, count)];
  n.children.forEach((cid, i) => out.push(childrenXml(c, cid, depth, i, n.children.length)));
  return out.join("\n");
}

export function chatToXml(c: Chat): string {
  const files = Object.values(c.files)
    .map((f) => `    <file path="${esc(f.path)}" kind="${f.kind}" state="${f.state}" origin="${f.origin}" bytes="${f.size}" />`)
    .join("\n");
  const canvases = Object.values(c.artifacts ?? {})
    .map((cv) => `    <artifact id="${cv.id}" kind="${cv.kind}" ref="${esc(cv.ref)}" title="${esc(cv.title)}"${cv.note ? ` note="${esc(cv.note)}"` : ""} />`)
    .join("\n");
  const sources = c.sources.map((s) => `    <source url="${esc(s.url)}" title="${esc(s.title)}" />`).join("\n");
  const body = c.rootIds.map((id, i) => childrenXml(c, id, 2, i, c.rootIds.length)).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<chat id="${c.id}" title="${esc(c.title)}" created="${new Date(c.createdAt).toISOString()}" updated="${new Date(c.updatedAt).toISOString()}">
  <skills>${(c.enabledSkills ?? []).map((s) => `\n    <skill name="${esc(s)}" />`).join("")}
  </skills>
  <workspace>
${files}
  </workspace>
  <artifacts>
${canvases}
  </artifacts>
  <sources>
${sources}
  </sources>
  <transcript>
${body}
  </transcript>
</chat>
`;
}

export async function exportChatZip(c: Chat) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const safe = (c.title || "chat").replace(/[^\w -]+/g, "").slice(0, 40) || "chat";
  zip.file("chat.xml", chatToXml(c));
  for (const f of Object.values(c.files)) {
    if (f.dataUrl) {
      const b64 = f.dataUrl.split(",")[1] || "";
      zip.file(`files/${f.path}`, b64, { base64: true });
    } else {
      zip.file(`files/${f.path}`, f.content);
    }
  }
  // artifacts are references only — their targets already live in files/
  zip.file("artifacts.json", JSON.stringify(Object.values(c.artifacts ?? {}), null, 2));
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${safe}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
