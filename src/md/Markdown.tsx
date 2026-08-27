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

/* ---------------------------------------------------------------- helpers */
function copy(text: string) { return copyToClipboard(text); }

/** Links inside a response open in the canvas viewport, not a new tab. */
function openInCanvas(url: string) {
  import("../lib/store").then(({ useApp }) => useApp.getState().openCanvas({ kind: "source", url }));
}

const Ico = {
  copy: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>,
  chev: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7" /></svg>,
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
function CodeBlock({ lang, code, open }: { lang: string; code: string; open: boolean }) {
  const [done, setDone] = useState(false);
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
