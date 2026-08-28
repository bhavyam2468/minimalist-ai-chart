import { useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { themeCss } from "./theme";
import { I } from "../ui/Icons";
import type { WFile } from "../lib/types";

/* ===========================================================================
   ProjectView — turns a folder of real workspace files into a running page.

   Supports:
   - Vanilla HTML/CSS/JS projects with automatic sibling inlining
   - React / JSX / TSX projects with in-browser Babel compilation & Tailwind
   - In-canvas error boundary overlays for runtime exception reporting
   - Multi-file tab switcher with live code editing and instant reload
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

const ERROR_OVERLAY_SCRIPT = `
<script>
window.addEventListener('error', function(e) {
  var box = document.getElementById('__error_overlay__') || (function() {
    var b = document.createElement('div');
    b.id = '__error_overlay__';
    b.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;padding:12px 14px;background:#3b1818;border:1px solid #e06c75;border-radius:8px;color:#ff9e9e;font-family:monospace;font-size:12px;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,0.5);white-space:pre-wrap;';
    document.body.appendChild(b);
    return b;
  })();
  box.textContent = 'Runtime error: ' + (e.message || e);
});
</script>
`;

/** Inline sibling css/js/images referenced by relative url or build React container. */
export function bundleProject(entry: WFile, sibs: WFile[]): { doc: string; missing: string[] } {
  const missing: string[] = [];
  const dirOf = dir(entry.path);
  const entryExt = ext(entry.path);
  const isReact = ["jsx", "tsx"].includes(entryExt) || /import\s+.*from\s+['"]react['"]|from\s+['"]react-dom['"]|React\./i.test(entry.content);

  const find = (ref: string) => {
    const clean = ref.replace(/^\.\//, "").replace(/[#?].*$/, "");
    const abs = dirOf ? `${dirOf}/${clean}` : clean;
    const up = abs.replace(/\/\.\//g, "/");
    return sibs.find((f) => f.path === up) || sibs.find((f) => f.path === clean) || filesByName(clean, sibs);
  };

  // Case A: Standalone React JSX/TSX entry
  if (isReact && !["html", "htm"].includes(entryExt)) {
    const styles = sibs
      .filter((f) => ext(f.path) === "css")
      .map((f) => `<style data-src="${f.path}">\n${f.content}\n</style>`)
      .join("\n");

    const helperScripts = sibs
      .filter((f) => ["js", "jsx", "ts", "tsx"].includes(ext(f.path)) && f.path !== entry.path)
      .map((f) => `<script type="text/babel">\n${stripImports(f.content)}\n</script>`)
      .join("\n");

    const entryBody = stripImports(entry.content);
    // Find exported component name
    const compMatch = entryBody.match(/export\s+default\s+(?:function\s+)?([A-Za-z0-9_$]+)/) || entryBody.match(/(?:function|const|class)\s+([A-Z][A-Za-z0-9_$]*)/);
    const compName = compMatch ? compMatch[1] : "App";

    const doc = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style data-atelier-theme>${themeCss()}</style>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  ${styles}
  ${ERROR_OVERLAY_SCRIPT}
</head>
<body style="background:var(--surface);color:var(--text);font-family:var(--font);margin:0;padding:16px">
  <div id="root"></div>
  ${helperScripts}
  <script type="text/babel">
    ${entryBody}
    try {
      var Target = typeof ${compName} !== 'undefined' ? ${compName} : (window.${compName} || (function() { return React.createElement('div', null, 'Component loaded'); }));
      var root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(Target));
    } catch(err) {
      console.error(err);
      var errEl = document.createElement('div');
      errEl.style.cssText = 'padding:14px;background:#3b1818;color:#ff9e9e;border-radius:8px;font-family:monospace;font-size:12px;';
      errEl.textContent = 'Mount error: ' + err.message;
      document.getElementById('root').appendChild(errEl);
    }
  </script>
</body>
</html>`;
    return { doc, missing: [] };
  }

  // Case B: Standard HTML entry with relative asset inlining
  let html = entry.content;

  // <link rel="stylesheet" href="...">
  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/stylesheet/i.test(tag)) return tag;
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) return tag;
    if (/^(https?:)?\/\//i.test(href)) return tag;
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
    const isBabel = /\.(jsx|tsx)$/i.test(f.path) || /type\s*=\s*["']text\/babel["']/i.test(attrs);
    const babelAttr = isBabel ? ' type="text/babel"' : /type\s*=\s*["']module["']/i.test(attrs) ? ' type="module"' : "";
    return `<script${babelAttr}>\n${f.content}\n</script>`;
  });

  // relative images / media
  html = html.replace(/(src|href)\s*=\s*["']([^"']+\.(?:png|jpe?g|gif|webp|svg|avif|mp4|webm|ico))["']/gi, (tag, attr: string, ref: string) => {
    if (/^(https?:)?\/\//i.test(ref) || ref.startsWith("data:")) return tag;
    const f = find(ref);
    const url = f?.dataUrl || (f && f.kind === "image" ? f.content : null);
    if (!url) { missing.push(ref); return tag; }
    return `${attr}="${url}"`;
  });

  // inject our theme tokens
  const theme = `<style data-atelier-theme>${themeCss()}</style>`;
  const hasReactOrBabel = html.includes('type="text/babel"') || /<script[^>]*babel/i.test(html);
  const babelCdn = hasReactOrBabel && !html.includes("babel.min.js")
    ? `<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>\n<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>\n<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>\n`
    : "";

  const injectedHead = `${theme}\n${babelCdn}${ERROR_OVERLAY_SCRIPT}`;

  if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (m) => `${m}\n${injectedHead}`);
  else if (/<html[^>]*>/i.test(html)) html = html.replace(/<html[^>]*>/i, (m) => `${m}\n<head>${injectedHead}</head>`);
  else html = `${injectedHead}\n${html}`;

  if (!/<meta[^>]*viewport/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (m) => `${m}\n<meta name="viewport" content="width=device-width,initial-scale=1">`);
  }

  return { doc: html, missing: [...new Set(missing)] };
}

function stripImports(code: string): string {
  // Strip import ... from 'react' in standalone script blocks where globals React/ReactDOM are provided
  return code
    .replace(/import\s+(?:(?:\*\s+as\s+[A-Za-z0-9_$]+)|(?:\{[^}]*\}|[A-Za-z0-9_$,\s]+))\s+from\s+['"][^'"]+['"];?/g, "")
    .replace(/export\s+default\s+/g, "const App = ")
    .replace(/export\s+(?:const|function|class)\s+/g, (m) => m.replace("export ", ""));
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

  const isRunnable = ["html", "htm", "jsx", "tsx"].includes(ext(path)) || entry.content.includes("<html");

  return (
    <div className="fe">
      <div className="fe-bar">
        <span className="fe-tag">{dir(path) ? dir(path) + "/" : ""}<b style={{ color: "var(--text-dim)" }}>{base(path)}</b></span>
        <span className="fe-tag">{all.length} file{all.length === 1 ? "" : "s"}</span>
        {built?.missing.length ? <span className="fe-tag" style={{ color: "var(--warn)" }}>{built.missing.length} unresolved</span> : null}
        <span className="grow" />
        {isRunnable && (
          <div className="fe-seg">
            <button data-active={tab === "run"} onClick={() => setTab("run")}>run</button>
            <button data-active={tab === "code"} onClick={() => { setDraft(entry.content); setDirty(false); setTab("code"); }}>code</button>
          </div>
        )}
        {isRunnable && tab === "run" && (
          <button className="icon-btn sm" title="Restart" onClick={() => setNonce((n) => n + 1)}>
            <I.refresh size={13} />
          </button>
        )}
        {tab === "code" && (
          <button
            className="icon-btn sm"
            title="Save & run"
            disabled={!dirty}
            onClick={() => {
              putFile(chatId, { ...entry, content: draft, size: draft.length, updatedAt: Date.now() });
              setDirty(false);
              setTab("run");
              setNonce((n) => n + 1);
            }}
          >
            {dirty ? "save" : <I.check size={13} />}
          </button>
        )}
      </div>

      {/* file tabs — reach any sibling in the project */}
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
        {!isRunnable || tab === "code" ? (
          <div className="pj-code">
            <textarea
              value={tab === "code" ? draft : entry.content}
              readOnly={tab !== "code"}
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
