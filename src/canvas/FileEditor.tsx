import { useEffect, useMemo, useRef, useState } from "react";
import { highlight, langOf } from "../md/highlight";
import { Markdown } from "../md/Markdown";
import { I } from "../ui/Icons";
import { useApp } from "../lib/store";
import { copyToClipboard } from "../lib/clipboard";
import type { WFile } from "../lib/types";

/* ===========================================================================
   FileEditor — the canvas' file SDK. One entry point, adapts to the file:
     image  -> zoomable viewer
     md/mdx -> editor  |  preview  |  split
     csv    -> grid viewer + raw toggle
     code   -> syntax-highlighted editor
     text   -> plain editor
   ========================================================================= */

type Mode = "edit" | "preview" | "split";

function kindOf(f: WFile): "image" | "markdown" | "sheet" | "code" | "text" {
  if (f.kind === "image" || f.dataUrl) return "image";
  const e = (f.path.split(".").pop() || "").toLowerCase();
  if (e === "md" || e === "mdx" || e === "markdown") return "markdown";
  if (e === "csv" || e === "tsv") return "sheet";
  if (f.kind === "code") return "code";
  if (["ts","tsx","js","jsx","py","rs","go","java","c","cpp","h","css","html","json","yaml","yml","sh","sql","toml","xml"].includes(e)) return "code";
  return "text";
}

/* ------------------------------------------------------------ image view */
function ImageView({ f }: { f: WFile }) {
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(true);
  return (
    <div className="fe">
      <div className="fe-bar">
        <span className="fe-tag">image</span>
        <span className="grow" />
        <button className="icon-btn sm" onClick={() => { setFit(false); setZoom((z) => Math.max(0.1, z - 0.25)); }}>−</button>
        <span className="fe-tag">{fit ? "fit" : `${Math.round(zoom * 100)}%`}</span>
        <button className="icon-btn sm" onClick={() => { setFit(false); setZoom((z) => Math.min(6, z + 0.25)); }}>+</button>
        <button className="icon-btn sm" onClick={() => { setFit(true); setZoom(1); }} title="Fit">⤢</button>
      </div>
      <div className="fe-body" style={{ display: "grid", placeItems: "center", background: "var(--bg)" }}>
        <img
          src={f.dataUrl || f.content}
          alt={f.path}
          style={fit
            ? { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "var(--r-sm)" }
            : { transform: `scale(${zoom})`, transformOrigin: "center", borderRadius: "var(--r-sm)" }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ sheet view */
function SheetView({ text, path }: { text: string; path: string }) {
  const [raw, setRaw] = useState(false);
  const [filter, setFilter] = useState("");
  const [activeSheet, setActiveSheet] = useState(0);

  // Parse sheets (either multi-sheet markdown from ingest or CSV/TSV)
  const sheets = useMemo(() => {
    if (text.includes("## sheet: ")) {
      const parts = text.split(/(?=## sheet:\s*)/);
      const parsed = parts
        .map((part) => {
          const titleMatch = part.match(/## sheet:\s*([^\n(]+)/);
          const name = titleMatch ? titleMatch[1].trim() : "Sheet";
          const tableLines = part.split("\n").filter((l) => l.trim().startsWith("|"));
          const sheetRows = tableLines
            .filter((l) => !/^\s*\|?\s*:?-{2,}:?/.test(l))
            .map((l) =>
              l
                .trim()
                .replace(/^\|/, "")
                .replace(/\|$/, "")
                .split("|")
                .map((c) => c.trim())
            );
          return { name, rows: sheetRows };
        })
        .filter((s) => s.rows.length > 0);
      if (parsed.length) return parsed;
    }

    const delim = path.endsWith(".tsv") ? "\t" : ",";
    const csvRows = text.trim().split(/\r?\n/).map((line) => {
      const out: string[] = []; let cur = ""; let q = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; continue; }
        if (ch === delim && !q) { out.push(cur); cur = ""; continue; }
        cur += ch;
      }
      out.push(cur);
      return out;
    });
    return [{ name: path.split("/").pop() || "Sheet1", rows: csvRows }];
  }, [text, path]);

  const curSheet = sheets[activeSheet] || sheets[0] || { name: "Sheet", rows: [] };
  const rows = curSheet.rows;

  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    const q = filter.toLowerCase();
    const head = rows[0] || [];
    const body = rows.slice(1).filter((r) => r.some((c) => String(c).toLowerCase().includes(q)));
    return [head, ...body];
  }, [rows, filter]);

  if (raw) {
    return (
      <div className="fe">
        <div className="fe-bar">
          <span className="fe-tag">{rows.length} rows</span>
          <span className="grow" />
          <div className="fe-seg">
            <button data-active={false} onClick={() => setRaw(false)}>grid</button>
            <button data-active={true} onClick={() => setRaw(true)}>raw</button>
          </div>
          <button className="icon-btn sm" title="Copy" onClick={() => copyToClipboard(text)}>
            <I.copy size={13} />
          </button>
        </div>
        <div className="fe-body"><pre className="fe-pre">{text}</pre></div>
      </div>
    );
  }

  const width = Math.max(...filtered.map((r) => r.length), 1);
  return (
    <div className="fe">
      <div className="fe-bar">
        <span className="fe-tag">{Math.max(0, filtered.length - 1)} rows × {width} cols</span>
        {rows.length > 8 && (
          <input
            placeholder="Filter cells..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ fontSize: "var(--fs-xs)", padding: "3px 8px", maxWidth: 160, background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "var(--r-xs)", color: "var(--text)" }}
          />
        )}
        <span className="grow" />
        <div className="fe-seg">
          <button data-active={true} onClick={() => setRaw(false)}>grid</button>
          <button data-active={false} onClick={() => setRaw(true)}>raw</button>
        </div>
        <button className="icon-btn sm" title="Copy CSV" onClick={() => copyToClipboard(text)}>
          <I.copy size={13} />
        </button>
      </div>

      {sheets.length > 1 && (
        <div className="pj-files">
          {sheets.map((s, idx) => (
            <button key={idx} data-active={activeSheet === idx} onClick={() => { setActiveSheet(idx); setFilter(""); }}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="fe-body" style={{ padding: 0 }}>
        <table className="fe-grid">
          <thead>
            <tr>
              <th className="fe-gutter" />
              {Array.from({ length: width }).map((_, i) => <th key={i}>{filtered[0]?.[i] ?? ""}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(1).map((r, i) => (
              <tr key={i}>
                <td className="fe-gutter">{i + 1}</td>
                {Array.from({ length: width }).map((_, j) => <td key={j}>{r[j] ?? ""}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------- code / text / markdown */
function CodeArea({
  value, onChange, lang, readOnly, wrap = true,
}: { value: string; onChange: (v: string) => void; lang: string; readOnly?: boolean; wrap?: boolean }) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const pre = useRef<HTMLPreElement>(null);
  const lines = value.split("\n").length;

  const sync = () => {
    if (pre.current && ta.current) {
      pre.current.scrollTop = ta.current.scrollTop;
      pre.current.scrollLeft = ta.current.scrollLeft;
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const s = el.selectionStart, en = el.selectionEnd;
      const next = value.slice(0, s) + "  " + value.slice(en);
      onChange(next);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 2; });
    }
  };

  return (
    <div className="fe-code" data-wrap={wrap}>
      <div className="fe-lines" aria-hidden>
        {Array.from({ length: lines }).map((_, i) => <span key={i}>{i + 1}</span>)}
      </div>
      <div className="fe-code-inner">
        <pre ref={pre} className="fe-hl" aria-hidden><code>{highlight(value + "\n", lang)}</code></pre>
        <textarea
          ref={ta}
          className="fe-ta"
          value={value}
          spellCheck={false}
          readOnly={readOnly}
          onScroll={sync}
          onKeyDown={onKey}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

/* ================================================================== main */

export function FileEditor({ chatId, path }: { chatId: string; path: string }) {
  const file = useApp((s) => s.chats[chatId]?.files[path]);
  const putFile = useApp((s) => s.putFile);
  const [draft, setDraft] = useState(file?.content ?? "");
  const [mode, setMode] = useState<Mode>("preview");
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [wrap, setWrap] = useState(true);

  useEffect(() => { setDraft(file?.content ?? ""); setDirty(false); }, [path, file?.updatedAt]);

  if (!file) return <div className="empty-hint" style={{ padding: 20 }}>file not found: {path}</div>;

  const kind = kindOf(file);
  const lang = langOf(file.path);

  const save = () => {
    putFile(chatId, { ...file, content: draft, size: draft.length, updatedAt: Date.now() });
    setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 1400);
  };
  const change = (v: string) => { setDraft(v); setDirty(true); };

  if (kind === "image") return <ImageView f={file} />;
  if (kind === "sheet") return <SheetView text={file.content} path={file.path} />;

  const isMd = kind === "markdown";

  return (
    <div className="fe">
      <div className="fe-bar">
        <span className="fe-tag">{lang}</span>
        <span className="fe-tag">{draft.split("\n").length} lines</span>
        {dirty && <span className="fe-tag" style={{ color: "var(--warn)" }}>unsaved</span>}
        <span className="grow" />
        {isMd && (
          <div className="fe-seg">
            {(["edit", "split", "preview"] as Mode[]).map((m) => (
              <button key={m} data-active={mode === m} onClick={() => setMode(m)}>{m}</button>
            ))}
          </div>
        )}
        {(!isMd || mode === "edit" || mode === "split") && (
          <button
            className="icon-btn sm"
            data-active={wrap}
            title={wrap ? "Word wrap enabled (click to disable)" : "Word wrap disabled (click to enable)"}
            onClick={() => setWrap((w) => !w)}
          >
            <I.wrap size={13} />
          </button>
        )}
        <button className="icon-btn sm" title="Copy" onClick={() => copyToClipboard(draft)}><I.copy size={13} /></button>
        <button className="icon-btn sm" data-active={saved} title="Save (⌘S)" onClick={save} disabled={!dirty && !saved}>
          {saved ? <I.check size={13} /> : <I.save size={13} />}
        </button>
      </div>

      <div className="fe-body" style={{ padding: 0 }}
           onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save(); } }}>
        {isMd && mode === "preview" && <div className="fe-preview" data-wrap={wrap}><Markdown text={draft} animate={false} /></div>}
        {isMd && mode === "edit" && <CodeArea value={draft} onChange={change} lang="markdown" wrap={wrap} />}
        {isMd && mode === "split" && (
          <div className="fe-split">
            <CodeArea value={draft} onChange={change} lang="markdown" wrap={wrap} />
            <div className="fe-preview" data-wrap={wrap}><Markdown text={draft} animate={false} /></div>
          </div>
        )}
        {!isMd && <CodeArea value={draft} onChange={change} lang={lang} wrap={wrap} />}
      </div>
    </div>
  );
}
