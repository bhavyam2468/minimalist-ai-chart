import { useState, useMemo, useEffect } from "react";
import { Markdown } from "../md/Markdown";
import { useApp } from "../lib/store";
import { send } from "../lib/agent";
import { I } from "../ui/Icons";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { ChemistryBlock } from "./ChemistryBlock";
import { MathPlotBlock } from "./MathPlotBlock";
import type { CanvasBlock } from "../lib/types";

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
function normalizeChartData(b: any): {
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
    if (Array.isArray(d)) return { label: String(d[0] ?? idx + 1), value: Number(d[1] ?? 0) };
    return {
      label: String(d.label ?? d.name ?? d.x ?? d.time ?? d.category ?? `Item ${idx + 1}`),
      value: Number(d.value ?? d.y ?? d.val ?? d.count ?? 0),
    };
  });

  const series: { name: string; points: { x: any; y: number }[] }[] = Array.isArray(b.series)
    ? b.series.map((s: any, sIdx: number) => ({
        name: s.name || s.title || `Series ${sIdx + 1}`,
        points: (s.points || s.data || []).map((p: any, pIdx: number) => {
          if (typeof p === "number") return { x: pIdx + 1, y: p };
          if (Array.isArray(p)) return { x: p[0] ?? pIdx + 1, y: Number(p[1] ?? 0) };
          return {
            x: p.x ?? p.label ?? p.name ?? p.time ?? pIdx + 1,
            y: Number(p.y ?? p.value ?? p.val ?? 0),
          };
        }),
      }))
    : [];

  return { kind, data, series, raw: b };
}

function Chart({ b }: { b: CanvasBlock }) {
  const norm = normalizeChartData(b);
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
          <text x={cx} y={cy - 2} textAnchor="middle" fill="var(--text)" fontSize="26" fontWeight="600" fontVariantNumeric="tabular-nums">
            {fmt(clamped)}{unit}
          </text>
          <text x={cx} y={cy + 18} textAnchor="middle" fill="var(--text-faint)" fontSize="11" letterSpacing="0.04em" textTransform="uppercase">
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
              <div style={{ height: 20, background: "var(--surface-3)", borderRadius: "var(--r-xs)", overflow: "hidden", display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    width: `${widthPct}%`,
                    height: "100%",
                    background: col,
                    borderRadius: "var(--r-xs)",
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
function Slider({ b }: { b: CanvasBlock }) {
  const min = Number(b.min ?? 0);
  const max = Number(b.max ?? 100);
  const step = Number(b.step ?? 1);
  const [val, setVal] = useState(Number(b.value ?? min));

  return (
    <div className="canvas-card" style={{ gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-sm)" }}>
        <span className="metric-k">{b.label}</span>
        <b style={{ fontVariantNumeric: "tabular-nums" }}>{val}{b.unit ? ` ${b.unit}` : ""}</b>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        onChange={(e) => setVal(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--accent)" }}
      />
    </div>
  );
}

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

/* ------------------------------------------------------------- interactive timers */
function Pomodoro({ label, work = 1500, breakFor = 300 }: { label: string; work?: number; breakFor?: number }) {
  const [left, setLeft] = useState(work);
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [run, setRun] = useState(false);
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
          <circle
            cx={64}
            cy={64}
            r={R}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct / 100)}
            transform="rotate(-90 64 64)"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
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

/* -------------------------------------------------------- question block */
export function QuestionBlock({ b }: { b: CanvasBlock }) {
  const q = b.question || b.title || "Select an option:";
  const rawOptions = b.options || b.items || [];
  const options: { id: string; label: string; description?: string }[] = rawOptions.map((o: any, i: number) =>
    typeof o === "string" ? { id: String(i), label: o } : { id: o.id || String(i), label: o.label || o.title || String(o), description: o.description }
  );
  const allowCustom = b.allowCustom !== false;
  const showSkip = b.skipButton !== false && b.skip !== false;

  const [selected, setSelected] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customVal, setCustomVal] = useState("");
  const [answered, setAnswered] = useState<string | null>(null);

  const handleSelect = (opt: { id: string; label: string }) => {
    setSelected(opt.id);
    setAnswered(opt.label);
    const activeId = useApp.getState().activeId;
    if (activeId) {
      send(activeId, opt.label, []);
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
            {showSkip && (
              <button className="comp-action-btn skip" onClick={handleSkip}>
                Skip
              </button>
            )}
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

    if (fromJson && typeof fromJson === "object" && !Array.isArray(fromJson)) {
      return { ...parsedAttrs, ...fromJson };
    }
    if (Array.isArray(fromJson)) {
      return fromJson;
    }
    if (Object.keys(parsedAttrs).length > 0) {
      if (clean && !parsedAttrs.text && !parsedAttrs.content && !parsedAttrs.smiles && !parsedAttrs.fn) {
        parsedAttrs.text = clean;
      }
      return parsedAttrs;
    }
    return fromJson;
  }, [raw, attrs]);

  if (!data && open) {
    return (
      <div className="component-block" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, color: "var(--text-faint)", fontSize: "var(--fs-xs)" }}>
        <span className="spinner sm" />
        <span>Rendering component...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="component-block" style={{ padding: "10px 14px", color: "var(--text-dim)", fontSize: "var(--fs-xs)" }}>
        {raw && raw.trim() ? raw : "Empty component"}
      </div>
    );
  }

  if (Array.isArray(data)) {
    return (
      <ErrorBoundary name="Component group">
        <div className="component-block" data-inline="true">
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
        <div className="component-block" data-inline="true">
          <ChemistryBlock b={data} />
        </div>
      </ErrorBoundary>
    );
  }

  // 2. Math & Desmos 2D Function Visualizer
  if (compType === "math" || compType === "plot" || compType === "desmos" || data.fn || data.formula || data.equation) {
    return (
      <ErrorBoundary name="Math function plot">
        <div className="component-block" data-inline="true">
          <MathPlotBlock b={data} />
        </div>
      </ErrorBoundary>
    );
  }

  if (data.type) {
    return (
      <ErrorBoundary name={data.type}>
        <div className="component-block" data-inline="true">
          <div className="component-body">
            <BlockR b={data} />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary name="Dashboard component">
      <div className="component-block">
        {data.title && (
          <div className="component-header">
            <span className="component-title">
              <span style={{ color: "var(--accent)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="12" width="4" height="8" rx="1" /><rect x="10" y="6" width="4" height="14" rx="1" /><rect x="17" y="3" width="4" height="17" rx="1" /></svg>
              </span>
              <span>{data.title}</span>
            </span>
          </div>
        )}
        <div className="component-body">
          {data.reference && (
            <BlockR b={{ type: "callout", tone: "info", title: data.reference.title || "Reference", text: data.reference.text || data.reference }} />
          )}
          {data.callout && (
            <BlockR b={{ type: "callout", ...data.callout }} />
          )}
          {data.metrics && (
            <BlockR b={{ type: "metrics", items: data.metrics }} />
          )}
          {data.switcher && (
            <BlockR b={{ type: "tabs", ...(typeof data.switcher === "object" ? data.switcher : {}) }} />
          )}
          {data.chart && (
            <BlockR b={{ type: "chart", ...data.chart }} />
          )}
          {data.chemistry && (
            <ChemistryBlock b={data.chemistry} />
          )}
          {data.math && (
            <MathPlotBlock b={data.math} />
          )}
          {data.question && (
            <BlockR b={{ type: "question", ...data.question }} />
          )}
          {data.followups && (
            <BlockR b={{ type: "followups", prompts: data.followups }} />
          )}
          {data.prompts && (
            <BlockR b={{ type: "followups", prompts: data.prompts }} />
          )}
          {Array.isArray(data.blocks) && data.blocks.map((b: any, i: number) => (
            <BlockR key={i} b={b} />
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}

/* ------------------------------------------------------------- main renderer */
function BlockRouter({ b }: { b: CanvasBlock }) {
  switch (b.type) {
    case "heading": {
      const H = (`h${Math.min(b.level || 2, 4)}`) as any;
      return <H className={`md-h md-h${b.level || 2}`} style={{ margin: "2px 0 4px 0" }}>{b.text}</H>;
    }
    case "text": return <Markdown text={b.text || ""} animate={false} />;
    case "markdown": return <Markdown text={b.content || ""} animate={false} />;
    case "question":
    case "ask": return <QuestionBlock b={b} />;
    case "followups":
    case "prompts": return <FollowupsBlock b={b} />;
    case "switcher": return <TabsBlock b={b} />;
    case "chemistry":
    case "molecule": return <ChemistryBlock b={b} />;
    case "math":
    case "plot":
    case "desmos": return <MathPlotBlock b={b} />;
    case "component": return <ComponentBlock raw={b.raw || b.content || JSON.stringify(b)} attrs={b.attrs} open={b.open} />;
    case "metric":
      return (
        <div className="canvas-card">
          <div className="metric-k">{b.label}</div>
          <div className="metric-v">{b.value}</div>
          {b.delta != null && (
            <div
              style={{
                fontSize: "var(--fs-xs)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: String(b.delta).trim().startsWith("-") ? "var(--err)" : "var(--ok)",
                fontWeight: 600,
              }}
            >
              <span>{String(b.delta).trim().startsWith("-") ? "↓" : "↑"}</span>
              <span>{b.delta}</span>
            </div>
          )}
          {b.hint && <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)" }}>{b.hint}</div>}
        </div>
      );
    case "metrics":
      return (
        <div className="canvas-grid">
          {(b.items || []).map((m: any, i: number) => (
            <BlockR key={i} b={{ type: "metric", ...m }} />
          ))}
        </div>
      );
    case "chart":
      return (
        <div className="canvas-card">
          {b.title && <div className="metric-k" style={{ marginBottom: 4 }}>{b.title}</div>}
          <Chart b={b} />
          {b.caption && <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)", marginTop: 6 }}>{b.caption}</div>}
        </div>
      );
    case "table": return <DataTable b={b} />;
    case "tabs": return <TabsBlock b={b} />;
    case "slider": return <Slider b={b} />;
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
    case "progress":
      return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-sm)", color: "var(--text-dim)", marginBottom: 5 }}>
            <span>{b.label}</span><span>{b.value}%</span>
          </div>
          <div style={{ height: 7, background: "var(--surface-3)", borderRadius: 4, overflow: "hidden" }}>
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
    case "button":
      return <button className="btn primary" style={{ width: "fit-content" }}>{b.label}</button>;
    case "timer": return <Timer label={b.label || "Timer"} seconds={b.seconds || 300} />;
    case "stopwatch": return <Stopwatch label={b.label || "Stopwatch"} />;
    case "pomodoro": return <Pomodoro label={b.label || "Pomodoro"} work={b.work || 1500} breakFor={b.breakFor || 300} />;
    case "counter": return <Counter b={b} />;
    case "todo": return <TodoList b={b} />;
    case "image":
      return (
        <figure style={{ margin: 0 }}>
          <img className="md-img" src={b.src} alt={b.caption || ""} />
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
    case "divider": return <hr className="md-hr" />;
    case "grid":
      return (
        <div className="canvas-grid">
          {(b.of || []).map((x: CanvasBlock, i: number) => <BlockR key={i} b={x} />)}
        </div>
      );
    case "note": return <div className="metric-k" style={{ lineHeight: 1.5 }}>{b.text}</div>;
    case "columns":
      return (
        <div style={{ display: "grid", gap: "var(--sp-4)", gridTemplateColumns: `repeat(${(b.of || []).length || 1}, 1fr)` }}>
          {(b.of || []).map((col: CanvasBlock[], i: number) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
              {col.map((x: CanvasBlock, j: number) => <BlockR key={j} b={x} />)}
            </div>
          ))}
        </div>
      );
    default: return null;
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

/** Parse a `*.ui.json` file body into blocks with partial JSON repair. */
export function readUiFile(content: string): { blocks: CanvasBlock[]; title?: string; error?: string } {
  try {
    const j = JSON.parse(content);
    const blocks: CanvasBlock[] = Array.isArray(j) ? j : j.blocks || [];
    return { blocks, title: Array.isArray(j) ? undefined : j.title };
  } catch (e: any) {
    const repaired = repairPartialJson(content);
    if (repaired) {
      const blocks: CanvasBlock[] = Array.isArray(repaired) ? repaired : repaired.blocks || [];
      return { blocks, title: Array.isArray(repaired) ? undefined : repaired.title };
    }
    return { blocks: [], error: e.message };
  }
}

export function BlocksView({ content }: { content: string }) {
  const { blocks, error } = useMemo(() => readUiFile(content), [content]);
  if (error && !blocks.length) {
    return (
      <div className="fe-preview">
        <div style={{ color: "var(--err)", fontSize: "var(--fs-sm)", marginBottom: 12 }}>invalid JSON — {error}</div>
        <Markdown text={"```json\n" + content + "\n```"} animate={false} />
      </div>
    );
  }
  return (
    <div className="canvas-inner" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {blocks.map((b, i) => <BlockR key={i} b={b} />)}
      {!blocks.length && <div className="empty-hint">no blocks</div>}
    </div>
  );
}
