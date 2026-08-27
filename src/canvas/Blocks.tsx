import { useState, useMemo, useEffect, useLayoutEffect, useRef, createContext, useContext, useCallback } from "react";
import { Markdown } from "../md/Markdown";
import { useApp } from "../lib/store";
import { send } from "../lib/agent";
import { copyToClipboard } from "../lib/clipboard";
import { I } from "../ui/Icons";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { ChemistryBlock } from "./ChemistryBlock";
import { MathPlotBlock } from "./MathPlotBlock";
import type { CanvasBlock } from "../lib/types";

/* ===========================================================================
   REACTIVE LOGIC & EXECUTION ENGINE
   =========================================================================== */

export type ReactiveState = Record<string, any>;

export interface ReactiveContextType {
  state: ReactiveState;
  updateState: (key: string, val: any) => void;
  setState: React.Dispatch<React.SetStateAction<ReactiveState>>;
  runAction: (code: string, extra?: Record<string, any>) => void;
  interpolate: (val: any) => any;
  isReactive: boolean;
  scopeId?: string;
}

export const ReactiveContext = createContext<ReactiveContextType>({
  state: {},
  updateState: () => {},
  setState: () => {},
  runAction: () => {},
  interpolate: (val: any) => val,
  isReactive: false,
});

export function useReactive(): ReactiveContextType {
  return useContext(ReactiveContext);
}

/**
 * Global shared reactive store registry.
 * Enables cross-component state synchronization across a chat message or across
 * multiple `<component>` blocks.
 */
type StoreSubscriber = () => void;

interface ReactiveStoreInstance {
  id: string;
  state: ReactiveState;
  subscribers: Set<StoreSubscriber>;
  tick?: number;
  onTick?: string;
  timerId?: any;
}

const sharedStores = new Map<string, ReactiveStoreInstance>();

export function getOrCreateSharedStore(
  id: string = "default",
  initial?: ReactiveState,
  tick?: number,
  onTick?: string
): ReactiveStoreInstance {
  let store = sharedStores.get(id);
  if (!store) {
    store = {
      id,
      state: initial ? { ...initial } : {},
      subscribers: new Set(),
      tick,
      onTick,
    };
    sharedStores.set(id, store);
  } else if (initial) {
    let changed = false;
    for (const k of Object.keys(initial)) {
      if (store.state[k] === undefined) {
        store.state[k] = initial[k];
        changed = true;
      }
    }
    if (changed) {
      store.subscribers.forEach((fn) => fn());
    }
  }

  // Manage tick timer on the shared store
  if (tick && onTick && (!store.timerId || store.tick !== tick || store.onTick !== onTick)) {
    if (store.timerId) clearInterval(store.timerId);
    store.tick = tick;
    store.onTick = onTick;
    const intervalMs = Math.max(16, Number(tick) || 1000);
    store.timerId = setInterval(() => {
      if (store && store.onTick) {
        store.state = runSafeCode(store.onTick, store.state);
        store.subscribers.forEach((fn) => fn());
      }
    }, intervalMs);
  }

  return store;
}

/**
 * Execute dynamic code in a sandboxed Proxy scope that directly exposes
 * all keys of `state` as mutable variables, Math, Date, pad(), and state.
 */
export function runSafeCode(code: string, state: ReactiveState, extra: Record<string, any> = {}): ReactiveState {
  if (!code || typeof code !== "string") return state;
  const next = { ...state, ...extra };
  try {
    const sandbox = new Proxy(next, {
      has() {
        return true;
      },
      get(target, key: any) {
        if (key === Symbol.unscopables) return undefined;
        if (key in target) return target[key];
        if (key in Math) return (Math as any)[key];
        if (key === "Math") return Math;
        if (key === "Date") return Date;
        if (key === "state") return target;
        if (key === "pad") return (n: any) => String(Math.floor(Number(n) || 0)).padStart(2, "0");
        return undefined;
      },
      set(target, key: any, val) {
        target[key] = val;
        return true;
      },
    });
    const fn = new Function("sandbox", `with (sandbox) { ${code}; }`);
    fn(sandbox);
  } catch (err) {
    console.warn("Reactive execution warning:", err);
  }

  // Remove temporary extra keys from the persistent state
  for (const k of Object.keys(extra)) {
    if (!(k in state)) {
      delete next[k];
    }
  }
  return next;
}

/**
 * Safely evaluate an expression string against the reactive state.
 */
export function evalExpr(expr: string, state: ReactiveState): any {
  if (!expr || typeof expr !== "string") return undefined;
  try {
    const sandbox = new Proxy(state, {
      has() {
        return true;
      },
      get(target, key: any) {
        if (key === Symbol.unscopables) return undefined;
        if (key in target) return target[key];
        if (key in Math) return (Math as any)[key];
        if (key === "Math") return Math;
        if (key === "Date") return Date;
        if (key === "state") return target;
        if (key === "pad") return (n: any) => String(Math.floor(Number(n) || 0)).padStart(2, "0");
        return undefined;
      },
    });
    const fn = new Function("sandbox", `with (sandbox) { return (${expr}); }`);
    return fn(sandbox);
  } catch {
    return undefined;
  }
}

/**
 * Interpolate strings containing ${...} or {...} expressions using reactive state.
 */
export function interpolateValue(val: any, state: ReactiveState): any {
  if (val == null) return val;
  if (typeof val === "number" || typeof val === "boolean") return val;
  if (typeof val !== "string") return val;
  if (!val.includes("{")) return val;

  // Exact expression match: "${expr}" or "{expr}"
  const exact = val.match(/^\$\{([^}]+)\}$/) || val.match(/^\{([^}]+)\}$/);
  if (exact) {
    const res = evalExpr(exact[1], state);
    return res !== undefined ? res : val;
  }

  // Embedded ${expr}
  let out = val.replace(/\$\{([^}]+)\}/g, (_, expr) => {
    const res = evalExpr(expr, state);
    return res !== undefined ? String(res) : "";
  });

  // Embedded {expr}
  if (out.includes("{")) {
    out = out.replace(/\{([a-zA-Z0-9_$.+\-*/% ()?:\x27\x22\\]+)\}/g, (orig, expr) => {
      const res = evalExpr(expr, state);
      return res !== undefined ? String(res) : orig;
    });
  }

  return out;
}

export function ReactiveProvider({
  scopeId = "default",
  initialState,
  tick,
  onTick,
  children,
}: {
  scopeId?: string;
  initialState?: ReactiveState;
  tick?: number;
  onTick?: string;
  children: React.ReactNode;
}) {
  const parent = useContext(ReactiveContext);
  const effectiveId = scopeId !== "default" ? scopeId : parent.isReactive && parent.scopeId ? parent.scopeId : "default";

  const store = useMemo(() => {
    return getOrCreateSharedStore(effectiveId, initialState, tick, onTick);
  }, [effectiveId]);

  const [state, setStateLocal] = useState<ReactiveState>(() => ({ ...store.state }));

  useEffect(() => {
    if (initialState || tick || onTick) {
      getOrCreateSharedStore(effectiveId, initialState, tick, onTick);
    }
    const onUpdate = () => {
      setStateLocal({ ...store.state });
    };
    store.subscribers.add(onUpdate);
    setStateLocal({ ...store.state });
    return () => {
      store.subscribers.delete(onUpdate);
    };
  }, [store, effectiveId, initialState, tick, onTick]);

  const updateState = useCallback((key: string, val: any) => {
    store.state[key] = val;
    store.subscribers.forEach((fn) => fn());
  }, [store]);

  const setState = useCallback((action: React.SetStateAction<ReactiveState>) => {
    if (typeof action === "function") {
      store.state = action(store.state);
    } else {
      store.state = action;
    }
    store.subscribers.forEach((fn) => fn());
  }, [store]);

  const runAction = useCallback((code: string, extra?: Record<string, any>) => {
    if (!code || typeof code !== "string") return;
    store.state = runSafeCode(code, store.state, extra);
    store.subscribers.forEach((fn) => fn());
  }, [store]);

  const boundInterpolate = useCallback((val: any) => interpolateValue(val, store.state), [store]);

  const value = useMemo<ReactiveContextType>(
    () => ({
      state,
      setState,
      updateState,
      runAction,
      interpolate: boundInterpolate,
      isReactive: true,
      scopeId: effectiveId,
    }),
    [state, updateState, setState, runAction, boundInterpolate, effectiveId]
  );

  return <ReactiveContext.Provider value={value}>{children}</ReactiveContext.Provider>;
}

/* ===========================================================================
   Blocks — C1 by Thesys-inspired Generative UI System.

   Renders declarative *.ui.json files written to the workspace.
   Features:
   - High-fidelity interactive charts (Bar, Grouped Bar, HBar, Line, Area, Pie, Donut, Scatter, Gauge, Sparkline)
   - Interactive hover tooltips & crosshairs
   - Sortable, searchable data tables
   - Multi-tab dashboards & segmented controls
   - Sliders, toggles, form elements with live state
   - Metric / KPI cards with trend pills and sparklines
   - Callout & alert banners
   - Streaming tolerant partial-JSON parser for real-time generative UI
   ========================================================================= */

const TOKENS = [
  "--bg", "--surface", "--surface-2", "--surface-3", "--line", "--line-soft",
  "--text", "--text-dim", "--text-faint", "--accent", "--accent-soft", "--accent-line",
  "--ok", "--warn", "--err", "--info", "--r", "--r-sm", "--r-xs", "--sp-2", "--sp-3",
  "--sp-4", "--sp-5", "--font", "--mono", "--fs", "--fs-sm", "--fs-xs", "--fs-lg", "--fs-xl", "--shadow",
];

export function themeCss(): string {
  const cs = getComputedStyle(document.documentElement);
  const vars = TOKENS.map((t) => `${t}: ${cs.getPropertyValue(t).trim()};`).join("\n  ");
  return `:root {\n  ${vars}\n}
*{box-sizing:border-box}
body{margin:0;background:var(--surface);color:var(--text);font-family:var(--font);font-size:var(--fs);line-height:1.6}
h1,h2,h3,h4{font-weight:560;letter-spacing:-.012em;margin:0 0 10px}
h1{font-size:var(--fs-xl)} h2{font-size:var(--fs-lg)} h3{font-size:var(--fs)}
p{margin:0 0 12px}
small,.dim{color:var(--text-dim)}
button{font:inherit;height:34px;padding:0 14px;border-radius:var(--r-sm);border:1px solid var(--line);background:var(--surface-2);color:var(--text-dim);cursor:pointer;transition:all .14s var(--ease)}
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

const PALETTE = [
  "var(--accent, #d7b28c)",
  "var(--info, #7fa6cc)",
  "var(--ok, #7fb98a)",
  "var(--text, #ecebe8)",
  "var(--warn, #d8b45c)",
  "#c49c74",
  "var(--err, #d97e6f)",
  "var(--text-dim, #9d9d9a)",
];

const fmt = (n: number) => {
  if (isNaN(n)) return "0";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return String(Math.round(n * 100) / 100);
};

function getBezierPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;

  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

/* ------------------------------------------------------------- tooltips */
interface TooltipState {
  x: number;
  y: number;
  title: string;
  items: { label: string; value: string | number; color?: string }[];
}

function ChartTooltip({ tip }: { tip: TooltipState | null }) {
  if (!tip) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: tip.x,
        top: tip.y,
        transform: "translate(-50%, -105%)",
        pointerEvents: "none",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-xs)",
        boxShadow: "var(--shadow)",
        padding: "6px 10px",
        fontSize: "var(--fs-xs)",
        zIndex: 50,
        whiteSpace: "nowrap",
        display: "flex",
        flexDirection: "column",
        gap: 3,
        animation: "fade-in 120ms var(--ease) both",
      }}
    >
      <div style={{ fontWeight: 600, color: "var(--text)", borderBottom: "1px solid var(--line-soft)", paddingBottom: 3 }}>
        {tip.title}
      </div>
      {tip.items.map((it, idx) => (
        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-dim)" }}>
          {it.color && <span style={{ width: 7, height: 7, borderRadius: 2, background: it.color }} />}
          <span>{it.label}:</span>
          <b style={{ color: "var(--text)", marginLeft: "auto" }}>{it.value}</b>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ charts */
function normalizeChartData(b: any, interp: (v: any) => any = (v) => v): {
  kind: string;
  data: { label: string; value: number }[];
  series: { name: string; points: { x: any; y: number }[] }[];
  raw: any;
} {
  const rawKind = String(b.kind || b.type || "bar").toLowerCase();
  let kind = rawKind;
  if (rawKind === "spline" || rawKind === "smooth") kind = "line";
  else if (rawKind === "meter" || rawKind === "speedometer") kind = "gauge";
  else if (rawKind === "spider") kind = "radar";
  else if (rawKind === "conversion") kind = "funnel";
  else if (rawKind === "ohlc" || rawKind === "candles" || rawKind === "stock") kind = "candlestick";
  else if (rawKind === "matrix") kind = "heatmap";
  else if (rawKind === "horizontal-bar" || rawKind === "horizontal_bar") kind = "hbar";
  else if (rawKind === "stacked_bar" || rawKind === "stacked") kind = "stacked-bar";

  const rawList = Array.isArray(b.data)
    ? b.data
    : Array.isArray(b.points)
    ? b.points
    : Array.isArray(b.items)
    ? b.items
    : Array.isArray(b.values)
    ? b.values
    : Array.isArray(b.rows)
    ? b.rows
    : [];

  const data = rawList.map((d: any, idx: number) => {
    if (typeof d === "number") return { label: String(idx + 1), value: d };
    if (Array.isArray(d)) return { label: String(interp(d[0]) ?? idx + 1), value: Number(interp(d[1]) ?? 0) };
    const rawVal = interp(d.value ?? d.y ?? d.val ?? d.count ?? 0);
    return {
      label: String(interp(d.label ?? d.name ?? d.x ?? d.time ?? d.category ?? `Item ${idx + 1}`)),
      value: Number(rawVal ?? 0),
    };
  });

  const series: { name: string; points: { x: any; y: number }[] }[] = Array.isArray(b.series)
    ? b.series.map((s: any, sIdx: number) => ({
        name: String(interp(s.name || s.title || `Series ${sIdx + 1}`)),
        points: (s.points || s.data || []).map((p: any, pIdx: number) => {
          if (typeof p === "number") return { x: pIdx + 1, y: p };
          if (Array.isArray(p)) return { x: interp(p[0]) ?? pIdx + 1, y: Number(interp(p[1]) ?? 0) };
          return {
            x: interp(p.x ?? p.label ?? p.name ?? p.time ?? pIdx + 1),
            y: Number(interp(p.y ?? p.value ?? p.val ?? 0)),
          };
        }),
      }))
    : [];

  return { kind, data, series, raw: b };
}

function Chart({ b }: { b: CanvasBlock }) {
  const { interpolate } = useReactive();
  const norm = normalizeChartData(b, interpolate);
  const kind = norm.kind;
  const data = norm.data;
  const series = norm.series;
  const W = 660, H = 260, PAD = 36;
  const [tip, setTip] = useState<TooltipState | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});

  // 0. Radar / Spider Chart
  if (kind === "radar") {
    const items = data.length >= 3 ? data : [
      { label: "Speed", value: 85 },
      { label: "Power", value: 70 },
      { label: "Reliability", value: 90 },
      { label: "Cost", value: 65 },
      { label: "UX", value: 80 },
    ];
    const maxVal = Math.max(...items.map((d) => d.value), 100);
    const numAxes = items.length;
    const cx = 170, cy = 130, R = 85;
    const [hoverAxis, setHoverAxis] = useState<number | null>(null);
    const rings = [0.25, 0.5, 0.75, 1.0];

    const getPolyPoints = (scale: number) => {
      return Array.from({ length: numAxes })
        .map((_, i) => {
          const angle = -Math.PI / 2 + (i / numAxes) * Math.PI * 2;
          const x = cx + R * scale * Math.cos(angle);
          const y = cy + R * scale * Math.sin(angle);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
    };

    const valueVertices = items.map((d, i) => {
      const ratio = Math.max(0.05, Math.min(1, d.value / maxVal));
      const angle = -Math.PI / 2 + (i / numAxes) * Math.PI * 2;
      const x = cx + R * ratio * Math.cos(angle);
      const y = cy + R * ratio * Math.sin(angle);
      return { x, y, angle, label: d.label, value: d.value };
    });
    const valuePolyStr = valueVertices.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

    return (
      <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap", position: "relative" }}>
        <svg
          width={340}
          height={260}
          viewBox="0 0 340 260"
          onMouseLeave={() => setHoverAxis(null)}
          style={{ overflow: "visible" }}
        >
          {rings.map((rRatio, rIdx) => (
            <polygon
              key={`ring-${rIdx}`}
              points={getPolyPoints(rRatio)}
              fill="none"
              stroke="var(--line-soft)"
              strokeWidth="1"
              strokeDasharray={rIdx < 3 ? "2 3" : undefined}
            />
          ))}

          {Array.from({ length: numAxes }).map((_, i) => {
            const angle = -Math.PI / 2 + (i / numAxes) * Math.PI * 2;
            const x2 = cx + R * Math.cos(angle);
            const y2 = cy + R * Math.sin(angle);
            const labelX = cx + (R + 18) * Math.cos(angle);
            const labelY = cy + (R + 18) * Math.sin(angle);
            const isHover = hoverAxis === i;
            return (
              <g key={`spoke-${i}`}>
                <line
                  x1={cx}
                  y1={cy}
                  x2={x2}
                  y2={y2}
                  stroke={isHover ? "var(--accent)" : "var(--line-soft)"}
                  strokeWidth={isHover ? 1.5 : 1}
                />
                <text
                  x={labelX}
                  y={labelY + 3}
                  textAnchor="middle"
                  fill={isHover ? "var(--text)" : "var(--text-faint)"}
                  fontSize="10"
                  fontWeight={isHover ? 600 : 400}
                >
                  {items[i]?.label}
                </text>
              </g>
            );
          })}

          <polygon
            points={valuePolyStr}
            fill="var(--accent)"
            fillOpacity="0.2"
            stroke="var(--accent)"
            strokeWidth="2"
            style={{ animation: "fade-in .4s ease both" }}
          />

          {valueVertices.map((pt, i) => {
            const isHover = hoverAxis === i;
            return (
              <g
                key={`dot-${i}`}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoverAxis(i)}
              >
                <circle cx={pt.x} cy={pt.y} r={isHover ? 7 : 4} fill="var(--accent)" opacity={isHover ? 0.3 : 0} />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHover ? 4.2 : 3.2}
                  fill="var(--accent)"
                  stroke="var(--surface)"
                  strokeWidth="1.8"
                />
              </g>
            );
          })}
        </svg>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 150 }}>
          {items.map((d, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoverAxis(i)}
              onMouseLeave={() => setHoverAxis(null)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "3px 6px",
                borderRadius: "var(--r-xs)",
                background: hoverAxis === i ? "var(--surface-3)" : "transparent",
                fontSize: "var(--fs-xs)",
                cursor: "pointer",
              }}
            >
              <span style={{ color: hoverAxis === i ? "var(--text)" : "var(--text-dim)" }}>{d.label}</span>
              <b style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{fmt(d.value)}</b>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 0.1 Radial Gauge / Speedometer
  if (kind === "gauge") {
    const val = typeof b.value === "number" ? b.value : (data[0]?.value ?? 68);
    const min = Number(b.min ?? 0);
    const max = Number(b.max ?? 100);
    const clamped = Math.max(min, Math.min(max, val));
    const pct = (clamped - min) / (max - min || 1);
    const unit = b.unit || "";

    const cx = 170, cy = 135, r = 70;
    const startAngle = -Math.PI * 1.25;
    const sweep = Math.PI * 1.5;
    const endAngle = startAngle + sweep;
    const curAngle = startAngle + pct * sweep;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    const curX = cx + r * Math.cos(curAngle);
    const curY = cy + r * Math.sin(curAngle);
    const largeArc = pct * sweep > Math.PI ? 1 : 0;

    const bgPath = `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`;
    const valPath = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${curX} ${curY}`;

    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: "6px 0" }}>
        <svg width={340} height={190} viewBox="0 0 340 190">
          <path
            d={bgPath}
            fill="none"
            stroke="var(--surface-3)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d={valPath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <text x={cx} y={cy - 2} textAnchor="middle" fill="var(--text)" fontSize="26" fontWeight="600" style={{ fontVariantNumeric: "tabular-nums" }}>
            {fmt(clamped)}{unit}
          </text>
          <text x={cx} y={cy + 18} textAnchor="middle" fill="var(--text-faint)" fontSize="11" letterSpacing="0.04em" style={{ textTransform: "uppercase" }}>
            {b.title || b.label || (data[0]?.label ?? "Value")}
          </text>
          <text x={x1 - 4} y={y1 + 16} textAnchor="middle" fill="var(--text-faint)" fontSize="10">{min}</text>
          <text x={x2 + 4} y={y2 + 16} textAnchor="middle" fill="var(--text-faint)" fontSize="10">{max}</text>
        </svg>
      </div>
    );
  }

  // 0.2 Conversion Funnel
  if (kind === "funnel") {
    const stages = data.length ? data : [
      { label: "Visits", value: 12000 },
      { label: "Signups", value: 4600 },
      { label: "Active", value: 1800 },
      { label: "Paid", value: 520 },
    ];
    const firstVal = stages[0]?.value || 1;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 7, padding: "4px 0" }}>
        {stages.map((st, i) => {
          const pctFirst = Math.round((st.value / firstVal) * 100);
          const prevVal = i > 0 ? stages[i - 1].value : st.value;
          const pctPrev = prevVal > 0 ? Math.round((st.value / prevVal) * 100) : 100;
          const widthPct = Math.max(16, (st.value / firstVal) * 100);
          const col = PALETTE[i % PALETTE.length];

          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
                <span style={{ fontWeight: 540, color: "var(--text)" }}>{st.label}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  <b>{fmt(st.value)}</b>
                  <span style={{ color: "var(--text-faint)", marginLeft: 6 }}>
                    ({pctFirst}% {i > 0 && `· ${pctPrev}% of prev`})
                  </span>
                </span>
              </div>
              <div style={{ height: 20, background: "var(--surface-3)", borderRadius: "var(--r-xs)", overflow: "hidden", position: "relative" }}>
                <div
                  style={{
                    width: `${widthPct}%`,
                    height: "100%",
                    background: col,
                    borderRadius: "var(--r-xs)",
                    transformOrigin: "left center",
                    animation: `chart-hbar-wipe 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 45}ms both`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // 0.3 Candlestick / Stock OHLC
  if (kind === "candlestick") {
    const rawCandles = Array.isArray(b.data) && b.data.length && (b.data[0].open !== undefined || b.data[0].o !== undefined)
      ? b.data.map((c: any, i: number) => ({
          time: String(c.time || c.label || c.t || `T${i + 1}`),
          open: Number(c.open ?? c.o ?? 100),
          high: Number(c.high ?? c.h ?? 105),
          low: Number(c.low ?? c.l ?? 95),
          close: Number(c.close ?? c.c ?? 102),
        }))
      : data.map((d, i) => {
          const base = d.value || 100;
          return {
            time: d.label || `T${i + 1}`,
            open: base,
            high: base * 1.05,
            low: base * 0.95,
            close: base * (i % 2 === 0 ? 1.03 : 0.97),
          };
        });

    const minPrice = Math.min(...rawCandles.map((c) => c.low));
    const maxPrice = Math.max(...rawCandles.map((c) => c.high));
    const priceSpan = maxPrice - minPrice || 1;
    const candleW = Math.min(28, Math.max(8, (W - PAD * 2) / rawCandles.length - 6));
    const [hoverCandle, setHoverCandle] = useState<number | null>(null);
    const priceToY = (p: number) => H - PAD - ((p - minPrice) / priceSpan) * (H - PAD * 2);

    return (
      <div style={{ position: "relative" }}>
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          onMouseLeave={() => setHoverCandle(null)}
        >
          {[0, 0.5, 1].map((t, i) => {
            const y = PAD + t * (H - PAD * 2);
            const p = maxPrice - t * priceSpan;
            return (
              <g key={i}>
                <line x1={PAD} x2={W - PAD} y1={y} y2={y} stroke="var(--line-soft)" strokeDasharray="3 3" />
                <text x={W - PAD + 6} y={y + 3} fill="var(--text-faint)" fontSize="9" fontFamily="var(--mono)">
                  {p.toFixed(1)}
                </text>
              </g>
            );
          })}

          {rawCandles.map((c, i) => {
            const cx = PAD + (i + 0.5) * ((W - PAD * 2) / rawCandles.length);
            const isUp = c.close >= c.open;
            const col = isUp ? "var(--ok, #7fb98a)" : "var(--err, #ef4444)";
            const topY = priceToY(Math.max(c.open, c.close));
            const botY = priceToY(Math.min(c.open, c.close));
            const bodyH = Math.max(2, botY - topY);
            const highY = priceToY(c.high);
            const lowY = priceToY(c.low);
            const isHover = hoverCandle === i;

            return (
              <g
                key={i}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoverCandle(i)}
              >
                <line x1={cx} x2={cx} y1={highY} y2={lowY} stroke={col} strokeWidth="1.2" />
                <rect
                  x={cx - candleW / 2}
                  y={topY}
                  width={candleW}
                  height={bodyH}
                  fill={col}
                  rx={2}
                  opacity={hoverCandle === null || isHover ? 0.95 : 0.4}
                />
                <text x={cx} y={H - PAD + 14} textAnchor="middle" fill={isHover ? "var(--text)" : "var(--text-faint)"} fontSize="9">
                  {c.time.slice(0, 6)}
                </text>
              </g>
            );
          })}
        </svg>

        {hoverCandle !== null && rawCandles[hoverCandle] && (
          <div
            style={{
              position: "absolute",
              top: 6,
              left: 10,
              background: "var(--surface-3)",
              border: "1px solid var(--line-soft)",
              borderRadius: "var(--r-xs)",
              padding: "4px 8px",
              display: "flex",
              gap: 8,
              fontSize: 10.5,
              fontFamily: "var(--mono)",
              color: "var(--text)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            }}
          >
            <span><b>{rawCandles[hoverCandle].time}</b></span>
            <span>O: {rawCandles[hoverCandle].open}</span>
            <span>H: {rawCandles[hoverCandle].high}</span>
            <span>L: {rawCandles[hoverCandle].low}</span>
            <span style={{ color: rawCandles[hoverCandle].close >= rawCandles[hoverCandle].open ? "var(--ok)" : "var(--err)" }}>
              C: {rawCandles[hoverCandle].close}
            </span>
          </div>
        )}
      </div>
    );
  }

  // 0.4 Heatmap Matrix
  if (kind === "heatmap") {
    const matrix: { x: string; y: string; val: number }[] = [];
    if (Array.isArray(b.matrix)) {
      const yLabels = b.yLabels || b.rows || b.matrix.map((_: any, i: number) => `R${i + 1}`);
      const xLabels = b.xLabels || b.cols || (b.matrix[0] || []).map((_: any, j: number) => `C${j + 1}`);
      b.matrix.forEach((row: number[], rIdx: number) => {
        row.forEach((val: number, cIdx: number) => {
          matrix.push({ x: String(xLabels[cIdx] || cIdx), y: String(yLabels[rIdx] || rIdx), val: Number(val || 0) });
        });
      });
    } else {
      data.forEach((d) => {
        matrix.push({ x: d.label, y: "Val", val: d.value });
      });
    }

    const maxVal = Math.max(...matrix.map((m) => m.val), 1);
    const minVal = Math.min(...matrix.map((m) => m.val), 0);
    const uniqueX = Array.from(new Set(matrix.map((m) => m.x)));
    const [hoverCell, setHoverCell] = useState<{ x: string; y: string; val: number } | null>(null);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${uniqueX.length}, 1fr)`, gap: 4 }}>
          {matrix.map((cell, idx) => {
            const intensity = (cell.val - minVal) / (maxVal - minVal || 1);
            return (
              <div
                key={idx}
                onMouseEnter={() => setHoverCell(cell)}
                onMouseLeave={() => setHoverCell(null)}
                style={{
                  height: 36,
                  borderRadius: "var(--r-xs)",
                  background: `rgba(215, 178, 140, ${Math.max(0.12, intensity)})`,
                  border: "1px solid var(--line-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10.5,
                  fontFamily: "var(--mono)",
                  color: intensity > 0.5 ? "var(--bg)" : "var(--text)",
                  fontWeight: 550,
                  cursor: "pointer",
                }}
              >
                {cell.val}
              </div>
            );
          })}
        </div>
        {hoverCell && (
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-dim)", fontFamily: "var(--mono)", marginTop: 2 }}>
            {hoverCell.x} × {hoverCell.y}: <b>{hoverCell.val}</b>
          </div>
        )}
      </div>
    );
  }

  // 1. Donut & Pie
  if (kind === "pie" || kind === "donut") {
    const total = data.reduce((a, d) => a + d.value, 0) || 1;
    let acc = -Math.PI / 2;
    const R = 90, cx = 120, cy = 120;
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);

    return (
      <div style={{ display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap", position: "relative" }}>
        <svg width={240} height={240} viewBox="0 0 240 240">
          {data.map((d, i) => {
            const a0 = acc, a1 = acc + (d.value / total) * Math.PI * 2;
            acc = a1;
            const large = a1 - a0 > Math.PI ? 1 : 0;
            const isHover = hoverIdx === i;
            const r = isHover ? R + 4 : R;
            const p = `M ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} L ${cx} ${cy} Z`;
            return (
              <path
                key={i}
                d={p}
                fill={PALETTE[i % PALETTE.length]}
                opacity={hoverIdx === null || isHover ? 0.95 : 0.4}
                style={{ cursor: "pointer", transition: "all .16s ease", animation: `fade-in .5s ${i * 70}ms both` }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
            );
          })}
          {kind === "donut" && (
            <>
              <circle cx={cx} cy={cy} r={52} fill="var(--surface-2)" />
              <text x={cx} y={cy - 2} textAnchor="middle" fill="var(--text-faint)" fontSize="10" letterSpacing="0.05em">
                {hoverIdx !== null ? data[hoverIdx]?.label : "TOTAL"}
              </text>
              <text x={cx} y={cy + 16} textAnchor="middle" fill="var(--text)" fontSize="14" fontWeight="600">
                {hoverIdx !== null ? fmt(data[hoverIdx]?.value) : fmt(total)}
              </text>
            </>
          )}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 160 }}>
          {data.map((d, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                fontSize: "var(--fs-sm)",
                color: hoverIdx === i ? "var(--text)" : "var(--text-dim)",
                cursor: "pointer",
                padding: "2px 4px",
                borderRadius: "var(--r-xs)",
                background: hoverIdx === i ? "var(--surface-3)" : "transparent",
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: 2, background: PALETTE[i % PALETTE.length] }} />
              <span>{d.label}</span>
              <b style={{ color: "var(--text)", marginLeft: "auto" }}>{fmt(d.value)}</b>
              <span style={{ color: "var(--text-faint)", minWidth: 38, textAlign: "right" }}>
                {Math.round((d.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Horizontal Bar
  if (kind === "hbar") {
    const max = Math.max(...data.map((d) => d.value), 1);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.map((d, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-sm)", color: "var(--text-dim)", marginBottom: 4 }}>
              <span style={{ fontWeight: 500 }}>{d.label}</span>
              <b style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{fmt(d.value)}</b>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: "var(--surface-3)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${(d.value / max) * 100}%`,
                  height: "100%",
                  background: PALETTE[i % PALETTE.length],
                  borderRadius: 4,
                  transformOrigin: "left",
                  animation: `chart-hbar-wipe 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${i * 45}ms both`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 2b. Bubble Chart
  if (kind === "bubble") {
    const rawData = Array.isArray((b as any).data) ? (b as any).data : data;
    const bubbles = rawData.map((d: any, i: number) => {
      const label = d.label || d.name || d.category || `Bubble ${i + 1}`;
      const x = Number(d.x ?? (i + 1) * 20);
      const y = Number(d.y ?? d.value ?? 30 + (i * 15));
      const r = Number(d.r ?? d.z ?? d.size ?? d.revenue ?? 18);
      const color = d.color || PALETTE[i % PALETTE.length];
      return { label, x, y, r, color };
    });
    const xs = bubbles.map((x: any) => x.x);
    const ys = bubbles.map((x: any) => x.y);
    const rs = bubbles.map((x: any) => x.r);
    const minX = Math.min(...xs, 0), maxX = Math.max(...xs, 100);
    const minY = Math.min(...ys, 0), maxY = Math.max(...ys, 100);
    const maxR = Math.max(...rs, 1);

    const toPxX = (x: number) => PAD + ((x - minX) / (maxX - minX || 1)) * (W - PAD * 2);
    const toPxY = (y: number) => H - PAD - ((y - minY) / (maxY - minY || 1)) * (H - PAD * 2);
    const toPxR = (r: number) => Math.max(12, Math.min(38, 10 + (r / maxR) * 26));

    return (
      <div style={{ position: "relative" }}>
        <ChartTooltip tip={tip} />
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
          {[0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = H - PAD - pct * (H - PAD * 2);
            return <line key={i} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="var(--line-soft)" strokeDasharray="3 3" />;
          })}
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--line-soft)" />
          <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--line-soft)" />

          {bubbles.map((pt: any, i: number) => {
            const cx = toPxX(pt.x);
            const cy = toPxY(pt.y);
            const cr = toPxR(pt.r);
            return (
              <g
                key={i}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => {
                  setTip({
                    x: cx,
                    y: cy - cr - 8,
                    title: pt.label,
                    items: [
                      { label: "X Position", value: fmt(pt.x) },
                      { label: "Y Value", value: fmt(pt.y) },
                      { label: "Volume (R)", value: fmt(pt.r), color: pt.color },
                    ],
                  });
                }}
                onMouseLeave={() => setTip(null)}
              >
                <circle cx={cx} cy={cy} r={cr} fill={pt.color} fillOpacity="0.25" stroke={pt.color} strokeWidth="2" style={{ transition: "transform 0.15s ease" }} />
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="var(--text)" fontSize={Math.max(9, Math.min(12, cr * 0.55))} fontWeight="600" pointerEvents="none">
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // 2c. Treemap
  if (kind === "treemap") {
    const rawItems = data.length >= 2 ? data : [
      { label: "node_modules", value: 420 },
      { label: "src", value: 85 },
      { label: "dist", value: 45 },
      { label: "public", value: 22 },
    ];
    const total = rawItems.reduce((sum, d) => sum + Math.max(0, d.value), 0) || 1;
    const sorted = [...rawItems].sort((a, b) => b.value - a.value);

    return (
      <div style={{ position: "relative" }}>
        <ChartTooltip tip={tip} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, width: "100%", minHeight: 180 }}>
          {sorted.map((item, i) => {
            const pct = Math.round((item.value / total) * 100);
            const color = PALETTE[i % PALETTE.length];
            return (
              <div
                key={i}
                style={{
                  background: `color-mix(in srgb, ${color} 14%, var(--surface-2))`,
                  border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
                  borderRadius: "var(--r-sm)",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  minHeight: 85,
                  transition: "transform 0.15s ease",
                }}
                onMouseEnter={() => {
                  setTip({
                    x: W / 2,
                    y: 70,
                    title: item.label,
                    items: [{ label: "Size", value: `${fmt(item.value)} (${pct}%)`, color }],
                  });
                }}
                onMouseLeave={() => setTip(null)}
              >
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.label}
                </div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
                    {fmt(item.value)}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginTop: 2 }}>
                    {pct}% share
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2d. Waterfall Chart
  if (kind === "waterfall") {
    const steps = data.length >= 2 ? data : [
      { label: "Starting", value: 120 },
      { label: "New ARR", value: 45 },
      { label: "Churn", value: -12 },
      { label: "Expansion", value: 28 },
      { label: "Ending", value: 181 },
    ];
    let running = 0;
    const computedSteps = steps.map((s, idx) => {
      const isStart = idx === 0;
      const isEnd = idx === steps.length - 1;
      const val = s.value;
      const prev = running;
      if (!isEnd) running += val;
      const base = isStart || isEnd ? 0 : Math.min(prev, running);
      const top = isStart || isEnd ? (isStart ? val : running) : Math.max(prev, running);
      const isPositive = val >= 0;
      const color = isStart || isEnd ? "var(--accent)" : isPositive ? "var(--ok)" : "var(--err)";
      return { label: s.label, val, base, top, color, isTotal: isStart || isEnd };
    });

    const maxVal = Math.max(...computedSteps.map((c) => Math.max(c.top, c.base)), 1);
    const minVal = Math.min(...computedSteps.map((c) => Math.min(c.top, c.base)), 0);
    const range = maxVal - minVal || 1;

    const toY = (v: number) => H - PAD - ((v - minVal) / range) * (H - PAD * 2);
    const colW = (W - PAD * 2) / computedSteps.length;
    const barW = Math.min(42, colW * 0.62);

    return (
      <div style={{ position: "relative" }}>
        <ChartTooltip tip={tip} />
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
          <line x1={PAD} y1={toY(0)} x2={W - PAD} y2={toY(0)} stroke="var(--line-soft)" />
          {computedSteps.map((step, idx) => {
            const cx = PAD + idx * colW + colW / 2;
            const x = cx - barW / 2;
            const y1 = toY(step.top);
            const y2 = toY(step.base);
            const barH = Math.max(4, Math.abs(y2 - y1));
            const topY = Math.min(y1, y2);

            return (
              <g
                key={idx}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => {
                  setTip({
                    x: cx,
                    y: topY - 10,
                    title: step.label,
                    items: [{ label: step.isTotal ? "Total" : "Delta", value: `${step.val > 0 && !step.isTotal ? "+" : ""}${fmt(step.val)}`, color: step.color }],
                  });
                }}
                onMouseLeave={() => setTip(null)}
              >
                <rect x={x} y={topY} width={barW} height={barH} rx="3" fill={step.color} fillOpacity="0.8" stroke={step.color} strokeWidth="1.5" />
                <text x={cx} y={topY - 6} textAnchor="middle" fill="var(--text)" fontSize="10" fontFamily="var(--mono)" fontWeight="600">
                  {step.val > 0 && !step.isTotal ? `+${fmt(step.val)}` : fmt(step.val)}
                </text>
                <text x={cx} y={H - PAD + 16} textAnchor="middle" fill="var(--text-faint)" fontSize="10.5">
                  {step.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // 3. Line, Area, Scatter
  if (kind === "line" || kind === "area" || kind === "scatter") {
    const ss = (series.length ? series : [{ name: b.name || "Value", points: data.map((d, i) => ({ x: d.label || i, y: d.value })) }]).filter(
      (s) => !hiddenSeries[s.name]
    );
    const all = ss.flatMap((s) => s.points.map((p) => p.y));
    const max = Math.max(...all, 1), min = Math.min(...all, 0);
    const n = Math.max(...ss.map((s) => s.points.length), 2);
    const X = (i: number) => PAD + (i / (n - 1)) * (W - PAD * 2);
    const Y = (v: number) => H - PAD - ((v - min) / (max - min || 1)) * (H - PAD * 2);
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const relX = (mouseX / rect.width) * W;
      const clampedX = Math.max(PAD, Math.min(W - PAD, relX));
      const closestIdx = Math.max(0, Math.min(n - 1, Math.round(((clampedX - PAD) / (W - PAD * 2)) * (n - 1))));
      setHoverIdx(closestIdx);

      const items = ss.map((s, si) => ({
        label: s.name,
        value: fmt(s.points[closestIdx]?.y ?? 0),
        color: PALETTE[si % PALETTE.length],
      }));

      const tipX = (X(closestIdx) / W) * rect.width;
      const firstY = Y(ss[0]?.points[closestIdx]?.y ?? 0);
      const tipY = (firstY / H) * rect.height;

      setTip({
        x: tipX,
        y: tipY,
        title: String(ss[0]?.points[closestIdx]?.x ?? `Point ${closestIdx + 1}`),
        items,
      });
    };

    const handleMouseLeave = () => {
      setHoverIdx(null);
      setTip(null);
    };

    return (
      <div style={{ position: "relative" }}>
        {series.length > 1 && (
          <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
            {series.map((s, si) => (
              <button
                key={si}
                onClick={() => setHiddenSeries((prev) => ({ ...prev, [s.name]: !prev[s.name] }))}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "var(--fs-xs)",
                  color: hiddenSeries[s.name] ? "var(--text-faint)" : "var(--text)",
                  opacity: hiddenSeries[s.name] ? 0.4 : 1,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, background: PALETTE[si % PALETTE.length] }} />
                {s.name}
              </button>
            ))}
          </div>
        )}

        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          style={{ overflow: "visible", cursor: "crosshair" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {ss.map((_, si) => (
              <linearGradient key={si} id={`area-grad-${si}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PALETTE[si % PALETTE.length]} stopOpacity="0.32" />
                <stop offset="100%" stopColor={PALETTE[si % PALETTE.length]} stopOpacity="0.0" />
              </linearGradient>
            ))}
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
            <g key={i}>
              <line x1={PAD} x2={W - PAD} y1={PAD + t * (H - PAD * 2)} y2={PAD + t * (H - PAD * 2)} stroke="var(--line-soft)" strokeDasharray="3 3" />
              <text x={4} y={PAD + t * (H - PAD * 2) + 4} fill="var(--text-faint)" fontSize="10">{fmt(max - t * (max - min))}</text>
            </g>
          ))}

          {ss.map((s, si) => {
            const pts = s.points.map((p, i) => ({ x: X(i), y: Y(p.y) }));
            const lineD = getBezierPath(pts);
            const areaD = `${lineD} L ${X(s.points.length - 1)},${H - PAD} L ${X(0)},${H - PAD} Z`;
            const col = PALETTE[si % PALETTE.length];
            return (
              <g key={si}>
                {kind === "area" && s.points.length > 1 && (
                  <path
                    d={areaD}
                    fill={`url(#area-grad-${si})`}
                    style={{ animation: "chart-area-fade 0.85s cubic-bezier(0.16, 1, 0.3, 1) both" }}
                  />
                )}
                {kind !== "scatter" && (
                  <path
                    d={lineD}
                    fill="none"
                    stroke={col}
                    strokeWidth="2.4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeDasharray="2400"
                    strokeDashoffset="2400"
                    style={{ animation: "chart-draw 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
                  />
                )}
                {s.points.map((p, i) => {
                  const isHovered = hoverIdx === i;
                  return (
                    <circle
                      key={i}
                      cx={X(i)}
                      cy={Y(p.y)}
                      r={kind === "scatter" ? 4.5 : (isHovered ? 4.8 : 3.2)}
                      fill={col}
                      stroke="var(--surface)"
                      strokeWidth={isHovered ? 2 : 1.5}
                      style={{
                        cursor: "pointer",
                        transformOrigin: `${X(i)}px ${Y(p.y)}px`,
                        animation: `chart-dot-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${200 + i * 30}ms both`,
                        transition: "r 0.16s ease, stroke-width 0.16s ease",
                      }}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Google-style vertical crosshair and active pulsing dots */}
          {hoverIdx !== null && (
            <g pointerEvents="none">
              <line
                x1={X(hoverIdx)}
                x2={X(hoverIdx)}
                y1={PAD - 4}
                y2={H - PAD}
                stroke="rgba(255, 255, 255, 0.22)"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              {ss.map((s, si) => {
                const pt = s.points[hoverIdx];
                if (!pt) return null;
                const cy = Y(pt.y);
                const col = PALETTE[si % PALETTE.length];
                return (
                  <g key={si}>
                    <circle
                      cx={X(hoverIdx)}
                      cy={cy}
                      r={7}
                      fill={col}
                      opacity="0.2"
                    />
                    <circle
                      cx={X(hoverIdx)}
                      cy={cy}
                      r={3.6}
                      fill={col}
                      stroke="var(--surface)"
                      strokeWidth="2"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {ss[0]?.points.map((p, i) => (i % Math.max(1, Math.ceil(n / 8)) === 0 ? (
            <text
              key={i}
              x={X(i)}
              y={H - 10}
              textAnchor="middle"
              fill={hoverIdx === i ? "var(--text)" : "var(--text-faint)"}
              fontWeight={hoverIdx === i ? 600 : 400}
              fontSize="10"
            >
              {String(p.x).slice(0, 10)}
            </text>
          ) : null))}
        </svg>
        <ChartTooltip tip={tip} />
      </div>
    );
  }

  // 4. Bar & Grouped Bar
  const isMulti = series.length > 0;
  const categories = isMulti ? series[0].points.map((p) => String(p.x)) : data.map((d) => d.label);
  const numCats = Math.max(categories.length, 1);
  const numSeries = isMulti ? series.length : 1;
  const allVals = isMulti ? series.flatMap((s) => s.points.map((p) => p.y)) : data.map((d) => d.value);
  const maxVal = Math.max(...allVals, 1);
  const catWidth = (W - PAD * 2) / numCats;
  const barWidth = Math.min(38, (catWidth - 12) / numSeries);
  const [hoverBar, setHoverBar] = useState<number | null>(null);

  return (
    <div style={{ position: "relative" }}>
      {isMulti && (
        <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          {series.map((s, si) => (
            <span key={si} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: PALETTE[si % PALETTE.length] }} />
              {s.name}
            </span>
          ))}
        </div>
      )}

      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        onMouseLeave={() => { setTip(null); setHoverBar(null); }}
      >
        {[0, 0.5, 1].map((t, i) => (
          <line key={i} x1={PAD} x2={W - PAD} y1={PAD + t * (H - PAD * 2)} y2={PAD + t * (H - PAD * 2)} stroke="var(--line-soft)" strokeDasharray="3 3" />
        ))}

        {categories.map((cat, ci) => {
          const groupX = PAD + ci * catWidth + (catWidth - numSeries * barWidth) / 2;
          return (
            <g key={ci}>
              {isMulti ? (
                series.map((s, si) => {
                  const val = s.points[ci]?.y ?? 0;
                  const h = Math.max(2, (val / maxVal) * (H - PAD * 2));
                  const bx = groupX + si * barWidth;
                  const by = H - PAD - h;
                  const col = PALETTE[si % PALETTE.length];
                  const isHovered = hoverBar === ci;
                  return (
                    <rect
                      key={si}
                      x={bx}
                      y={by}
                      width={barWidth - 2}
                      height={h}
                      rx={4}
                      fill={col}
                      opacity={hoverBar === null || isHovered ? 0.95 : 0.6}
                      style={{
                        cursor: "pointer",
                        transformOrigin: `center ${H - PAD}px`,
                        animation: `chart-bar-grow .65s cubic-bezier(0.16, 1, 0.3, 1) ${ci * 35 + si * 40}ms both`,
                        transition: "opacity 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        setHoverBar(ci);
                        const rect = (e.target as SVGElement).getBoundingClientRect();
                        const parent = (e.target as SVGElement).closest("svg")?.getBoundingClientRect();
                        if (parent) {
                          setTip({
                            x: rect.left - parent.left + rect.width / 2,
                            y: rect.top - parent.top,
                            title: cat,
                            items: [{ label: s.name, value: fmt(val), color: col }],
                          });
                        }
                      }}
                    />
                  );
                })
              ) : (
                (() => {
                  const val = data[ci]?.value ?? 0;
                  const h = Math.max(2, (val / maxVal) * (H - PAD * 2));
                  const bx = PAD + (ci + 0.5) * catWidth - barWidth / 2;
                  const by = H - PAD - h;
                  const col = PALETTE[ci % PALETTE.length];
                  const isHovered = hoverBar === ci;
                  return (
                    <g>
                      <rect
                        x={bx}
                        y={by}
                        width={barWidth}
                        height={h}
                        rx={4}
                        fill={col}
                        opacity={hoverBar === null || isHovered ? 0.95 : 0.6}
                        style={{
                          cursor: "pointer",
                          transformOrigin: `center ${H - PAD}px`,
                          animation: `chart-bar-grow .65s cubic-bezier(0.16, 1, 0.3, 1) ${ci * 35}ms both`,
                          transition: "opacity 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          setHoverBar(ci);
                          const rect = (e.target as SVGElement).getBoundingClientRect();
                          const parent = (e.target as SVGElement).closest("svg")?.getBoundingClientRect();
                          if (parent) {
                            setTip({
                              x: rect.left - parent.left + rect.width / 2,
                              y: rect.top - parent.top,
                              title: cat,
                              items: [{ label: "Value", value: fmt(val), color: col }],
                            });
                          }
                        }}
                      />
                      <text x={bx + barWidth / 2} y={by - 6} textAnchor="middle" fill="var(--text-dim)" fontSize="10">{fmt(val)}</text>
                    </g>
                  );
                })()
              )}
              <text x={PAD + (ci + 0.5) * catWidth} y={H - PAD + 16} textAnchor="middle" fill={hoverBar === ci ? "var(--text)" : "var(--text-faint)"} fontSize="10">
                {cat.slice(0, 10)}
              </text>
            </g>
          );
        })}
      </svg>
      <ChartTooltip tip={tip} />
    </div>
  );
}

/* ------------------------------------------------- sortable & searchable table */
function DataTable({ b }: { b: CanvasBlock }) {
  const columns: string[] = b.columns || [];
  const rows: any[][] = b.rows || [];
  const [filter, setFilter] = useState("");
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    let list = rows;
    if (filter.trim()) {
      const q = filter.toLowerCase();
      list = list.filter((r) => r.some((c) => String(c).toLowerCase().includes(q)));
    }
    if (sortCol !== null) {
      list = [...list].sort((a, b) => {
        const va = a[sortCol], vb = b[sortCol];
        const na = Number(va), nb = Number(vb);
        if (!isNaN(na) && !isNaN(nb)) return sortAsc ? na - nb : nb - na;
        return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }
    return list;
  }, [rows, filter, sortCol, sortAsc]);

  const handleSort = (idx: number) => {
    if (sortCol === idx) setSortAsc(!sortAsc);
    else { setSortCol(idx); setSortAsc(true); }
  };

  return (
    <div className="canvas-card" style={{ padding: 0, overflow: "hidden" }}>
      {rows.length > 5 && (
        <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--line-soft)", display: "flex", gap: 10, alignItems: "center" }}>
          <input
            placeholder="Filter table..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: "4px 8px", fontSize: "var(--fs-xs)", maxWidth: 220 }}
          />
          <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)", marginLeft: "auto" }}>
            {filtered.length} of {rows.length} rows
          </span>
        </div>
      )}
      <div className="md-table-wrap" style={{ border: "none", borderRadius: 0 }}>
        <table className="md-table">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th
                  key={i}
                  onClick={() => handleSort(i)}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Click to sort"
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {c}
                    {sortCol === i ? (sortAsc ? " ↑" : " ↓") : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{String(c)}</td>
                ))}
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: "center", color: "var(--text-faint)", padding: 20 }}>
                  no matching rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- tabs & switcher block */
export function TabsBlock({ b }: { b: CanvasBlock }) {
  const rawTabs: any[] = b.tabs || [];
  const [active, setActive] = useState(0);
  if (!rawTabs.length) return null;

  const currentTab = rawTabs[active];
  const contentBlocks: CanvasBlock[] =
    currentTab?.blocks ||
    (currentTab?.content ? (Array.isArray(currentTab.content) ? currentTab.content : [currentTab.content]) : null) ||
    (currentTab?.block ? (Array.isArray(currentTab.block) ? currentTab.block : [currentTab.block]) : null) ||
    (currentTab?.chart ? [{ type: "chart", ...currentTab.chart }] : null) ||
    [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="comp-switcher-bar">
        <div className="comp-switcher">
          {rawTabs.map((t, idx) => (
            <button
              key={idx}
              data-active={active === idx}
              onClick={() => setActive(idx)}
            >
              {t.label || t.title || `Tab ${idx + 1}`}
            </button>
          ))}
        </div>
      </div>
      <div key={active} style={{ display: "flex", flexDirection: "column", gap: 8, animation: "chart-fade-switch 240ms var(--ease-out) both" }}>
        {contentBlocks.map((sub: any, i: number) => (
          <BlockR key={i} b={sub} />
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------- interactive sliders & forms */
function Callout({ b }: { b: CanvasBlock }) {
  const kind = b.tone || b.kind || "info"; // info | success | warn | err
  const colorMap: Record<string, string> = {
    info: "var(--info)",
    success: "var(--ok)",
    warn: "var(--warn)",
    err: "var(--err)",
  };
  const c = colorMap[kind] || "var(--accent)";

  return (
    <div
      className="canvas-card"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--line-soft)",
        padding: "10px 14px",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: c, flexShrink: 0 }} />
        <span style={{ fontWeight: 550, fontSize: "var(--fs-xs)", letterSpacing: "0.02em", color: "var(--text)" }}>
          {b.title || (kind.charAt(0).toUpperCase() + kind.slice(1))}
        </span>
      </div>
      <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-dim)", lineHeight: 1.5 }}>
        <Markdown text={b.text || b.content || ""} animate={false} />
      </div>
    </div>
  );
}

function Accordion({ b }: { b: CanvasBlock }) {
  const items: { title: string; content?: string; blocks?: CanvasBlock[] }[] = b.items || [];
  const [open, setOpen] = useState<Record<number, boolean>>({});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((it, idx) => (
        <div key={idx} className="canvas-card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            onClick={() => setOpen((prev) => ({ ...prev, [idx]: !prev[idx] }))}
            style={{
              padding: "10px 14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontWeight: 520,
              fontSize: "var(--fs-sm)",
            }}
          >
            <span>{it.title}</span>
            <span style={{ color: "var(--text-faint)", transform: open[idx] ? "rotate(90deg)" : "none", transition: "transform .16s" }}>
              ›
            </span>
          </div>
          {open[idx] && (
            <div style={{ padding: "0 14px 12px", borderTop: "1px solid var(--line-soft)", fontSize: "var(--fs-sm)", color: "var(--text-dim)", paddingTop: 10 }}>
              {it.content && <Markdown text={it.content} animate={false} />}
              {it.blocks && it.blocks.map((sub, i) => <BlockR key={i} b={sub} />)}
            </div>
          )}
        </div>
      ))}
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
          <span className="md-box" data-on={!!done[i]}>
            {done[i] && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                <path d="M4 12.5l5.5 5.5L20 6" />
              </svg>
            )}
          </span>
          <span
            onClick={() => setDone((d) => ({ ...d, [i]: !d[i] }))}
            style={{ textDecoration: done[i] ? "line-through" : "none", color: done[i] ? "var(--text-faint)" : "var(--text)" }}
          >
            {t}
          </span>
        </label>
      ))}
    </div>
  );
}

/* -------------------------------------------------------- question block */
export function QuestionBlock({ b }: { b: CanvasBlock }) {
  const q = b.question || b.title || "Select an option:";
  const rawOptions = b.options || b.items || [];
  const options: { id: string; label: string; description?: string }[] = rawOptions.map((o: any, i: number) =>
    typeof o === "string" ? { id: String(i), label: o } : { id: o.id || String(i), label: o.label || o.title || String(o), description: o.description }
  );
  const allowCustom = b.allowCustom !== false;
  const showSkip = b.skipButton !== false && b.skip !== false;
  const requireSubmit = Boolean(b.requireSubmit || b.submitButton || b.submitLabel || b.inForm);
  const submitLabel = b.submitLabel || b.submitButton || "Submit Answer";

  const [selected, setSelected] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customVal, setCustomVal] = useState("");
  const [answered, setAnswered] = useState<string | null>(null);

  const handleSelect = (opt: { id: string; label: string }) => {
    setSelected(opt.id);
    if (requireSubmit) return;
    setAnswered(opt.label);
    const activeId = useApp.getState().activeId;
    if (activeId) {
      send(activeId, opt.label, []);
    }
  };

  const handleSubmit = () => {
    const chosen = options.find((o) => o.id === selected);
    if (!chosen) return;
    setAnswered(chosen.label);
    const activeId = useApp.getState().activeId;
    if (activeId) {
      const payload = JSON.stringify({ question: q, answer: chosen.label, id: chosen.id }, null, 2);
      send(activeId, payload, []);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customVal.trim()) return;
    const text = customVal.trim();
    setAnswered(text);
    const activeId = useApp.getState().activeId;
    if (activeId) {
      send(activeId, text, []);
    }
  };

  const handleSkip = () => {
    setAnswered("Skipped");
    const activeId = useApp.getState().activeId;
    if (activeId) {
      send(activeId, `Skipped: ${q}`, []);
    }
  };

  if (answered) {
    return (
      <div className="comp-question-card" style={{ borderLeftColor: "var(--ok)", padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-dim)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--ok)", fontWeight: 600 }}>✓</span>
            <span style={{ color: "var(--text)", fontWeight: 540 }}>{answered}</span>
          </span>
          <button
            className="comp-action-btn"
            style={{ fontSize: "11px", padding: "2px 7px" }}
            onClick={() => setAnswered(null)}
          >
            change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="comp-question-card">
      <div className="comp-question-title">{q}</div>
      <div className="comp-question-options">
        {options.map((opt) => (
          <button
            key={opt.id}
            className="comp-question-opt"
            data-selected={selected === opt.id}
            onClick={() => handleSelect(opt)}
          >
            <span className="comp-question-radio" />
            <div className="comp-question-opt-info">
              <span className="comp-question-opt-label">{opt.label}</span>
              {opt.description && <span className="comp-question-opt-desc">{opt.description}</span>}
            </div>
          </button>
        ))}
      </div>

      <div className="comp-question-footer">
        {customOpen ? (
          <form className="comp-custom-input-wrap" onSubmit={handleCustomSubmit}>
            <input
              className="comp-custom-input"
              type="text"
              autoFocus
              placeholder="Type your custom response..."
              value={customVal}
              onChange={(e) => setCustomVal(e.target.value)}
            />
            <button className="btn primary" type="submit" style={{ padding: "4px 10px", fontSize: "11px" }}>
              Send
            </button>
            <button
              className="comp-action-btn"
              type="button"
              onClick={() => { setCustomOpen(false); setCustomVal(""); }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            {allowCustom && (
              <button className="comp-action-btn" onClick={() => setCustomOpen(true)}>
                + Custom answer
              </button>
            )}
            <span style={{ flex: 1 }} />
            {requireSubmit ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={!selected}
                onClick={handleSubmit}
                style={{ height: 26, padding: "0 12px", fontSize: "11px" }}
              >
                {submitLabel}
              </button>
            ) : showSkip ? (
              <button className="comp-action-btn skip" onClick={handleSkip}>
                Skip
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------- follow-up prompts */
export function FollowupsBlock({ b }: { b: CanvasBlock }) {
  const prompts: string[] = b.prompts || b.items || b.followups || [];
  if (!prompts.length) return null;

  const handlePromptClick = (p: string) => {
    const activeId = useApp.getState().activeId;
    if (activeId) {
      send(activeId, p, []);
    }
  };

  return (
    <div className="comp-followups-wrap">
      {prompts.map((p, idx) => (
        <button
          key={idx}
          className="comp-prompt-chip"
          onClick={() => handlePromptClick(p)}
          title={`Send prompt: "${p}"`}
        >
          <span>{p}</span>
          <span className="chip-arrow">↗</span>
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------- auto-adaptive text & grouping */

export function AdaptiveText({
  text,
  className = "",
  style,
  as: Component = "span",
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  as?: any;
}) {
  const containerRef = useRef<HTMLElement | null>(null);
  const textRef = useRef<HTMLElement | null>(null);
  const [overflow, setOverflow] = useState(0);

  const checkOverflow = useCallback(() => {
    const c = containerRef.current;
    const t = textRef.current;
    if (c && t) {
      const diff = t.scrollWidth - c.clientWidth;
      setOverflow(diff > 2 ? diff : 0);
    }
  }, []);

  useLayoutEffect(() => {
    checkOverflow();
  }, [text, checkOverflow]);

  useEffect(() => {
    const c = containerRef.current;
    if (!c || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => checkOverflow());
    ro.observe(c);
    return () => ro.disconnect();
  }, [checkOverflow]);

  const hasOverflow = overflow > 0;
  const marqueeDur = `${Math.max(2.5, overflow / 18)}s`;

  return (
    <Component
      ref={containerRef}
      className={`adaptive-text-box ${hasOverflow ? "adaptive-marquee-active" : ""} ${className}`}
      style={{
        ...style,
        ["--overflow-dist" as any]: `${overflow + 14}px`,
        ["--marquee-dur" as any]: marqueeDur,
      }}
    >
      <span ref={textRef} className="adaptive-marquee">
        {text}
      </span>
      {hasOverflow && (
        <span
          className="adaptive-fade-edge"
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 16,
            background: "linear-gradient(to right, transparent, var(--surface))",
            pointerEvents: "none",
            transition: "opacity 0.2s ease",
          }}
        />
      )}
    </Component>
  );
}

export function ButtonGroupBlock({ blocks }: { blocks: any[] }) {
  if (!blocks || blocks.length === 0) return null;
  const count = blocks.length;

  return (
    <div
      className="comp-button-group a-blk"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
        gap: 8,
        width: "100%",
        maxWidth: 260,
        margin: "6px auto 0",
      }}
    >
      {blocks.map((b, i) => (
        <div key={i} style={{ minWidth: 0, width: "100%", display: "flex" }}>
          <ButtonBlock b={{ ...b, style: { width: "100%", ...b.style } }} />
        </div>
      ))}
    </div>
  );
}

export function normalizeAdaptiveBlocks(blocks: any[]): any[] {
  if (!Array.isArray(blocks)) return [];
  const normalized: any[] = [];
  let buttonAccum: any[] = [];

  const flushButtons = () => {
    if (buttonAccum.length === 1) {
      normalized.push(buttonAccum[0]);
    } else if (buttonAccum.length > 1) {
      normalized.push({
        type: "button_group",
        blocks: [...buttonAccum],
      });
    }
    buttonAccum = [];
  };

  for (const b of blocks) {
    if (!b) continue;
    const type = String(b.type || b.kind || "").toLowerCase();
    if (type === "button" || type === "btn") {
      buttonAccum.push(b);
    } else {
      flushButtons();
      normalized.push(b);
    }
  }
  flushButtons();
  return normalized;
}

/* -------------------------------------------------- composable primitives */

export function SliderBlock({ b }: { b: any }) {
  const { state, updateState, interpolate } = useReactive();
  const min = Number(b.min ?? 0);
  const max = Number(b.max ?? 100);
  const step = Number(b.step ?? 1);
  const unit = b.unit ?? "";
  const rawLabel = interpolate(b.label || b.title || "Slider");

  const boundVal = b.bind && state[b.bind] !== undefined ? Number(state[b.bind]) : undefined;
  const [internalVal, setInternalVal] = useState<number>(() => Number(b.value ?? Math.round((min + max) / 2)));
  const val = boundVal !== undefined ? boundVal : internalVal;

  // Clean label of redundant value readout if present (e.g. "Work: 25 min" -> "Work")
  const cleanLabel = useMemo(() => {
    if (typeof rawLabel !== "string") return rawLabel;
    return rawLabel.replace(/[:\-]?\s*\d+\s*(?:min|mins|sec|secs|s|m|%|px)?\s*$/i, "").trim() || rawLabel;
  }, [rawLabel]);

  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const pct = Math.min(100, Math.max(0, ((val - min) / (max - min || 1)) * 100));

  const updateFromPointer = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / (rect.width || 1)));
    const rawVal = min + ratio * (max - min);
    const stepped = Math.round(rawVal / step) * step;
    const clamped = Math.min(max, Math.max(min, stepped));
    if (b.bind) {
      updateState(b.bind, clamped);
    } else {
      setInternalVal(clamped);
    }
    if (b.onChange) b.onChange(clamped);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    updateFromPointer(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (isDragging) updateFromPointer(e.clientX);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <div
      className="comp-slider-card a-blk"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: "8px 12px",
        background: "var(--surface)",
        border: "1px solid var(--line-soft)",
        borderRadius: "var(--r)",
        margin: "4px 0",
        userSelect: "none",
      }}
    >
      <div className="slider-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, minWidth: 0, gap: 8 }}>
        <span style={{ fontSize: "var(--fs-xs)", fontWeight: 540, color: "var(--text)", display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0, overflow: "hidden" }}>
          <I.sliders size={13} style={{ flexShrink: 0 }} />
          <AdaptiveText text={cleanLabel} />
        </span>
        <span className="slider-readout" style={{ fontSize: "var(--fs-xs)", fontFamily: "var(--mono)", color: "var(--text-dim)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
          {val}{unit}
        </span>
      </div>

      {/* Precision Expansion Track: hairline by default (6px), expands on hold/drag (26px) for precision readout */}
      <div
        style={{
          height: 28,
          display: "flex",
          alignItems: "center",
          cursor: "ew-resize",
        }}
      >
        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="comp-slider-track"
          data-active={isDragging}
          style={{
            position: "relative",
            width: "100%",
            height: isDragging ? 26 : isHovered ? 9 : 6,
            background: "var(--surface-3)",
            borderRadius: 9999,
            overflow: "hidden",
            touchAction: "none",
            transition: "height 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.15s ease",
          }}
        >
          {/* Fill Bar */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${pct}%`,
              background: "var(--accent)",
              borderRadius: 9999,
              transition: isDragging ? "none" : "width 0.12s ease",
            }}
          />

          {/* Precision readout inside track when thickened on drag */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              color: "var(--text)",
              mixBlendMode: "difference",
              opacity: isDragging ? 1 : 0,
              transition: "opacity 0.15s ease",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 700, fontFamily: "var(--mono)", letterSpacing: "0.02em" }}>
              {val}{unit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ButtonBlock({ b }: { b: any }) {
  const { interpolate, runAction, state } = useReactive();
  const text = interpolate(b.text || b.label || b.title || "Button");
  const [clicked, setClicked] = useState(false);
  const variant = b.variant || "primary";
  const size = b.size || "md";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (b.disabled) return;
    setClicked(true);
    setTimeout(() => setClicked(false), 300);

    // 1. Run safe action script on reactive state
    if (b.onClick) {
      runAction(b.onClick);
    }

    // 2. Submit state to chat
    if (b.submitToChat) {
      const activeId = useApp.getState().activeId;
      if (activeId) {
        const msg = interpolate(b.submitToChat);
        send(activeId, msg, []);
      }
    }

    // 3. Built-in actions
    if (b.action === "reset") {
      runAction("for (const k in state) state[k] = 0;");
    } else if (b.action === "copy") {
      const copyVal = b.copyValue ? interpolate(b.copyValue) : JSON.stringify(state, null, 2);
      copyToClipboard(copyVal);
    }
  };

  const bg =
    variant === "primary"
      ? "var(--accent)"
      : variant === "danger"
      ? "var(--err)"
      : variant === "secondary"
      ? "var(--surface-3)"
      : variant === "ghost"
      ? "transparent"
      : "var(--surface-2)";

  const color =
    variant === "primary" || variant === "danger"
      ? "#fff"
      : "var(--text)";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={b.disabled}
      className={`comp-btn comp-btn-${variant}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: size === "sm" ? "4px 10px" : size === "lg" ? "10px 18px" : "6px 14px",
        borderRadius: "var(--r-sm)",
        background: bg,
        color,
        border: variant === "outline" ? "1px solid var(--line-strong)" : "1px solid transparent",
        fontSize: size === "sm" ? "11.5px" : "12.5px",
        fontWeight: 540,
        cursor: b.disabled ? "not-allowed" : "pointer",
        opacity: b.disabled ? 0.6 : 1,
        transform: clicked ? "scale(0.96)" : "scale(1)",
        transition: "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.15s ease",
        ...b.style,
      }}
    >
      <span>{text}</span>
    </button>
  );
}

export function CheckboxBlock({ b }: { b: any }) {
  const { state, updateState, interpolate } = useReactive();
  const label = interpolate(b.label || b.title);
  const description = interpolate(b.description || b.desc);

  const boundVal = b.bind && state[b.bind] !== undefined ? Boolean(state[b.bind]) : undefined;
  const [internalVal, setInternalVal] = useState<boolean>(Boolean(b.checked || b.value));
  const checked = boundVal !== undefined ? boundVal : internalVal;

  const toggle = () => {
    const next = !checked;
    if (b.bind) updateState(b.bind, next);
    else setInternalVal(next);
    if (b.onChange) b.onChange(next);
  };

  return (
    <div
      onClick={toggle}
      className="comp-checkbox-row a-blk"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "8px 12px",
        borderRadius: "var(--r-sm)",
        background: "var(--surface)",
        border: "1px solid var(--line-soft)",
        cursor: "pointer",
        margin: "4px 0",
        userSelect: "none",
      }}
    >
      <div
        style={{
          width: 17,
          height: 17,
          borderRadius: "var(--r-xs)",
          border: checked ? "1px solid var(--accent)" : "1px solid var(--line-strong)",
          background: checked ? "var(--accent)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
          flexShrink: 0,
          transition: "background var(--t-fast), border-color var(--t-fast)",
        }}
      >
        {checked && <I.check size={11} />}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: "var(--fs-xs)", fontWeight: 520, color: "var(--text)" }}>{label}</span>
        {description && <span style={{ fontSize: "11px", color: "var(--text-faint)" }}>{description}</span>}
      </div>
    </div>
  );
}

export function SwitchBlock({ b }: { b: any }) {
  const { state, updateState, interpolate } = useReactive();
  const label = interpolate(b.label || b.title);
  const description = interpolate(b.description || b.desc);

  const boundVal = b.bind && state[b.bind] !== undefined ? Boolean(state[b.bind]) : undefined;
  const [internalVal, setInternalVal] = useState<boolean>(Boolean(b.checked || b.value));
  const checked = boundVal !== undefined ? boundVal : internalVal;

  const toggle = () => {
    const next = !checked;
    if (b.bind) updateState(b.bind, next);
    else setInternalVal(next);
    if (b.onChange) b.onChange(next);
  };

  return (
    <div
      onClick={toggle}
      className="comp-switch-row a-blk"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        borderRadius: "var(--r-sm)",
        background: "var(--surface)",
        border: "1px solid var(--line-soft)",
        cursor: "pointer",
        margin: "4px 0",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: "var(--fs-xs)", fontWeight: 520, color: "var(--text)" }}>{label}</span>
        {description && <span style={{ fontSize: "11px", color: "var(--text-faint)" }}>{description}</span>}
      </div>
      <div
        style={{
          width: 40,
          height: 22,
          borderRadius: 9999,
          background: checked ? "var(--accent)" : "var(--surface-3)",
          position: "relative",
          flexShrink: 0,
          transition: "background 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          border: "1px solid var(--line-soft)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 20 : 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
            transition: "left 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
      </div>
    </div>
  );
}

export function DropdownBlock({ b }: { b: any }) {
  const { state, updateState, interpolate } = useReactive();
  const label = interpolate(b.label || b.title);
  const rawOptions = Array.isArray(b.options) ? b.options : [];
  const options = rawOptions.map((o: any) =>
    typeof o === "string" ? { label: o, value: o } : { label: o.label || o.title || String(o.value), value: o.value ?? o.id }
  );

  const boundVal = b.bind && state[b.bind] !== undefined ? state[b.bind] : undefined;
  const [internalVal, setInternalVal] = useState(b.value || (options[0]?.value ?? ""));
  const currentVal = boundVal !== undefined ? boundVal : internalVal;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const currentLabel = options.find((o: any) => o.value === currentVal)?.label || currentVal || b.placeholder || "Select...";
  const filtered = options.filter((o: any) => !search || String(o.label || o.value).toLowerCase().includes(search.toLowerCase()));

  const handleSelect = (val: any) => {
    if (b.bind) updateState(b.bind, val);
    else setInternalVal(val);
    setOpen(false);
    if (b.onChange) b.onChange(val);
  };

  return (
    <div style={{ margin: "4px 0", position: "relative" }} className="a-blk">
      {label && <div style={{ fontSize: "11px", fontWeight: 520, color: "var(--text-faint)", marginBottom: 4 }}>{label}</div>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="comp-dropdown-trigger"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "7px 11px",
          background: "var(--surface)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--r-sm)",
          color: "var(--text)",
          fontSize: "var(--fs-xs)",
          cursor: "pointer",
        }}
      >
        <span>{currentLabel}</span>
        <span style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
          <I.down size={13} />
        </span>
      </button>
      {open && (
        <div
          className="comp-dropdown-menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "var(--surface-2)",
            border: "1px solid var(--line-soft)",
            borderRadius: "var(--r-sm)",
            boxShadow: "var(--sh-lg)",
            padding: 4,
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {b.searchable !== false && options.length > 5 && (
            <input
              autoFocus
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "4px 8px",
                marginBottom: 4,
                background: "var(--surface)",
                border: "1px solid var(--line-soft)",
                borderRadius: "var(--r-xs)",
                color: "var(--text)",
                fontSize: "11px",
              }}
            />
          )}
          {filtered.map((opt: any, i: number) => {
            const isSel = opt.value === currentVal;
            return (
              <div
                key={i}
                onClick={() => handleSelect(opt.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "var(--r-xs)",
                  background: isSel ? "var(--accent-soft)" : "transparent",
                  color: isSel ? "var(--accent)" : "var(--text)",
                  fontSize: "var(--fs-xs)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{opt.label}</span>
                {isSel && <I.check size={12} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function InputBlock({ b }: { b: any }) {
  const { state, updateState, interpolate } = useReactive();
  const label = interpolate(b.label || b.title);
  const placeholder = b.placeholder || "Enter value...";
  const type = b.type === "number" ? "number" : "text";

  const boundVal = b.bind && state[b.bind] !== undefined ? state[b.bind] : undefined;
  const [internalVal, setInternalVal] = useState<any>(() => b.value ?? "");
  const currentVal = boundVal !== undefined ? boundVal : internalVal;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value;
    if (b.bind) {
      updateState(b.bind, val);
    } else {
      setInternalVal(val);
    }
    if (b.onChange) b.onChange(val);
  };

  return (
    <div style={{ margin: "4px 0" }} className="a-blk">
      {label && <div style={{ fontSize: "11px", fontWeight: 520, color: "var(--text-faint)", marginBottom: 4 }}>{label}</div>}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          type={type}
          placeholder={placeholder}
          value={currentVal}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "7px 11px",
            background: "var(--surface)",
            border: "1px solid var(--line-soft)",
            borderRadius: "var(--r-sm)",
            color: "var(--text)",
            fontSize: "var(--fs-xs)",
            outline: "none",
            transition: "border-color var(--t-fast)",
          }}
        />
        {b.clearable !== false && currentVal && (
          <button
            type="button"
            onClick={() => {
              if (b.bind) updateState(b.bind, "");
              else setInternalVal("");
            }}
            className="icon-btn sm"
            style={{ position: "absolute", right: 6, width: 22, height: 22 }}
          >
            <I.x size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

export function ProgressBlock({ b }: { b: any }) {
  const { interpolate } = useReactive();
  const label = interpolate(b.label || "Progress");
  const rawVal = interpolate(b.value != null ? b.value : 50);
  const val = Number(rawVal) || 0;
  const max = Number(interpolate(b.max != null ? b.max : 100)) || 100;
  const unit = b.unit || "%";
  const pct = Math.min(100, Math.max(0, (val / max) * 100));

  return (
    <div style={{ padding: "8px 12px", background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-sm)", margin: "4px 0" }} className="a-blk">
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-dim)", marginBottom: 6 }}>
        <span>{label}</span>
        <span style={{ fontFamily: "var(--mono)" }}>{Math.round(pct)}{unit}</span>
      </div>
      <div style={{ height: 6, background: "var(--surface-3)", borderRadius: 9999, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "var(--accent)",
            borderRadius: 9999,
            transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------- fundamental composable blocks */

export function CardBlock({ b }: { b: any }) {
  const { interpolate } = useReactive();
  const title = interpolate(b.title);
  const subtitle = interpolate(b.subtitle || b.desc || b.description);
  const badge = interpolate(b.badge);
  const variant = b.variant || "default";
  const align = b.align || (b.centered ? "center" : undefined);
  const isCircular = b.shape === "circle" || b.circular === true;

  // Progress around card perimeter or circular ring
  const rawProgress = b.borderProgress ?? b.progress;
  const progressVal = rawProgress != null ? Number(interpolate(rawProgress)) : undefined;
  const progressColor = interpolate(b.progressColor || "var(--accent)");

  const cardRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setDims({ w: rect.width, h: rect.height });
    };
    update();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => update());
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, []);

  const rawChildren = b.blocks || b.children || b.items || [];
  const children = useMemo(() => normalizeAdaptiveBlocks(rawChildren), [rawChildren]);

  const hasPerimeter = progressVal != null && !isNaN(progressVal);
  const clampedProgress = hasPerimeter ? Math.min(100, Math.max(0, progressVal)) : 0;

  const inner = (
    <div
      ref={cardRef}
      className={`block-card block-card-${variant} ${isCircular ? "block-card-circular" : ""}`}
      style={{
        position: "relative",
        padding: b.padding != null ? (typeof b.padding === "number" ? `${b.padding}px` : b.padding) : isCircular ? "28px 20px" : undefined,
        gap: b.gap != null ? (typeof b.gap === "number" ? `${b.gap}px` : b.gap) : isCircular ? 8 : undefined,
        textAlign: align as any,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : undefined,
        justifyContent: align === "center" ? "center" : undefined,
        borderRadius: isCircular ? "9999px" : "var(--r)",
        aspectRatio: isCircular ? "1 / 1" : undefined,
        maxWidth: isCircular ? 280 : undefined,
        width: "100%",
        margin: isCircular ? "12px auto" : undefined,
        overflow: "hidden",
      }}
    >
      {/* 1. Circular Card Progress Ring Dial */}
      {hasPerimeter && isCircular && dims.w > 0 && dims.h > 0 && (
        <svg
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 1,
            overflow: "visible",
          }}
        >
          {/* Background Track Ring */}
          <circle
            cx={dims.w / 2}
            cy={dims.h / 2}
            r={Math.max(10, Math.min(dims.w, dims.h) / 2 - 4)}
            fill="none"
            stroke="var(--line-soft)"
            strokeWidth="3.5"
          />
          {/* Active Progress Dial */}
          <circle
            cx={dims.w / 2}
            cy={dims.h / 2}
            r={Math.max(10, Math.min(dims.w, dims.h) / 2 - 4)}
            fill="none"
            stroke={progressColor}
            strokeWidth="3.5"
            strokeDasharray="100"
            strokeDashoffset={100 - clampedProgress}
            pathLength="100"
            strokeLinecap="round"
            transform={`rotate(-90 ${dims.w / 2} ${dims.h / 2})`}
            style={{
              transition: "stroke-dashoffset 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </svg>
      )}

      {/* 2. Rectangular Card Top Border Progress Bar */}
      {hasPerimeter && !isCircular && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "var(--line-soft)",
            borderTopLeftRadius: "var(--r)",
            borderTopRightRadius: "var(--r)",
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${clampedProgress}%`,
              background: progressColor,
              transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>
      )}

      {(title || badge || subtitle) && (
        <div
          style={{
            display: "flex",
            flexDirection: align === "center" ? "column" : "row",
            alignItems: align === "center" ? "center" : "flex-start",
            justifyContent: align === "center" ? "center" : "space-between",
            gap: align === "center" ? 4 : 10,
            marginBottom: isCircular ? 0 : 2,
            width: "100%",
            textAlign: align as any,
          }}
        >
          <div style={{ textAlign: align as any, width: "100%" }}>
            {title && (
              <div
                style={{
                  fontSize: isCircular ? "12px" : "var(--fs-base)",
                  fontWeight: 600,
                  color: isCircular ? "var(--text-dim)" : "var(--text)",
                  letterSpacing: isCircular ? "0.06em" : "-0.01em",
                  textTransform: isCircular ? "uppercase" : "none",
                }}
              >
                <AdaptiveText text={title} />
              </div>
            )}
            {subtitle && (
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-dim)", marginTop: 2 }}>
                <AdaptiveText text={subtitle} />
              </div>
            )}
          </div>
          {badge && !isCircular && (
            <BadgeBlock b={typeof badge === "string" ? { text: badge } : badge} />
          )}
        </div>
      )}

      {Array.isArray(children) && children.map((child: any, i: number) => (
        <BlockR key={i} b={child} />
      ))}
    </div>
  );

  const scopeId = b.id || b.scope || b.link;

  // If card specifies state or tick loop, or explicit scopeId, wrap in its own reactive scope
  if (b.state || b.tick || b.onTick || scopeId) {
    return (
      <ReactiveProvider scopeId={scopeId} initialState={b.state} tick={b.tick} onTick={b.onTick}>
        {inner}
      </ReactiveProvider>
    );
  }

  return inner;
}

export function GridBlock({ b }: { b: any }) {
  const cols = Math.min(6, Math.max(1, Number(b.cols || b.columns || 2)));
  const gap = b.gap != null ? (typeof b.gap === "number" ? `${b.gap}px` : b.gap) : "8px";
  const items = b.blocks || b.items || b.children || [];
  const total = items.length;

  return (
    <div
      className={`block-grid block-grid-cols-${cols}`}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap,
        width: "100%",
      }}
    >
      {items.map((item: any, i: number) => {
        // Auto-balance odd dangling items:
        // If 3 items in a 2-col grid, the 3rd item spans 2 columns to eliminate awkward holes!
        const isOddDangler = cols === 2 && total % 2 !== 0 && i === total - 1;
        const gridSpan = isOddDangler ? "1 / -1" : undefined;

        return (
          <div key={i} style={{ minWidth: 0, gridColumn: gridSpan }}>
            <BlockR b={item} />
          </div>
        );
      })}
    </div>
  );
}

export function TextBlock({ b }: { b: any }) {
  const { interpolate } = useReactive();
  const text = interpolate(b.text || b.content || "");
  const variant = b.variant || "body";
  const align = b.align || (b.centered ? "center" : "left");

  if (variant === "title") {
    return (
      <h2 style={{ fontSize: "1.25rem", fontWeight: 650, margin: "2px 0 6px", textAlign: align as any, letterSpacing: "-0.015em", color: "var(--text)" }}>
        <AdaptiveText text={text} />
      </h2>
    );
  }
  if (variant === "sub" || variant === "subtitle") {
    return (
      <p style={{ fontSize: "var(--fs-sm)", color: "var(--text-dim)", margin: "2px 0 6px", textAlign: align as any, lineHeight: 1.5 }}>
        <AdaptiveText text={text} />
      </p>
    );
  }
  if (variant === "kicker") {
    return (
      <div style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "2px 0", textAlign: align as any }}>
        <AdaptiveText text={text} />
      </div>
    );
  }
  if (variant === "code") {
    return <pre style={{ fontFamily: "var(--mono)", fontSize: "12px", background: "var(--surface-3)", padding: "8px 12px", borderRadius: "var(--r-sm)", overflowX: "auto" }}><code>{text}</code></pre>;
  }
  return <div style={{ textAlign: align as any }}><Markdown text={text} animate={false} /></div>;
}

export function MetricBlock({ b }: { b: any }) {
  const { interpolate } = useReactive();
  const label = interpolate(b.label || b.title || "");
  const rawValue = interpolate(b.value != null ? b.value : "");
  const value = typeof rawValue === "number" ? Number(rawValue.toFixed(2)).toString() : String(rawValue);
  const delta = interpolate(b.delta);
  const sub = interpolate(b.sub || b.hint);
  const align = b.align || (b.centered ? "center" : "left");

  const isNeg = delta != null && String(delta).trim().startsWith("-");
  const isCentered = align === "center";

  return (
    <div
      className="block-metric a-blk"
      style={{
        padding: isCentered ? "2px 0" : "8px 10px",
        textAlign: align as any,
        display: "flex",
        flexDirection: "column",
        alignItems: isCentered ? "center" : "flex-start",
        width: "100%",
        minWidth: 0,
        ...b.style,
      }}
    >
      {label && (
        <div className="metric-k" style={{ textAlign: align as any, whiteSpace: "nowrap", width: "100%" }}>
          <AdaptiveText text={label} />
        </div>
      )}

      <div
        className="metric-v"
        style={{
          fontVariantNumeric: "tabular-nums",
          textAlign: align as any,
          whiteSpace: "nowrap",
          wordBreak: "keep-all",
          display: "block",
          fontSize: isCentered ? "2.4rem" : undefined,
          lineHeight: 1.12,
          letterSpacing: "-0.025em",
          fontWeight: 650,
          margin: isCentered ? "4px 0" : "2px 0",
        }}
      >
        {value}
      </div>

      {(delta != null || sub) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isCentered ? "center" : "flex-start",
            gap: 6,
            marginTop: 2,
            whiteSpace: "nowrap",
          }}
        >
          {delta != null && (
            <span
              style={{
                fontSize: "var(--fs-xs)",
                fontWeight: 600,
                color: isNeg ? "var(--err)" : "var(--ok)",
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <span>{isNeg ? "↓" : "↑"}</span>
              <span>{delta}</span>
            </span>
          )}
          {sub && (
            <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)", whiteSpace: "nowrap" }}>
              <AdaptiveText text={sub} />
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function BadgeBlock({ b }: { b: any }) {
  const { interpolate } = useReactive();
  const text = interpolate(b.text || b.label || "");
  const color = interpolate(b.color || b.variant || "default");

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    default: { bg: "var(--surface-3)", text: "var(--text-dim)", border: "var(--line-soft)" },
    accent: { bg: "var(--accent-soft)", text: "var(--accent)", border: "transparent" },
    ok: { bg: "rgba(34,197,94,0.12)", text: "var(--ok)", border: "transparent" },
    warn: { bg: "rgba(245,158,11,0.12)", text: "var(--warn)", border: "transparent" },
    danger: { bg: "rgba(239,68,68,0.12)", text: "var(--err)", border: "transparent" },
    faint: { bg: "var(--surface-3)", text: "var(--text-faint)", border: "transparent" },
  };
  const c = colorMap[color] || colorMap.default;

  return (
    <span
      className="block-badge"
      style={{
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
      }}
    >
      {text}
    </span>
  );
}

function parseXmlAttrs(attrStr?: string): Record<string, any> {
  if (!attrStr) return {};
  const attrs: Record<string, any> = {};
  const re = /([a-zA-Z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;
  while ((match = re.exec(attrStr)) !== null) {
    const key = match[1];
    let val: any = match[2] ?? match[3] ?? match[4] ?? true;
    if (val === "true") val = true;
    else if (val === "false") val = false;
    else if (!isNaN(Number(val)) && typeof val === "string" && val.trim() !== "") val = Number(val);
    else if (typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
      try { val = JSON.parse(val); } catch {}
    }
    attrs[key] = val;
  }
  return attrs;
}

/* -------------------------------------------------- generative component */
export function ComponentBlock({ raw, attrs, open }: { raw: string; attrs?: string; open?: boolean }) {
  const data = useMemo(() => {
    const parsedAttrs = parseXmlAttrs(attrs);
    let clean = (raw || "").trim();
    if (clean.startsWith("```")) {
      clean = clean.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/, "").trim();
    }
    const fromJson = repairPartialJson(clean);

    const res = (fromJson && typeof fromJson === "object" && !Array.isArray(fromJson))
      ? { ...parsedAttrs, ...fromJson }
      : Array.isArray(fromJson)
      ? fromJson
      : Object.keys(parsedAttrs).length > 0
      ? parsedAttrs
      : fromJson;

    if (res && typeof res === "object" && !Array.isArray(res) && !res.type) {
      for (const k of [
        "card", "grid", "slider", "button", "checkbox", "dropdown", "switch",
        "input", "progress", "chart", "math", "chemistry", "badge", "text", "metric", "table"
      ]) {
        if (res[k] !== undefined) {
          res.type = k;
          break;
        }
      }
    }
    return res;
  }, [raw, attrs]);

  // When streaming and no data parsed yet, show calm minimal 1-line stream status
  if (open && !data) {
    return (
      <div
        className="component-block comp-streaming-in"
        style={{
          padding: "8px 12px",
          background: "var(--surface)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--r)",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          color: "var(--text-faint)",
          fontSize: "var(--fs-xs)",
        }}
      >
        <span className="spinner sm" style={{ width: 11, height: 11, borderWidth: 1.5 }} />
        <span>Streaming component...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="component-block" style={{ padding: "8px 12px", color: "var(--text-dim)", fontSize: "var(--fs-xs)" }}>
        {raw && raw.trim() ? raw : "Empty component"}
      </div>
    );
  }

  const streamCls = open ? "comp-streaming-in" : "";

  // If array of blocks
  if (Array.isArray(data)) {
    return (
      <ErrorBoundary name="Component group">
        <div className={`component-block ${streamCls}`} data-inline="true">
          <div className="component-body">
            {data.map((b, i) => <BlockR key={i} b={b} />)}
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  const compType = String(data.type || data.kind || "").toLowerCase();

  // 1. Organic chemistry SMILES molecular diagram
  if (compType === "chemistry" || compType === "molecule" || data.smiles || data.molecule) {
    return (
      <ErrorBoundary name="Chemistry diagram">
        <div className={`component-block ${streamCls}`} data-inline="true">
          <ChemistryBlock b={data} />
        </div>
      </ErrorBoundary>
    );
  }

  // 2. Math & Desmos 2D Function Visualizer
  if (compType === "math" || compType === "plot" || compType === "desmos" || data.fn || data.formula || data.equation) {
    return (
      <ErrorBoundary name="Math function plot">
        <div className={`component-block ${streamCls}`} data-inline="true">
          <MathPlotBlock b={data} />
        </div>
      </ErrorBoundary>
    );
  }

  const scopeId =
    data.id ||
    data.scope ||
    data.link ||
    data.target ||
    (data.attrs && (data.attrs.id || data.attrs.link)) ||
    "default";

  const wrapped = (
    <div className={`component-block ${streamCls}`} data-inline="true">
      <div className="component-body">
        <BlockR b={data} />
      </div>
    </div>
  );

  return (
    <ErrorBoundary name={data.type || "component"}>
      <ReactiveProvider
        scopeId={scopeId}
        initialState={data.state}
        tick={data.tick}
        onTick={data.onTick}
      >
        {wrapped}
      </ReactiveProvider>
    </ErrorBoundary>
  );
}

/* ------------------------------------------------------------- main renderer */
function BlockRouter({ b }: { b: CanvasBlock }) {
  const { interpolate } = useReactive();
  const bType = String(b.type || (b as any).kind || "").toLowerCase();

  switch (bType) {
    case "card":
    case "container":
    case "slide":
    case "box":
    case "section":
      return <CardBlock b={b} />;

    case "grid":
    case "columns":
    case "row":
    case "layout":
      return <GridBlock b={b} />;

    case "button_group":
    case "button-group":
    case "buttons":
      return <ButtonGroupBlock blocks={b.blocks || (b as any).items || []} />;

    case "text":
    case "markdown":
    case "heading":
    case "title":
      return <TextBlock b={b} />;

    case "metric":
    case "stat":
      return <MetricBlock b={b} />;

    case "metrics":
    case "stats":
      return (
        <div className="canvas-grid">
          {(b.items || (b as any).blocks || []).map((m: any, i: number) => (
            <MetricBlock key={i} b={typeof m === "object" ? m : { value: m }} />
          ))}
        </div>
      );

    case "badge":
    case "tag":
    case "pill":
      return <BadgeBlock b={b} />;

    case "button":
    case "btn":
      return <ButtonBlock b={b} />;

    case "slider":
      return <SliderBlock b={b} />;

    case "input":
    case "text-field":
      return <InputBlock b={b} />;

    case "dropdown":
    case "select":
      return <DropdownBlock b={b} />;

    case "switch":
    case "toggle":
      return <SwitchBlock b={b} />;

    case "checkbox":
    case "check":
      return <CheckboxBlock b={b} />;

    case "progress":
    case "meter":
      return <ProgressBlock b={b} />;

    case "divider":
    case "hr":
    case "separator":
      return <hr style={{ border: "none", borderTop: "1px solid var(--line-soft)", margin: "8px 0" }} />;

    case "chart":
      return (
        <div className="canvas-card">
          {b.title && <div className="metric-k" style={{ marginBottom: 4 }}>{interpolate(b.title)}</div>}
          <Chart b={b} />
          {b.caption && <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)", marginTop: 6 }}>{interpolate(b.caption)}</div>}
        </div>
      );

    case "table": return <DataTable b={b} />;
    case "tabs":
    case "switcher": return <TabsBlock b={b} />;

    case "chemistry":
    case "molecule": return <ChemistryBlock b={b} />;

    case "math":
    case "plot":
    case "desmos": return <MathPlotBlock b={b} />;

    case "question":
    case "ask": return <QuestionBlock b={b} />;

    case "followups":
    case "prompts": return <FollowupsBlock b={b} />;

    case "component": return <ComponentBlock raw={b.raw || (b as any).content || JSON.stringify(b)} attrs={(b as any).attrs} open={(b as any).open} />;

    /* ---------------- Composed Fallbacks for legacy widget requests ---------------- */
    case "stopwatch":
      return (
        <CardBlock
          b={{
            type: "card",
            shape: "circle",
            centered: true,
            title: b.label || "Stopwatch",
            borderProgress: "${(seconds % 60) * (100 / 60)}",
            progressColor: "var(--accent)",
            state: { seconds: 0, running: false },
            tick: 1000,
            onTick: "if (running) seconds++",
            blocks: [
              {
                type: "metric",
                centered: true,
                value: "${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}",
                sub: "${running ? 'Active' : seconds > 0 ? 'Paused' : 'Ready'}",
              },
              {
                type: "button_group",
                blocks: [
                  { type: "button", text: "${running ? 'Pause' : 'Start'}", variant: "primary", onClick: "running = !running" },
                  { type: "button", text: "Reset", variant: "secondary", onClick: "seconds = 0; running = false" },
                ],
              },
            ],
          }}
        />
      );

    case "timer": {
      const initialTimerSec = Number(b.seconds) || 300;
      return (
        <CardBlock
          b={{
            type: "card",
            shape: "circle",
            centered: true,
            title: b.label || "Timer",
            borderProgress: "${((total - left) / total) * 100}",
            progressColor: "var(--accent)",
            state: { total: initialTimerSec, left: initialTimerSec, running: false },
            tick: 1000,
            onTick: "if (running && left > 0) left--",
            blocks: [
              {
                type: "metric",
                centered: true,
                value: "${pad(Math.floor(left / 60))}:${pad(left % 60)}",
                sub: "${running ? 'Counting down' : left === 0 ? 'Completed' : 'Paused'}",
              },
              {
                type: "button_group",
                blocks: [
                  { type: "button", text: "${running ? 'Pause' : 'Start'}", variant: "primary", onClick: "running = !running" },
                  { type: "button", text: "Reset", variant: "secondary", onClick: `left = total; running = false` },
                ],
              },
            ],
          }}
        />
      );
    }

    case "pomodoro": {
      const workSec = Number(b.work) || 1500;
      const breakSec = Number(b.break) || 300;
      return (
        <CardBlock
          b={{
            type: "card",
            shape: "circle",
            centered: true,
            title: b.label || "Pomodoro",
            borderProgress: "${mode === 'work' ? ((work - left) / work) * 100 : ((brk - left) / brk) * 100}",
            progressColor: "${mode === 'work' ? 'var(--accent)' : 'var(--ok)'}",
            state: { work: workSec, brk: breakSec, left: workSec, running: false, mode: "work" },
            tick: 1000,
            onTick: `if (running && left > 0) left--; else if (running && left === 0) { mode = (mode === 'work' ? 'break' : 'work'); left = (mode === 'work' ? work : brk); }`,
            blocks: [
              {
                type: "metric",
                centered: true,
                value: "${pad(Math.floor(left / 60))}:${pad(left % 60)}",
                sub: "${mode === 'work' ? (running ? 'Focus' : 'Focus (Paused)') : (running ? 'Break' : 'Break (Paused)')}",
              },
              {
                type: "button_group",
                blocks: [
                  { type: "button", text: "${running ? 'Pause' : 'Start'}", variant: "primary", onClick: "running = !running" },
                  { type: "button", text: "Reset", variant: "secondary", onClick: `left = work; running = false; mode = 'work'` },
                ],
              },
            ],
          }}
        />
      );
    }

    case "weather":
      return (
        <CardBlock
          b={{
            type: "card",
            title: b.city || b.location || "Weather Forecast",
            subtitle: b.condition || "Partly Cloudy",
            blocks: [
              {
                type: "grid",
                cols: 3,
                blocks: [
                  { type: "metric", label: "Temperature", value: b.temp || "72°F", delta: b.delta },
                  { type: "metric", label: "Humidity", value: b.humidity || "45%" },
                  { type: "metric", label: "Wind", value: b.wind || "8 mph" },
                ],
              },
            ],
          }}
        />
      );

    case "clock":
      return (
        <CardBlock
          b={{
            type: "card",
            title: b.label || "System Clock",
            state: { time: new Date().toLocaleTimeString() },
            tick: 1000,
            onTick: "time = new Date().toLocaleTimeString()",
            blocks: [
              { type: "metric", label: "Current Time", value: "${time}" },
            ],
          }}
        />
      );

    case "reactive":
    case "calculator":
    case "simulator":
      return (
        <CardBlock
          b={{
            type: "card",
            title: b.title || "Interactive Scenario Simulator",
            state: b.state || b.variables || {},
            blocks: b.blocks || b.children || b.controls || [],
          }}
        />
      );

    case "callout":
    case "alert": return <Callout b={b} />;
    case "accordion": return <Accordion b={b} />;
    case "list":
      return b.ordered
        ? <ol className="md-list md-ol">{(b.items || []).map((x: unknown, i: number) => <li className="md-li" key={i}>{String(x)}</li>)}</ol>
        : <ul className="md-list md-ul">{(b.items || []).map((x: unknown, i: number) => <li className="md-li" key={i}>{String(x)}</li>)}</ul>;
    case "kv":
      return (
        <div className="canvas-card" style={{ gap: 8 }}>
          {(b.items || []).map((it: any, i: number) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: "var(--fs-sm)" }}>
              <span style={{ color: "var(--text-faint)" }}>{it.k}</span>
              <span style={{ fontWeight: 500 }}>{it.v}</span>
            </div>
          ))}
        </div>
      );
    case "todo": return <TodoList b={b} />;
    case "image":
      return (
        <figure style={{ margin: 0 }}>
          <img className="md-img" src={b.src || b.url} alt={b.caption || b.alt || ""} />
          {b.caption && <figcaption className="md-figcap">{b.caption}</figcaption>}
        </figure>
      );
    case "video":
      return (
        <div className="md-embed">
          <iframe src={`https://www.youtube-nocookie.com/embed/${b.youtube}`} allowFullScreen title="video" />
        </div>
      );
    case "code": return <Markdown text={"```" + (b.language || "") + "\n" + (b.content || "") + "\n```"} animate={false} />;

    default:
      if (Array.isArray((b as any).blocks) || Array.isArray((b as any).children)) {
        return <CardBlock b={b} />;
      }
      return null;
  }
}

export function BlockR({ b }: { b: CanvasBlock }) {
  if (!b) return null;
  return (
    <ErrorBoundary name={b.type || "block"}>
      <BlockRouter b={b} />
    </ErrorBoundary>
  );
}

/** Repair streaming partial JSON so UI can stream live into the canvas. */
export function repairPartialJson(raw: string): any {
  let s = raw.trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch {}

  let inString = false;
  let escape = false;
  const stack: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === "{") stack.push("}");
      else if (ch === "[") stack.push("]");
      else if (ch === "}" || ch === "]") stack.pop();
    }
  }
  if (inString) s += '"';
  s = s.replace(/,\s*([}\]]|$)/g, "$1");
  while (stack.length > 0) s += stack.pop();

  try { return JSON.parse(s); } catch { return null; }
}

/** Parse a `*.ui.json` file body into blocks with partial JSON repair and reactive state. */
export function readUiFile(content: string): {
  blocks: CanvasBlock[];
  title?: string;
  state?: Record<string, any>;
  tick?: number;
  onTick?: string;
  error?: string;
} {
  try {
    const j = JSON.parse(content);
    const blocks: CanvasBlock[] = Array.isArray(j) ? j : j.blocks || (j.type ? [j] : []);
    return {
      blocks,
      title: Array.isArray(j) ? undefined : j.title,
      state: Array.isArray(j) ? undefined : j.state,
      tick: Array.isArray(j) ? undefined : j.tick,
      onTick: Array.isArray(j) ? undefined : j.onTick,
    };
  } catch (e: any) {
    const repaired = repairPartialJson(content);
    if (repaired) {
      const blocks: CanvasBlock[] = Array.isArray(repaired) ? repaired : repaired.blocks || (repaired.type ? [repaired] : []);
      return {
        blocks,
        title: Array.isArray(repaired) ? undefined : repaired.title,
        state: Array.isArray(repaired) ? undefined : repaired.state,
        tick: Array.isArray(repaired) ? undefined : repaired.tick,
        onTick: Array.isArray(repaired) ? undefined : repaired.onTick,
      };
    }
    return { blocks: [], error: e.message };
  }
}

export function BlocksView({ content }: { content: string }) {
  const { blocks, title, state, tick, onTick, error } = useMemo(() => readUiFile(content), [content]);
  if (error && !blocks.length) {
    return (
      <div className="fe-preview">
        <div style={{ color: "var(--err)", fontSize: "var(--fs-sm)", marginBottom: 12 }}>invalid JSON — {error}</div>
        <Markdown text={"```json\n" + content + "\n```"} animate={false} />
      </div>
    );
  }
  return (
    <ReactiveProvider initialState={state} tick={tick} onTick={onTick}>
      <div className="canvas-inner" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {title && (
          <h1 style={{ fontSize: "1.25rem", fontWeight: 650, color: "var(--text)", margin: "4px 0 8px" }}>
            {title}
          </h1>
        )}
        {blocks.map((b, i) => <BlockR key={i} b={b} />)}
        {!blocks.length && <div className="empty-hint">no blocks</div>}
      </div>
    </ReactiveProvider>
  );
}
