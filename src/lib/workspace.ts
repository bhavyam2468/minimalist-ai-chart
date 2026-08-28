/**
The chat's virtual filesystem.

Files live in the store, not on disk — a path maps to a record with content,
mime type and a context state (local / known / context). Writing a file that
looks presentational also registers an artifact for it automatically, and
auto-opens html and .ui.json in the canvas, so anything the agent builds is
one click away without it having to say so.
 */
import { useApp, uid } from "./store";
import type { WFile } from "./types";

const S = () => useApp.getState();
const chatOf = (id: string) => S().chats[id];

export function getFile(chatId: string, path: string): WFile | undefined {
  const c = chatOf(chatId);
  return c.files[path] || Object.values(c.files).find((f) => f.path.endsWith(path) || f.path.split("/").pop() === path);
}

export function writeFile(chatId: string, path: string, content: string, origin: WFile["origin"] = "agent") {
  const prev = chatOf(chatId).files[path];
  const f: WFile = {
    path, content, mime: "text/plain", size: content.length,
    kind: /\.(ts|tsx|js|jsx|py|css|html|json|sh|rs|go|java|c|cpp)$/i.test(path) ? "code" : /\.(csv|tsv)$/i.test(path) ? "data" : "text",
    state: prev?.state === "known" ? "known" : "context",
    origin: prev?.origin ?? origin, createdAt: prev?.createdAt ?? Date.now(),
  };
  S().putFile(chatId, f);
  autoArtifact(chatId, path, !prev);
  return f;
}

/** Anything presentational the agent writes becomes a reference automatically. */
const REFERRABLE = /\.(html?|ui\.json|png|jpe?g|gif|webp|svg|mp4)$/i;
const AUTO_OPEN = /\.(html?|ui\.json)$/i;
export function autoArtifact(chatId: string, path: string, isNew: boolean) {
  if (!REFERRABLE.test(path)) return;
  const c = chatOf(chatId);
  if (Object.values(c.artifacts ?? {}).some((a) => a.ref === path)) return;
  const id = uid("af");
  S().putArtifact(chatId, {
    id,
    kind: "file",
    ref: path,
    title: path.split("/").length > 1 ? path.split("/").slice(-2).join("/") : path,
    createdAt: Date.now(),
  });
  if (isNew && AUTO_OPEN.test(path)) S().openCanvas({ kind: "artifact", id });
}
