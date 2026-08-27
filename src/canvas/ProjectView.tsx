import { useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { themeCss } from "./Blocks";
import { I } from "../ui/Icons";
import type { WFile } from "../lib/types";

/* ===========================================================================
   ProjectView — turns a folder of real workspace files into a running page.

   There is no special "website" object. The agent writes
   `pomodoro/index.html`, `pomodoro/styles.css`, `pomodoro/script.js` with
   edit_file; this component resolves the relative references against its
   sibling files, injects the app's tokens, and runs it in a sandboxed frame.
   Because it reads straight from the store, an `apply_diff` from the agent
   re-renders the running page live.
   ========================================================================= */

const ext = (p: string) => (p.split(".").pop() || "").toLowerCase();
const dir = (p: string) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");
const base = (p: string) => p.split("/").pop() || p;

export function siblingsOf(files: Record<string, WFile>, path: string): WFile[] {
  const d = dir(path);
  return Object.values(files)
    .filter((f) => (d ? f.path.startsWith(d + "/") : !f.path.includes("/")) && f.path !== path)
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** Inline sibling css/js/images referenced by relative url. */
export function bundleProject(entry: WFile, sibs: WFile[]): { doc: string; missing: string[] } {
  const missing: string[] = [];
  const dirOf = dir(entry.path);
  const find = (ref: string) => {
    const clean = ref.replace(/^\.\//, "").replace(/[#?].*$/, "");
    const abs = dirOf ? `${dirOf}/${clean}` : clean;
    const up = abs.replace(/\/\.\//g, "/");
    return sibs.find((f) => f.path === up) || sibs.find((f) => f.path === clean) || filesByName(clean, sibs);
  };

  let html = entry.content;

  // <link rel="stylesheet" href="...">
  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/stylesheet/i.test(tag)) return tag;
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) return tag;
    if (/^(https?:)?\/\//i.test(href)) return tag;      // keep external urls as-is
    const f = find(href);
    if (!f) { missing.push(href); return `<!-- missing stylesheet: ${href} -->`; }
    return `<style data-src="${f.path}">\n${f.content}\n</style>`;
  });

  // <script src="..."></script>
  html = html.replace(/<script\b([^>]*)>\s*<\/script>/gi, (tag, attrs: string) => {
    const src = attrs.match(/src\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!src) return tag;
    if (/^(https?:)?\/\//i.test(src)) return tag;
    const f = find(src);
    if (!f) { missing.push(src); return `<!-- missing script: ${src} -->`; }
    const keep = /type\s*=\s*["']module["']/i.test(attrs) ? ' type="module"' : "";
    return `<script${keep}>\n${f.content}\n</script>`;
  });

  // relative images / media
  html = html.replace(/(src|href)\s*=\s*["']([^"']+\.(?:png|jpe?g|gif|webp|svg|avif|mp4|webm|ico))["']/gi, (tag, attr: string, ref: string) => {
    if (/^(https?:)?\/\//i.test(ref) || ref.startsWith("data:")) return tag;
    const f = find(ref);
    const url = f?.dataUrl || (f && f.kind === "image" ? f.content : null);
    if (!url) { missing.push(ref); return tag; }
    return `${attr}="${url}"`;
  });

  // inject our tokens first so the project's own CSS can override them
  const theme = `<style data-atelier-theme>${themeCss()}</style>`;
  if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (m) => `${m}\n${theme}`);
  else if (/<html[^>]*>/i.test(html)) html = html.replace(/<html[^>]*>/i, (m) => `${m}\n<head>${theme}</head>`);
  else html = `${theme}\n${html}`;

  if (!/<meta[^>]*viewport/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (m) => `${m}\n<meta name="viewport" content="width=device-width,initial-scale=1">`);
  }

  return { doc: html, missing: [...new Set(missing)] };
}

function filesByName(name: string, sibs: WFile[]): WFile | undefined {
  return sibs.find((f) => base(f.path) === base(name));
}

/* =================================================================== view */
export function ProjectView({ chatId, path }: { chatId: string; path: string }) {
  const files = useApp((s) => s.chats[chatId]?.files ?? {});
  const putFile = useApp((s) => s.putFile);
  const openCanvas = useApp((s) => s.openCanvas);
  const [tab, setTab] = useState<"run" | "code">("run");
  const [nonce, setNonce] = useState(0);
  const [draft, setDraft] = useState(files[path]?.content ?? "");
  const [dirty, setDirty] = useState(false);

  const entry = files[path];
  const sibs = useMemo(() => siblingsOf(files, path), [files, path]);
  const all = useMemo(() => [entry, ...sibs].filter(Boolean) as WFile[], [entry, sibs]);

  const built = useMemo(() => (entry ? bundleProject(dirty ? { ...entry, content: draft } : entry, sibs) : null),
    [entry, sibs, draft, dirty]);

  if (!entry) return <div className="empty-hint" style={{ padding: 20 }}>not found: {path}</div>;

  const isHtml = ["html", "htm"].includes(ext(path));

  return (
    <div className="fe">
      <div className="fe-bar">
        <span className="fe-tag">{dir(path) ? dir(path) + "/" : ""}<b style={{ color: "var(--text-dim)" }}>{base(path)}</b></span>
        <span className="fe-tag">{all.length} file{all.length === 1 ? "" : "s"}</span>
        {built?.missing.length ? <span className="fe-tag" style={{ color: "var(--warn)" }}>{built.missing.length} unresolved</span> : null}
        <span className="grow" />
        {isHtml && (
          <div className="fe-seg">
            <button data-active={tab === "run"} onClick={() => setTab("run")}>run</button>
            <button data-active={tab === "code"} onClick={() => { setDraft(entry.content); setDirty(false); setTab("code"); }}>code</button>
          </div>
        )}
        {isHtml && tab === "run" && <button className="icon-btn sm" title="Restart" onClick={() => setNonce((n) => n + 1)}><I.refresh size={13} /></button>}
        {isHtml && tab === "code" && (
          <button className="icon-btn sm" title="Save & run" disabled={!dirty} onClick={() => {
            putFile(chatId, { ...entry, content: draft, size: draft.length, updatedAt: Date.now() });
            setDirty(false); setTab("run"); setNonce((n) => n + 1);
          }}>{dirty ? "save" : <I.check size={13} />}</button>
        )}
      </div>

      {/* file tabs — everything in the folder is reachable */}
      {all.length > 1 && (
        <div className="pj-files">
          {all.map((f) => (
            <button key={f.path} data-active={f.path === path} onClick={() => (f.path === path ? null : openCanvas({ kind: "file", path: f.path }))}>
              {base(f.path)}
            </button>
          ))}
        </div>
      )}

      <div className="fe-body" style={{ padding: 0 }}>
        {!isHtml || tab === "code" ? (
          <div className="pj-code">
            <textarea
              value={tab === "code" ? draft : entry.content}
              readOnly={!isHtml || tab !== "code"}
              spellCheck={false}
              onChange={(e) => { setDraft(e.target.value); setDirty(true); }}
            />
          </div>
        ) : (
          <iframe
            key={nonce}
            title={base(path)}
            srcDoc={built?.doc ?? ""}
            sandbox="allow-scripts allow-forms allow-modals allow-popups"
            className="pj-frame"
          />
        )}
      </div>

      {!!built?.missing.length && tab === "run" && (
        <div className="pj-warn">unresolved: {built.missing.join(", ")} — create the file or fix the path</div>
      )}
    </div>
  );
}
