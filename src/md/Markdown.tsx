import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { parseDocument, youtubeId, type Block, type Inline, type Cell } from "./parse";

/* ------------------------------------------------------------------ katex */
function TeX({ expr, display, open }: { expr: string; display?: boolean; open?: boolean }) {
  const html = useMemo(() => {
    if (open) return null;
    try {
      return katex.renderToString(expr, {
        displayMode: !!display,
        throwOnError: false,
      });
    } catch {
      return null;
    }
  }, [expr, display, open]);

  if (!html) return <span className="md-math-raw">{display ? expr : `$${expr}$`}</span>;
  return <span className={display ? "md-math-block a-fade" : "a-fade"} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ------------------------------------------------------- syntax highlight */
import { highlight } from "./highlight";
import { copyToClipboard } from "../lib/clipboard";
import { useApp } from "../lib/store";
import { BlocksView, ComponentBlock } from "../canvas/Blocks";
import { ErrorBoundary } from "../ui/ErrorBoundary";

/* ---------------------------------------------------------------- helpers */
function copy(text: string) { return copyToClipboard(text); }

/** Links inside a response open in the canvas viewport, not a new tab. */
function openInCanvas(url: string) {
  useApp.getState().openCanvas({ kind: "source", url });
}

const Ico = {
  copy: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>,
  chev: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7" /></svg>,
  chart: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="12" width="4" height="8" rx="1" /><rect x="10" y="6" width="4" height="14" rx="1" /><rect x="17" y="3" width="4" height="17" rx="1" /></svg>,
  canvas: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>,
  bolt: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
  check: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>,
  alert: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
};

/* ------------------------------------------------------------------ inline */
interface Ctx { animate: boolean; complete: boolean }

function Text({ v, animate }: { v: string; animate: boolean }) {
  const prevLen = useRef(0);
  const curLen = v.length;

  useEffect(() => {
    prevLen.current = curLen;
  }, [curLen]);

  if (!animate) {
    prevLen.current = curLen;
    return <>{v}</>;
  }

  // When text grows during streaming, only animate the incoming tail
  const oldLen = prevLen.current;
  if (oldLen > 0 && curLen > oldLen) {
    const stable = v.slice(0, oldLen);
    const incoming = v.slice(oldLen);
    const parts = incoming.split(/(\s+)/);
    return (
      <>
        {stable}
        {parts.map((p, i) => (p.trim() ? <span key={`in-${i}`} className="tok">{p}</span> : p))}
      </>
    );
  }

  // Initial render during stream: animate only the trailing segment to prevent full-block flashing
  const parts = v.split(/(\s+)/);
  const tailStart = Math.max(0, parts.length - 8);
  return (
    <>
      {parts.map((p, i) => {
        if (!p.trim()) return p;
        if (i >= tailStart) return <span key={i} className="tok">{p}</span>;
        return p;
      })}
    </>
  );
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
      const chatId = state.activeId;
      if (!chatId) return;
      const fileName = `dash-${uid("ui")}.ui.json`;
      state.putFile(chatId, {
        path: fileName,
        content: code,
        size: code.length,
        mime: "application/json",
        kind: "data",
        state: "local",
        origin: "agent",
        createdAt: Date.now(),
      });
      state.openCanvas({ kind: "file", path: fileName });
    });
  };

  if (open && !code.trim()) {
    return (
      <div
        className="inline-ui-block comp-streaming-in"
        style={{
          margin: "8px 0",
          padding: "8px 12px",
          borderRadius: "var(--r-sm)",
          border: "1px solid var(--line-soft)",
          background: "var(--surface)",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span className="spinner sm" style={{ width: 11, height: 11, borderWidth: 1.5 }} />
        <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)" }}>
          Streaming {title || "interface"}...
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-ui-block a-blk ${open ? "comp-streaming-in" : ""}`} style={{ margin: "14px 0", borderRadius: "var(--r)", border: "1px solid var(--line-soft)", overflow: "hidden", background: "var(--surface)" }}>
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
        <div className="inline-ui-wrap" style={{ padding: "10px 12px", overflowX: "auto" }}>
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

function getArgHint(args: any): string {
  if (!args) return "";
  if (typeof args === "string") return args.slice(0, 60);
  const q = args.query || args.q || args.url || args.path || args.target || args.name || args.ref;
  if (q && typeof q === "string") return q.slice(0, 60);
  const vals = Object.values(args);
  if (!vals.length) return "";
  const first = vals[0];
  return typeof first === "string" ? first.slice(0, 60) : "";
}

function InlineToolBlock({
  id,
  name,
  argsRaw,
  openBlock,
  lang,
  code,
}: {
  id?: string;
  name?: string;
  argsRaw?: string;
  openBlock?: boolean;
  lang?: string;
  code?: string;
}) {
  const [open, setOpen] = useState(false);
  const rawCode = argsRaw || code || "";
  const initialName = name || (lang?.startsWith("call:") ? lang.slice(5) : "tool");

  const toolCall = useApp((s) => {
    if (!id) return null;
    const chat = s.chats[s.activeId || ""];
    if (!chat) return null;
    for (const n of Object.values(chat.nodes)) {
      const found = n.toolCalls?.find((t) => t.id === id);
      if (found) return found;
    }
    return null;
  });

  const toolName = toolCall?.name || initialName;
  const isRunning = toolCall?.status === "running" || (openBlock && !toolCall);
  const isErr = toolCall?.status === "error";
  const ms = toolCall?.ms;

  const hint = useMemo(() => {
    if (toolCall?.args) return getArgHint(toolCall.args);
    try {
      return getArgHint(JSON.parse(rawCode));
    } catch {
      return rawCode.slice(0, 60);
    }
  }, [toolCall, rawCode]);

  return (
    <div className="inline-tool-call a-blk" style={{ margin: "8px 0" }}>
      <div
        className="trace-summary"
        data-status={isRunning ? "running" : isErr ? "error" : "done"}
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
          border: `1px solid ${isErr ? "rgba(239, 68, 68, 0.4)" : "var(--line-soft)"}`,
          fontSize: "12px",
          color: "var(--text-dim)",
        }}
      >
        <span
          style={{
            color: isRunning ? "var(--accent)" : isErr ? "var(--err)" : "var(--ok)",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {isRunning ? (
            <span className="spinner sm" style={{ width: 11, height: 11, borderWidth: 1.5 }} />
          ) : isErr ? (
            Ico.alert
          ) : (
            Ico.check
          )}
        </span>
        <b style={{ color: "var(--text)" }}>{toolName}</b>
        {hint && (
          <span
            style={{
              color: "var(--text-faint)",
              maxWidth: 260,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {hint}
          </span>
        )}
        {ms != null && (
          <span style={{ fontSize: "11px", color: "var(--text-faint)", marginLeft: 2 }}>
            · {ms > 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`}
          </span>
        )}
        <span style={{ marginLeft: "auto", color: "var(--text-faint)", paddingLeft: 4 }}>{open ? "−" : "+"}</span>
      </div>
      {open && (
        <div
          className="trace-out"
          style={{
            marginTop: 6,
            padding: "8px 12px",
            borderRadius: "var(--r-sm)",
            background: "var(--surface-2)",
            border: `1px solid ${isErr ? "rgba(239, 68, 68, 0.3)" : "var(--line-soft)"}`,
            fontSize: "12px",
          }}
        >
          {rawCode && (
            <div className="trace-args" style={{ marginBottom: toolCall?.output ? 6 : 0 }}>
              <span style={{ color: "var(--text-faint)", fontWeight: 540 }}>args: </span>
              <code>{rawCode}</code>
            </div>
          )}
          {toolCall?.output && (
            <div
              className="trace-result"
              style={{
                color: isErr ? "var(--err)" : "var(--text)",
                whiteSpace: "pre-wrap",
                maxHeight: 240,
                overflowY: "auto",
                fontFamily: "var(--mono)",
                fontSize: "11px",
              }}
            >
              {typeof toolCall.output === "string" ? toolCall.output : JSON.stringify(toolCall.output, null, 2)}
            </div>
          )}
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
    return (
      <ErrorBoundary name="Tool Call">
        <InlineToolBlock lang={cleanLang} code={code} />
      </ErrorBoundary>
    );
  }

  // 2. Inline generative UI blocks (C1 / Thesys declarative JSON)
  const isUiLang = /^(ui|c1|blocks|ui\.json|json:ui)$/i.test(cleanLang);
  const isUiJson = cleanLang === "json" && (
    code.includes('"blocks"') ||
    (code.includes('"type"') && /"(chart|metrics?|table|tabs|callout|accordion)"/.test(code))
  );

  if (isUiLang || isUiJson) {
    return (
      <ErrorBoundary name="Generative UI">
        <InlineUIBlock lang={cleanLang} code={code} open={open} />
      </ErrorBoundary>
    );
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
    case "tool":
      return (
        <ErrorBoundary name="Inline Tool">
          <InlineToolBlock id={b.id} name={b.name} argsRaw={b.argsRaw} openBlock={b.open} />
        </ErrorBoundary>
      );
    case "component":
      return (
        <ErrorBoundary name="Component">
          <ComponentBlock raw={b.raw} attrs={b.attrs} open={b.open} />
        </ErrorBoundary>
      );
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
