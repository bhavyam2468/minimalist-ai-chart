import { useEffect, useMemo, useState } from "react";
import { Markdown } from "../md/Markdown";
import type { CanvasBlock } from "../lib/types";

/* ===========================================================================
   Blocks — the design-system view format.

   This is NOT a separate store. It renders the contents of a `*.ui.json`
   workspace file, so a dashboard is just a file the agent can write with
   edit_file and patch with apply_diff — and the canvas updates live.
   ========================================================================= */

const TOKENS = [
  "--bg", "--surface", "--surface-2", "--surface-3", "--line", "--line-soft",
  "--text", "--text-dim", "--text-faint", "--accent", "--accent-soft", "--accent-line",
  "--ok", "--warn", "--err", "--info", "--r", "--r-sm", "--r-xs", "--sp-2", "--sp-3",
  "--sp-4", "--sp-5", "--font", "--mono", "--fs", "--fs-sm", "--fs-xs", "--fs-lg", "--fs-xl", "--shadow",
];

/** Copy of the app's tokens, for injection into sandboxed frames. */
export function themeCss(): string {
  const cs = getComputedStyle(document.documentElement);
  const vars = TOKENS.map((t) => `${t}: ${cs.getPropertyValue(t).trim()};`).join("\n  ");
  return `:root {\n  ${vars}\n}
*{box-sizing:border-box}
body{margin:0;background:var(--surface);color:var(--text);font-family:var(--font);font-size:var(--fs);line-height:1.6}
h1,h2,h3{font-weight:560;letter-spacing:-.012em;margin:0 0 10px}
h1{font-size:var(--fs-xl)} h2{font-size:var(--fs-lg)} h3{font-size:var(--fs)}
p{margin:0 0 12px}
small,.dim{color:var(--text-dim)}
button{font:inherit;height:34px;padding:0 15px;border-radius:var(--r-sm);border:1px solid var(--line);background:var(--surface-2);color:var(--text-dim);cursor:pointer;transition:all .14s var(--ease)}
button:hover{color:var(--text);border-color:var(--accent-line);transform:translateY(-1px)}
button.primary{background:var(--text);color:var(--bg);border-color:transparent}
input,select,textarea{font:inherit;background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm);color:var(--text);padding:8px 11px;outline:none;width:100%}
input:focus,textarea:focus{border-color:var(--accent-line)}
.card{background:var(--surface-2);border:1px solid var(--line-soft);border-radius:var(--r);padding:var(--sp-4)}
.grid{display:grid;gap:var(--sp-3);grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}
.label{font-size:var(--fs-xs);letter-spacing:.09em;text-transform:uppercase;color:var(--text-faint)}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-size:var(--fs-xs);letter-spacing:.05em;text-transform:uppercase;color:var(--text-dim);padding:8px 12px;background:var(--surface-3)}
td{padding:8px 12px;border-top:1px solid var(--line-soft)}
@keyframes fade-in{from{opacity:0}to{opacity:1}}
@keyframes sweep{from{background-size:0% 100%}to{background-size:100% 100%}}
@keyframes grow-y{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes draw{to{stroke-dashoffset:0}}
::-webkit-scrollbar{width:0;height:0}
*{scrollbar-width:none}`;
}

/* ------------------------------------------------------------------ charts */
const PALETTE = ["var(--accent)", "var(--info)", "var(--ok)", "var(--warn)", "var(--err)", "var(--text-dim)"];
const fmt = (n: number) => (Math.abs(n) >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 1 }) : String(Math.round(n * 100) / 100));

function Chart({ b }: { b: CanvasBlock }) {
  const kind = b.kind || "bar";
  const data: { label: string; value: number }[] = (b.data || []).map((d: any) => ({ label: String(d.label ?? d.x ?? ""), value: Number(d.value ?? d.y ?? 0) }));
  const series: { name: string; points: { x: any; y: number }[] }[] = b.series || [];
  const W = 640, H = 260, PAD = 34;

  if (kind === "pie" || kind === "donut") {
    const total = data.reduce((a, d) => a + d.value, 0) || 1;
    let acc = -Math.PI / 2;
    const R = 92, cx = 120, cy = 120;
    return (
      <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
        <svg width={240} height={240} viewBox="0 0 240 240">
          {data.map((d, i) => {
            const a0 = acc, a1 = acc + (d.value / total) * Math.PI * 2; acc = a1;
            const large = a1 - a0 > Math.PI ? 1 : 0;
            const p = `M ${cx + R * Math.cos(a0)} ${cy + R * Math.sin(a0)} A ${R} ${R} 0 ${large} 1 ${cx + R * Math.cos(a1)} ${cy + R * Math.sin(a1)} L ${cx} ${cy} Z`;
            return <path key={i} d={p} fill={PALETTE[i % PALETTE.length]} opacity={0.9} style={{ animation: `fade-in .5s ${i * 70}ms both` }} />;
          })}
          {kind === "donut" && <circle cx={cx} cy={cy} r={54} fill="var(--surface-2)" />}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {data.map((d, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "var(--fs-sm)", color: "var(--text-dim)" }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: PALETTE[i % PALETTE.length] }} />
              {d.label}<b style={{ color: "var(--text)", marginLeft: 4 }}>{fmt(d.value)}</b>
              <span style={{ color: "var(--text-faint)" }}>{Math.round((d.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === "hbar") {
    const max = Math.max(...data.map((d) => d.value), 1);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.map((d, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-sm)", color: "var(--text-dim)", marginBottom: 4 }}>
              <span>{d.label}</span><b style={{ color: "var(--text)" }}>{fmt(d.value)}</b>
            </div>
            <div style={{ height: 7, borderRadius: 4, background: "var(--surface-3)", overflow: "hidden" }}>
              <div style={{ width: `${(d.value / max) * 100}%`, height: "100%", background: PALETTE[i % PALETTE.length], borderRadius: 4, transformOrigin: "left", animation: `sweep .7s ${i * 60}ms var(--ease) both` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "line" || kind === "area" || kind === "scatter") {
    const ss = series.length ? series : [{ name: b.name || "", points: data.map((d, i) => ({ x: d.label || i, y: d.value })) }];
    const all = ss.flatMap((s) => s.points.map((p) => p.y));
    const max = Math.max(...all, 1), min = Math.min(...all, 0);
    const n = Math.max(...ss.map((s) => s.points.length), 2);
    const X = (i: number) => PAD + (i / (n - 1)) * (W - PAD * 2);
    const Y = (v: number) => H - PAD - ((v - min) / (max - min || 1)) * (H - PAD * 2);
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <g key={i}>
            <line x1={PAD} x2={W - PAD} y1={PAD + t * (H - PAD * 2)} y2={PAD + t * (H - PAD * 2)} stroke="var(--line-soft)" />
            <text x={4} y={PAD + t * (H - PAD * 2) + 4} fill="var(--text-faint)" fontSize="10">{fmt(max - t * (max - min))}</text>
          </g>
        ))}
        {ss.map((s, si) => {
          const pts = s.points.map((p, i) => `${X(i)},${Y(p.y)}`).join(" ");
          const col = PALETTE[si % PALETTE.length];
          return (
            <g key={si}>
              {kind === "area" && <polygon points={`${PAD},${H - PAD} ${pts} ${X(s.points.length - 1)},${H - PAD}`} fill={col} opacity={0.13} />}
              {kind !== "scatter" && <polyline points={pts} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="2400" strokeDashoffset="2400" style={{ animation: "draw 1.1s var(--ease) forwards" }} />}
              {s.points.map((p, i) => <circle key={i} cx={X(i)} cy={Y(p.y)} r={kind === "scatter" ? 4 : 2.6} fill={col} style={{ animation: `fade-in .4s ${300 + i * 25}ms both` }} />)}
            </g>
          );
        })}
        {ss[0].points.map((p, i) => (i % Math.ceil(n / 8) === 0 ? (
          <text key={i} x={X(i)} y={H - 10} textAnchor="middle" fill="var(--text-faint)" fontSize="10">{String(p.x).slice(0, 8)}</text>
        ) : null))}
      </svg>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const bw = Math.min(52, (W - PAD * 2) / Math.max(data.length, 1) - 10);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {[0, 0.5, 1].map((t, i) => <line key={i} x1={PAD} x2={W - PAD} y1={PAD + t * (H - PAD * 2)} y2={PAD + t * (H - PAD * 2)} stroke="var(--line-soft)" />)}
      {data.map((d, i) => {
        const x = PAD + (i + 0.5) * ((W - PAD * 2) / Math.max(data.length, 1)) - bw / 2;
        const h = (d.value / max) * (H - PAD * 2);
        return (
          <g key={i}>
            <rect x={x} y={H - PAD - h} width={bw} height={h} rx={5} fill={PALETTE[i % PALETTE.length]} opacity={0.92}
                  style={{ transformOrigin: `center ${H - PAD}px`, animation: `grow-y .6s ${i * 55}ms var(--ease) both` }} />
            <text x={x + bw / 2} y={H - PAD - h - 7} textAnchor="middle" fill="var(--text-dim)" fontSize="10">{fmt(d.value)}</text>
            <text x={x + bw / 2} y={H - PAD + 15} textAnchor="middle" fill="var(--text-faint)" fontSize="10">{String(d.label).slice(0, 10)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------- interactive */
function Pomodoro({ label, work = 1500, breakFor = 300 }: { label: string; work?: number; breakFor?: number }) {
  const [left, setLeft] = useState(work);
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [run, setRun] = useState(true);
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, [run]);

  useEffect(() => {
    if (left > 0) return;
    if (phase === "work") { setPhase("break"); setLeft(breakFor); setCycles((c) => c + 1); }
    else { setPhase("work"); setLeft(work); }
  }, [left, phase, work, breakFor]);

  const total = phase === "work" ? work : breakFor;
  const pct = Math.max(0, Math.min(100, ((total - left) / total) * 100));
  const R = 54, C = 2 * Math.PI * R;
  const mm = String(Math.max(0, Math.floor(left / 60))).padStart(2, "0");
  const ss = String(Math.max(0, left % 60)).padStart(2, "0");

  return (
    <div className="canvas-card">
      <div className="metric-k">{label} · {phase === "work" ? "focus" : "break"}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <svg width={128} height={128} viewBox="0 0 128 128" style={{ flex: "none" }}>
          <circle cx={64} cy={64} r={R} fill="none" stroke="var(--surface-3)" strokeWidth={7} />
          <circle cx={64} cy={64} r={R} fill="none" stroke="var(--accent)" strokeWidth={7} strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
                  transform="rotate(-90 64 64)" style={{ transition: "stroke-dashoffset 1s linear" }} />
          <text x={64} y={72} textAnchor="middle" fill="var(--text)" fontSize="23" fontFamily="var(--mono)" letterSpacing="-1">
            {mm}:{ss}
          </text>
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button className="btn" onClick={() => setRun(!run)}>{run ? "pause" : "start"}</button>
          <button className="btn" onClick={() => { setRun(false); setPhase("work"); setLeft(work); }}>reset</button>
          <span className="metric-k" style={{ textAlign: "left" }}>{cycles} done</span>
        </div>
      </div>
    </div>
  );
}

function Timer({ label, seconds }: { label: string; seconds: number }) {
  const [left, setLeft] = useState(seconds);
  const [run, setRun] = useState(false);
  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setLeft((l) => (l <= 1 ? 0 : l - 1)), 1000);
    return () => clearInterval(t);
  }, [run]);
  return (
    <div className="canvas-card">
      <div className="metric-k">{label}</div>
      <div style={{ fontSize: 42, fontWeight: 500, letterSpacing: "-.03em", fontVariantNumeric: "tabular-nums" }}>
        {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn" onClick={() => setRun(!run)}>{run ? "pause" : "start"}</button>
        <button className="btn" onClick={() => { setRun(false); setLeft(seconds); }}>reset</button>
      </div>
    </div>
  );
}

function Stopwatch({ label }: { label: string }) {
  const [ms, setMs] = useState(0);
  const [run, setRun] = useState(false);
  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setMs((m) => m + 10), 10);
    return () => clearInterval(t);
  }, [run]);
  return (
    <div className="canvas-card">
      <div className="metric-k">{label}</div>
      <div style={{ fontSize: 42, fontWeight: 500, letterSpacing: "-.03em", fontVariantNumeric: "tabular-nums" }}>
        {String(Math.floor(ms / 60000)).padStart(2, "0")}:{String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.{String(Math.floor(ms / 10) % 100).padStart(2, "0")}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn" onClick={() => setRun(!run)}>{run ? "stop" : "start"}</button>
        <button className="btn" onClick={() => { setRun(false); setMs(0); }}>reset</button>
      </div>
    </div>
  );
}

function TodoList({ b }: { b: CanvasBlock }) {
  const [done, setDone] = useState<Record<number, boolean>>({});
  const items: string[] = b.items || [];
  return (
    <div className="canvas-card" style={{ gap: 4 }}>
      {b.label && <div className="metric-k">{b.label}</div>}
      {items.map((t, i) => (
        <label key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", cursor: "pointer", padding: "3px 0" }}>
          <span className="md-box" data-on={!!done[i]}>{done[i] && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M4 12.5l5.5 5.5L20 6" /></svg>}</span>
          <span onClick={() => setDone((d) => ({ ...d, [i]: !d[i] }))} style={{ textDecoration: done[i] ? "line-through" : "none", color: done[i] ? "var(--text-faint)" : "var(--text)" }}>{t}</span>
        </label>
      ))}
    </div>
  );
}

function Counter({ b }: { b: CanvasBlock }) {
  const [v, setV] = useState<number>(Number(b.value ?? 0));
  return (
    <div className="canvas-card">
      {b.label && <div className="metric-k">{b.label}</div>}
      <div className="metric-v">{v}</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn" onClick={() => setV((x) => x - (b.step ?? 1))}>−</button>
        <button className="btn" onClick={() => setV((x) => x + (b.step ?? 1))}>+</button>
        <button className="btn" onClick={() => setV(b.value ?? 0)}>reset</button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- renderer */
export function BlockR({ b }: { b: CanvasBlock }) {
  switch (b.type) {
    case "heading": {
      const H = (`h${Math.min(b.level || 2, 4)}`) as any;
      return <H className={`md-h md-h${b.level || 2}`}>{b.text}</H>;
    }
    case "text": return <Markdown text={b.text || ""} animate={false} />;
    case "markdown": return <Markdown text={b.content || ""} animate={false} />;
    case "metric":
      return (
        <div className="canvas-card">
          <div className="metric-k">{b.label}</div>
          <div className="metric-v">{b.value}</div>
          {b.delta != null && <div style={{ fontSize: "var(--fs-sm)", color: String(b.delta).trim().startsWith("-") ? "var(--err)" : "var(--ok)" }}>{b.delta}</div>}
          {b.hint && <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)" }}>{b.hint}</div>}
        </div>
      );
    case "metrics":
      return <div className="canvas-grid">{(b.items || []).map((m: any, i: number) => <BlockR key={i} b={{ type: "metric", ...m }} />)}</div>;
    case "chart":
      return (
        <div className="canvas-card">
          {b.title && <div className="metric-k">{b.title}</div>}
          <Chart b={b} />
          {b.caption && <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-faint)" }}>{b.caption}</div>}
        </div>
      );
    case "table":
      return (
        <div className="md-table-wrap">
          <table className="md-table">
            <thead><tr>{(b.columns || []).map((c: string, i: number) => <th key={i}>{c}</th>)}</tr></thead>
            <tbody>{(b.rows || []).map((r: any[], i: number) => <tr key={i}>{r.map((c, j) => <td key={j}>{String(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case "list":
      return b.ordered
        ? <ol className="md-list md-ol">{(b.items || []).map((x: unknown, i: number) => <li className="md-li" key={i}>{String(x)}</li>)}</ol>
        : <ul className="md-list md-ul">{(b.items || []).map((x: unknown, i: number) => <li className="md-li" key={i}>{String(x)}</li>)}</ul>;
    case "kv":
      return (
        <div className="canvas-card" style={{ gap: 8 }}>
          {(b.items || []).map((it: any, i: number) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: "var(--fs-sm)" }}>
              <span style={{ color: "var(--text-faint)" }}>{it.k}</span><span>{it.v}</span>
            </div>
          ))}
        </div>
      );
    case "progress":
      return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-sm)", color: "var(--text-dim)", marginBottom: 5 }}>
            <span>{b.label}</span><span>{b.value}%</span>
          </div>
          <div style={{ height: 6, background: "var(--surface-3)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${Math.max(0, Math.min(100, b.value))}%`, height: "100%", background: "var(--accent)", transition: "width .5s var(--ease)" }} />
          </div>
        </div>
      );
    case "input":
      return (
        <label className="field" style={{ marginBottom: 0 }}>
          <span className="label">{b.label}</span>
          <input type={b.kind === "number" ? "number" : b.kind === "date" ? "date" : "text"} placeholder={b.placeholder || ""} />
        </label>
      );
    case "button": return <button className="btn primary" style={{ width: "fit-content" }}>{b.label}</button>;
    case "timer": return <Timer label={b.label || "Timer"} seconds={b.seconds || 300} />;
    case "stopwatch": return <Stopwatch label={b.label || "Stopwatch"} />;
    case "pomodoro": return <Pomodoro label={b.label || "Pomodoro"} work={b.work || 1500} breakFor={b.breakFor || 300} />;
    case "counter": return <Counter b={b} />;
    case "todo": return <TodoList b={b} />;
    case "image": return <figure style={{ margin: 0 }}><img className="md-img" src={b.src} alt={b.caption || ""} />{b.caption && <figcaption className="md-figcap">{b.caption}</figcaption>}</figure>;
    case "video": return <div className="md-embed"><iframe src={`https://www.youtube-nocookie.com/embed/${b.youtube}`} allowFullScreen title="v" /></div>;
    case "code": return <Markdown text={"```" + (b.language || "") + "\n" + (b.content || "") + "\n```"} animate={false} />;
    case "divider": return <hr className="md-hr" />;
    case "grid":
      return <div className="canvas-grid">{(b.of || []).map((x: CanvasBlock, i: number) => <BlockR key={i} b={x} />)}</div>;
    case "note": return <div className="metric-k" style={{ lineHeight: 1.5 }}>{b.text}</div>;
    case "columns":
      return (
        <div style={{ display: "grid", gap: "var(--sp-4)", gridTemplateColumns: `repeat(${(b.of || []).length || 1}, 1fr)` }}>
          {(b.of || []).map((col: CanvasBlock[], i: number) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>{col.map((x: CanvasBlock, j: number) => <BlockR key={j} b={x} />)}</div>
          ))}
        </div>
      );
    default: return null;
  }
}

/** Parse a `*.ui.json` file body into blocks. Tolerant of a bare array. */
export function readUiFile(content: string): { blocks: CanvasBlock[]; title?: string; error?: string } {
  try {
    const j = JSON.parse(content);
    const blocks: CanvasBlock[] = Array.isArray(j) ? j : j.blocks || [];
    return { blocks, title: Array.isArray(j) ? undefined : j.title };
  } catch (e: any) {
    return { blocks: [], error: e.message };
  }
}

export function BlocksView({ content }: { content: string }) {
  const { blocks, error } = useMemo(() => readUiFile(content), [content]);
  if (error) return <div className="fe-preview"><div style={{ color: "var(--err)", fontSize: "var(--fs-sm)", marginBottom: 12 }}>invalid JSON — {error}</div><Markdown text={"```json\n" + content + "\n```"} animate={false} /></div>;
  return (
    <div className="canvas-inner" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      {blocks.map((b, i) => <BlockR key={i} b={b} />)}
      {!blocks.length && <div className="empty-hint">no blocks</div>}
    </div>
  );
}
