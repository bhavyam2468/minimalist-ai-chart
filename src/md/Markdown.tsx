import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { parseDocument, youtubeId, type Block, type Inline, type Cell } from "./parse";

/* ------------------------------------------------------------------ katex */
let katexP: Promise<any> | null = null;
function ensureKatex(): Promise<any> {
  if ((window as any).katex) return Promise.resolve((window as any).katex);
  if (katexP) return katexP;
  katexP = new Promise((res, rej) => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
    document.head.appendChild(l);
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js";
    s.onload = () => res((window as any).katex);
    s.onerror = rej;
    document.head.appendChild(s);
  });
  return katexP;
}

function TeX({ expr, display, open }: { expr: string; display?: boolean; open?: boolean }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let dead = false;
    if (open) return;                       // wait for the closing delimiter
    ensureKatex()
      .then((k) => { if (!dead) setHtml(k.renderToString(expr, { displayMode: !!display, throwOnError: false, output: "html" })); })
      .catch(() => {});
    return () => { dead = true; };
  }, [expr, display, open]);
  if (!html) return <span className="md-math-raw">{display ? expr : `$${expr}$`}</span>;
  return <span className={display ? "md-math-block a-fade" : "a-fade"} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ------------------------------------------------------- syntax highlight */
import { highlight } from "./highlight";
import { copyToClipboard } from "../lib/clipboard";
import { BlocksView } from "../canvas/Blocks";

/* ---------------------------------------------------------------- helpers */
function copy(text: string) { return copyToClipboard(text); }

/** Links inside a response open in the canvas viewport, not a new tab. */
function openInCanvas(url: string) {
  import("../lib/store").then(({ useApp }) => useApp.getState().openCanvas({ kind: "source", url }));
}

const Ico = {
  copy: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>,
  chev: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7" /></svg>,
  chart: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="12" width="4" height="8" rx="1" /><rect x="10" y="6" width="4" height="14" rx="1" /><rect x="17" y="3" width="4" height="17" rx="1" /></svg>,
  canvas: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>,
  bolt: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
};

/* ------------------------------------------------------------------ inline */
interface Ctx { animate: boolean; complete: boolean }

function Text({ v, animate }: { v: string; animate: boolean }) {
  if (!animate) return <>{v}</>;
  const parts = v.split(/(\s+)/);
  return <>{parts.map((p, i) => (p.trim() ? <span key={i} className="tok">{p}</span> : p))}</>;
}

function renderInline(nodes: Inline[], ctx: Ctx, keyPrefix = ""): React.ReactNode {
  return nodes.map((n, i) => {
    const k = keyPrefix + i;
    switch (n.t) {
      case "text": return <Text key={k} v={n.v} animate={ctx.animate} />;
      case "br": return <br key={k} />;
      case "code": return <code key={k} className="md-code">{n.v}</code>;
      case "math": return <TeX key={k} expr={n.v} open={n.open} />;
      case "img": return <img key={k} className="md-img" src={n.src} alt={n.alt} loading="lazy" />;
      case "fnref": return <sup key={k}><a className="md-fn-ref" href={`#fn-${n.id}`}>[{n.id}]</a></sup>;
      case "link": return (
        <a
          key={k} className="md-a" href={n.href} target="_blank" rel="noreferrer noopener"
          title="open in the canvas — ⌘/ctrl-click for a new tab"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            if (!/^https?:\/\//i.test(n.href)) return;
            e.preventDefault();
            openInCanvas(n.href);
          }}
        >
          {renderInline(n.kids, ctx, k + "-")}
        </a>
      );
      case "mark": return (
        <mark key={k} className="md-mark" data-complete={!n.open && ctx.complete}>
          {renderInline(n.kids, ctx, k + "-")}
        </mark>
      );
      case "strong": return <strong key={k} className="md-b">{renderInline(n.kids, ctx, k + "-")}</strong>;
      case "em": return <em key={k} className="md-i">{renderInline(n.kids, ctx, k + "-")}</em>;
      case "del": return <s key={k} className="md-s">{renderInline(n.kids, ctx, k + "-")}</s>;
      case "u": return <u key={k}>{renderInline(n.kids, ctx, k + "-")}</u>;
      case "sup": return <sup key={k} className="md-sup">{renderInline(n.kids, ctx, k + "-")}</sup>;
      case "sub": return <sub key={k} className="md-sub">{renderInline(n.kids, ctx, k + "-")}</sub>;
      default: return null;
    }
  });
}

/* ------------------------------------------------------------------ blocks */
function InlineUIBlock({ lang, code, open }: { lang: string; code: string; open: boolean }) {
  const [mode, setMode] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);

  const title = useMemo(() => {
    try {
      const j = JSON.parse(code);
      return j.title || (Array.isArray(j) ? "Dashboard" : undefined);
    } catch {
      const m = code.match(/"title"\s*:\s*"([^"]+)"/);
      return m ? m[1] : undefined;
    }
  }, [code]);

  const onCopy = async () => {
    const ok = await copy(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  const onOpenCanvas = () => {
    import("../lib/store").then(({ useApp, uid }) => {
      const state = useApp.getState();
      const chatId = state.activeChatId;
      if (!chatId) return;
      const fileName = `dash-${uid("ui")}.ui.json`;
      state.putFile(chatId, {
        path: fileName,
        content: code,
        size: code.length,
        kind: "ui",
        state: "idle",
        updatedAt: Date.now(),
      });
      state.openCanvas({ kind: "file", path: fileName });
    });
  };

  return (
    <div className="inline-ui-block a-blk" style={{ margin: "14px 0", borderRadius: "var(--r)", border: "1px solid var(--line-soft)", overflow: "hidden", background: "var(--surface)" }}>
      <div
        className="inline-ui-bar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "7px 12px",
          background: "var(--surface-2)",
          borderBottom: "1px solid var(--line-soft)",
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
          <span style={{ color: "var(--accent)", display: "inline-flex", alignItems: "center" }}>
            {Ico.chart}
          </span>
          <span style={{ fontSize: "12.5px", fontWeight: 550, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title || "Generative UI"}
          </span>
          <span
            style={{
              fontSize: "10.5px",
              fontFamily: "var(--mono)",
              color: "var(--text-faint)",
              padding: "1px 6px",
              borderRadius: "var(--r-xs)",
              background: "rgba(255, 255, 255, 0.05)",
            }}
          >
            {lang || "c1"}
          </span>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <div className="fe-seg" style={{ display: "inline-flex", gap: 2, background: "rgba(255, 255, 255, 0.06)", borderRadius: "var(--r-xs)", padding: 2 }}>
            <button
              data-active={mode === "preview"}
              onClick={() => setMode("preview")}
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "var(--r-xs)",
                border: "none",
                cursor: "pointer",
                background: mode === "preview" ? "rgba(255, 255, 255, 0.16)" : "transparent",
                color: mode === "preview" ? "var(--text)" : "var(--text-faint)",
                fontWeight: mode === "preview" ? 500 : 400,
              }}
            >
              preview
            </button>
            <button
              data-active={mode === "code"}
              onClick={() => setMode("code")}
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "var(--r-xs)",
                border: "none",
                cursor: "pointer",
                background: mode === "code" ? "rgba(255, 255, 255, 0.16)" : "transparent",
                color: mode === "code" ? "var(--text)" : "var(--text-faint)",
                fontWeight: mode === "code" ? 500 : 400,
              }}
            >
              code
            </button>
          </div>
          <button
            className="icon-btn sm"
            title="Open as file in canvas"
            onClick={onOpenCanvas}
            style={{ width: 26, height: 26, borderRadius: "var(--r-xs)" }}
          >
            {Ico.canvas}
          </button>
          <button
            className="icon-btn sm"
            title="Copy JSON"
            onClick={onCopy}
            style={{ width: 26, height: 26, borderRadius: "var(--r-xs)" }}
          >
            {copied ? "copied" : Ico.copy}
          </button>
        </div>
      </div>
      {mode === "preview" ? (
        <div className="inline-ui-wrap" style={{ padding: "16px", overflowX: "auto" }}>
          <BlocksView content={code} />
        </div>
      ) : (
        <div className="md-pre" style={{ margin: 0, border: "none", borderRadius: 0 }}>
          <code>{highlight(code, "json")}</code>
        </div>
      )}
    </div>
  );
}

function InlineToolBlock({ lang, code }: { lang: string; code: string }) {
  const [open, setOpen] = useState(false);
  const toolName = lang.startsWith("call:")
    ? lang.slice(5)
    : (() => {
        try {
          const j = JSON.parse(code);
          return j.name || j.tool || "tool";
        } catch {
          const m = code.match(/"(?:name|tool)"\s*:\s*"([^"]+)"/);
          return m ? m[1] : "tool";
        }
      })();

  const argsHint = useMemo(() => {
    try {
      const j = JSON.parse(code);
      const args = j.arguments || j.args || j;
      const firstVal = Object.values(args)[0];
      return typeof firstVal === "string" ? firstVal.slice(0, 60) : "";
    } catch {
      return "";
    }
  }, [code]);

  return (
    <div className="inline-tool-call a-blk" style={{ margin: "8px 0" }}>
      <div
        className="trace-summary"
        data-status="done"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          height: 28,
          padding: "0 10px",
          cursor: "pointer",
          borderRadius: "var(--r-sm)",
          background: "var(--surface)",
          border: "1px solid var(--line-soft)",
          fontSize: "12px",
          color: "var(--text-dim)",
        }}
      >
        <span style={{ color: "var(--accent)", display: "inline-flex", alignItems: "center" }}>
          {Ico.bolt}
        </span>
        <b>{toolName}</b>
        {argsHint && <span style={{ color: "var(--text-faint)" }}>{argsHint}</span>}
        <span style={{ marginLeft: "auto", color: "var(--text-faint)" }}>{open ? "−" : "+"}</span>
      </div>
      {open && (
        <div
          className="md-pre"
          style={{
            marginTop: 6,
            padding: "8px 12px",
            borderRadius: "var(--r-sm)",
            background: "var(--surface-2)",
            border: "1px solid var(--line-soft)",
          }}
        >
          <code>{highlight(code, "json")}</code>
        </div>
      )}
    </div>
  );
}

function CodeBlock({ lang, code, open }: { lang: string; code: string; open: boolean }) {
  const [done, setDone] = useState(false);

  const cleanLang = (lang || "").trim().toLowerCase();

  // 1. Inline tool call blocks
  if (cleanLang === "tool_call" || cleanLang === "call" || cleanLang === "tool" || cleanLang.startsWith("call:")) {
    return <InlineToolBlock lang={cleanLang} code={code} />;
  }

  // 2. Inline generative UI blocks (C1 / Thesys declarative JSON)
  const isUiLang = /^(ui|c1|blocks|ui\.json|json:ui)$/i.test(cleanLang);
  const isUiJson = cleanLang === "json" && (
    code.includes('"blocks"') ||
    (code.includes('"type"') && /"(chart|metrics?|table|tabs|callout|accordion)"/.test(code))
  );

  if (isUiLang || isUiJson) {
    return <InlineUIBlock lang={cleanLang} code={code} open={open} />;
  }

  return (
    <div className="md-pre a-blk">
      <div className="md-pre-bar">
        <span>{lang || "text"}{open ? " ·" : ""}</span>
        <button
          className="icon-btn sm"
          title="Copy code"
          onClick={async () => {
            const ok = await copy(code);
            if (ok) {
              setDone(true);
              setTimeout(() => setDone(false), 1200);
            }
          }}
        >
          {done ? "copied" : Ico.copy}
        </button>
      </div>
      <code>{highlight(code, lang)}</code>
    </div>
  );
}

function Details({ b, ctx }: { b: Extract<Block, { t: "details" }>; ctx: Ctx }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md-details a-blk" data-open={open}>
      <div className="md-summary" onClick={() => setOpen((o) => !o)}>
        {Ico.chev}<span>{renderInline(b.summary, ctx)}</span>
      </div>
      {open && <div className="md-details-body">{b.blocks.map((x, i) => <BlockView key={i} b={x} ctx={ctx} />)}</div>}
    </div>
  );
}

function Task({ checked, children }: { checked: boolean; children: React.ReactNode }) {
  const [on, setOn] = useState(checked);
  useEffect(() => setOn(checked), [checked]);
  return (
    <li className="md-li md-task" data-on={on}>
      <span className="md-box" data-on={on} onClick={() => setOn(!on)}>
        {on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M4 12.5l5.5 5.5L20 6" /></svg>}
      </span>
      <span>{children}</span>
    </li>
  );
}

function TableView({ b, ctx }: { b: Extract<Block, { t: "table" }>; ctx: Ctx }) {
  const cols = Math0(b.head.length, b.rows);
  return (
    <div className="md-table-wrap a-blk">
      <table className="md-table">
        <thead>
          <tr>{b.head.map((c: Cell, i: number) => (
            <th key={i} style={{ textAlign: (b.align[i] as any) || "left" }}>{renderInline(c, ctx, `h${i}-`)}</th>
          ))}</tr>
        </thead>
        <tbody>
          {b.rows.map((row, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} style={{ textAlign: (b.align[c] as any) || "left" }}
                    data-partial={r === b.rows.length - 1 && b.partialRow ? "true" : undefined}>
                  {row[c] ? renderInline(row[c], ctx, `r${r}c${c}-`) : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Math0(headLen: number, rows: Cell[][]) {
  return Math.max(headLen, ...rows.map((r) => r.length), 1);
}

const BlockView = memo(function BlockView({ b, ctx }: { b: Block; ctx: Ctx }) {
  switch (b.t) {
    case "p": return <p className="md-p a-blk">{renderInline(b.kids, ctx)}</p>;
    case "h": {
      const H = `h${Math.min(b.level, 6)}` as any;
      return <H className={`md-h md-h${b.level} a-blk`}>{renderInline(b.kids, ctx)}</H>;
    }
    case "hr": return <hr className="md-hr" />;
    case "quote": return <blockquote className="md-quote a-blk">{b.blocks.map((x, i) => <BlockView key={i} b={x} ctx={ctx} />)}</blockquote>;
    case "code": return <CodeBlock lang={b.lang} code={b.code} open={b.open} />;
    case "math": return <div className="md-math-block a-blk"><TeX expr={b.expr} display open={b.open} /></div>;
    case "details": return <Details b={b} ctx={ctx} />;
    case "table": return <TableView b={b} ctx={ctx} />;
    case "media": {
      if (b.kind === "youtube")
        return (
          <div className="md-embed a-blk">
            <iframe src={`https://www.youtube-nocookie.com/embed/${b.src}`} allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture" allowFullScreen title="video" />
          </div>
        );
      if (b.kind === "video") return <video className="md-img a-blk" src={b.src} controls />;
      return (
        <figure className="a-blk" style={{ margin: 0 }}>
          <img className="md-img" src={b.src} alt={b.caption || ""} loading="lazy" />
          {b.caption ? <figcaption className="md-figcap">{b.caption}</figcaption> : null}
        </figure>
      );
    }
    case "list": {
      const Tag: any = b.ordered ? "ol" : "ul";
      return (
        <Tag className={`md-list ${b.ordered ? "md-ol" : "md-ul"} ${b.tight ? "tight" : ""} a-blk`} start={b.ordered ? b.start : undefined}>
          {b.items.map((it, i) =>
            it.checked === null ? (
              <li key={i} className="md-li">{it.blocks.map((x, j) => <BlockView key={j} b={x} ctx={ctx} />)}</li>
            ) : (
              <Task key={i} checked={it.checked}>{it.blocks.map((x, j) => <BlockView key={j} b={x} ctx={ctx} />)}</Task>
            )
          )}
        </Tag>
      );
    }
    case "html": return <div className="a-blk" dangerouslySetInnerHTML={{ __html: b.html }} />;
    default: return null;
  }
});

/* ================================================================== public */
export const Markdown = memo(function Markdown({
  text, streaming = false, animate = true,
}: { text: string; streaming?: boolean; animate?: boolean }) {
  const doc = useMemo(() => parseDocument(text), [text]);
  const seen = useRef(false);
  useEffect(() => { seen.current = true; }, []);

  return (
    <div className="prose">
      {doc.body.map((b, i) => {
        const isLast = i === doc.body.length - 1;
        const ctx: Ctx = { animate, complete: !streaming || !isLast };
        return <BlockView key={i} b={b} ctx={ctx} />;
      })}
      {streaming && <span className="caret" />}
      {!streaming && doc.footnotes.length > 0 && (
        <div className="md-footnotes">
          <ol>
            {doc.footnotes.map((f) => (
              <li key={f.id} id={`fn-${f.id}`}>{renderInline(f.kids, { animate: false, complete: true })}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
});

export { youtubeId };
