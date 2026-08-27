import React, { useState, useMemo, useRef, useCallback } from "react";

interface MathPlotProps {
  fn?: string;
  functions?: (string | { expr: string; label?: string; color?: string })[];
  expr?: string;
  formula?: string;
  equation?: string;
  desmos?: string;
  title?: string;
  caption?: string;
  xmin?: number;
  xmax?: number;
  ymin?: number;
  ymax?: number;
}

const MATH_PALETTE = [
  "var(--accent, #d7b28c)",
  "#60a5fa",
  "#34d399",
  "#f472b6",
  "#fbbf24",
  "#a78bfa",
];

function compileMathExpr(expr: string): ((x: number) => number) | null {
  try {
    let clean = expr.trim();
    clean = clean.replace(/^(?:f\(x\)|y)\s*=\s*/i, "");
    clean = clean
      .replace(/\^/g, "**")
      .replace(/\bpi\b/gi, "Math.PI")
      .replace(/\be\b/g, "Math.E")
      .replace(/\bsin\b/gi, "Math.sin")
      .replace(/\bcos\b/gi, "Math.cos")
      .replace(/\btan\b/gi, "Math.tan")
      .replace(/\bsqrt\b/gi, "Math.sqrt")
      .replace(/\babs\b/gi, "Math.abs")
      .replace(/\bexp\b/gi, "Math.exp")
      .replace(/\bln\b/gi, "Math.log")
      .replace(/\blog\b/gi, "Math.log10")
      .replace(/\basin\b/gi, "Math.asin")
      .replace(/\bacos\b/gi, "Math.acos")
      .replace(/\batan\b/gi, "Math.atan")
      .replace(/(\d+)\s*([a-zA-Z(])/g, "$1 * $2");

    const fn = new Function("x", `"use strict"; return (${clean});`) as (x: number) => number;
    const testVal = fn(1);
    if (typeof testVal !== "number" || isNaN(testVal)) {
      // test with 0 or 2 in case of singularity at 1
      const testVal2 = fn(2);
      if (typeof testVal2 !== "number" || isNaN(testVal2)) return null;
    }
    return fn;
  } catch {
    return null;
  }
}

export function MathPlotBlock({ b }: { b: MathPlotProps | any }) {
  // If Desmos iframe URL is specified:
  const desmosUrl = b.desmos || (typeof b.url === "string" && b.url.includes("desmos.com") ? b.url : null);
  if (desmosUrl) {
    const embedSrc = desmosUrl.includes("embed") ? desmosUrl : `${desmosUrl.replace(/\/$/, "")}?embed`;
    return (
      <div className="canvas-card" style={{ gap: 8 }}>
        {b.title && <div className="metric-k">{b.title}</div>}
        <div style={{ width: "100%", height: 320, borderRadius: "var(--r-sm)", overflow: "hidden", border: "1px solid var(--line-soft)" }}>
          <iframe
            src={embedSrc}
            width="100%"
            height="100%"
            style={{ border: "none" }}
            title={b.title || "Desmos Calculator"}
          />
        </div>
        {b.caption && <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)" }}>{b.caption}</div>}
      </div>
    );
  }

  // Parse input functions
  const funcs = useMemo(() => {
    const rawList: (string | { expr: string; label?: string; color?: string })[] = [];
    if (Array.isArray(b.functions)) {
      rawList.push(...b.functions);
    } else if (b.fn || b.expr || b.formula || b.equation) {
      rawList.push(b.fn || b.expr || b.formula || b.equation);
    } else {
      rawList.push("sin(x)");
    }

    return rawList.map((item, idx) => {
      const exprStr = typeof item === "string" ? item : item.expr || "x";
      const label = typeof item === "object" && item.label ? item.label : exprStr;
      const color = typeof item === "object" && item.color ? item.color : MATH_PALETTE[idx % MATH_PALETTE.length];
      const fn = compileMathExpr(exprStr);
      return { expr: exprStr, label, color, fn };
    });
  }, [b]);

  // Viewport bounds with pan & zoom state
  const [domain, setDomain] = useState<{ xmin: number; xmax: number; ymin: number; ymax: number }>(() => ({
    xmin: b.xmin ?? -8,
    xmax: b.xmax ?? 8,
    ymin: b.ymin ?? -5,
    ymax: b.ymax ?? 5,
  }));

  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number; px: number; py: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; origDomain: typeof domain }>({
    dragging: false,
    startX: 0,
    startY: 0,
    origDomain: domain,
  });

  const W = 460;
  const H = 280;

  const toPxX = useCallback((x: number) => ((x - domain.xmin) / (domain.xmax - domain.xmin)) * W, [domain.xmin, domain.xmax]);
  const toPxY = useCallback((y: number) => H - ((y - domain.ymin) / (domain.ymax - domain.ymin)) * H, [domain.ymin, domain.ymax]);
  const toMathX = useCallback((px: number) => domain.xmin + (px / W) * (domain.xmax - domain.xmin), [domain.xmin, domain.xmax]);
  const toMathY = useCallback((py: number) => domain.ymin + ((H - py) / H) * (domain.ymax - domain.ymin), [domain.ymin, domain.ymax]);

  // Pan controls
  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origDomain: { ...domain },
    };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dragRef.current.dragging) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const orig = dragRef.current.origDomain;
      const mathDx = (dx / W) * (orig.xmax - orig.xmin);
      const mathDy = (dy / H) * (orig.ymax - orig.ymin);
      setDomain({
        xmin: orig.xmin - mathDx,
        xmax: orig.xmax - mathDx,
        ymin: orig.ymin + mathDy,
        ymax: orig.ymax + mathDy,
      });
      return;
    }

    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = Math.max(0, Math.min(W, ((e.clientX - rect.left) / rect.width) * W));
    const mx = toMathX(px);
    const primaryFn = funcs[0]?.fn;
    if (primaryFn) {
      const my = primaryFn(mx);
      if (typeof my === "number" && !isNaN(my) && isFinite(my)) {
        setHoverCoord({ x: mx, y: my, px, py: toPxY(my) });
        return;
      }
    }
    setHoverCoord(null);
  };

  const handleMouseUp = () => {
    dragRef.current.dragging = false;
  };

  // Zoom controls
  const handleZoom = (factor: number) => {
    const cx = (domain.xmin + domain.xmax) / 2;
    const cy = (domain.ymin + domain.ymax) / 2;
    const halfW = ((domain.xmax - domain.xmin) / 2) * factor;
    const halfH = ((domain.ymax - domain.ymin) / 2) * factor;
    setDomain({
      xmin: cx - halfW,
      xmax: cx + halfW,
      ymin: cy - halfH,
      ymax: cy + halfH,
    });
  };

  const handleReset = () => {
    setDomain({
      xmin: b.xmin ?? -8,
      xmax: b.xmax ?? 8,
      ymin: b.ymin ?? -5,
      ymax: b.ymax ?? 5,
    });
  };

  // Grid lines & ticks
  const xSpan = domain.xmax - domain.xmin;
  const rawStepX = Math.pow(10, Math.floor(Math.log10(xSpan / 6)));
  const stepX = xSpan / rawStepX > 12 ? rawStepX * 2 : rawStepX;

  const ySpan = domain.ymax - domain.ymin;
  const rawStepY = Math.pow(10, Math.floor(Math.log10(ySpan / 5)));
  const stepY = ySpan / rawStepY > 10 ? rawStepY * 2 : rawStepY;

  const xTicks: number[] = [];
  const startX = Math.ceil(domain.xmin / stepX) * stepX;
  for (let x = startX; x <= domain.xmax; x += stepX) {
    xTicks.push(Number(x.toFixed(4)));
  }

  const yTicks: number[] = [];
  const startY = Math.ceil(domain.ymin / stepY) * stepY;
  for (let y = startY; y <= domain.ymax; y += stepY) {
    yTicks.push(Number(y.toFixed(4)));
  }

  const originX = toPxX(0);
  const originY = toPxY(0);

  // Generate SVG curve paths for each function
  const paths = useMemo(() => {
    const numSamples = 240;
    return funcs.map((fItem) => {
      if (!fItem.fn) return "";
      let d = "";
      let prevValid = false;

      for (let i = 0; i <= numSamples; i++) {
        const px = (i / numSamples) * W;
        const x = toMathX(px);
        try {
          const y = fItem.fn(x);
          if (typeof y !== "number" || isNaN(y) || !isFinite(y) || Math.abs(y) > 1000) {
            prevValid = false;
            continue;
          }
          const py = toPxY(y);
          if (py < -H || py > H * 2) {
            prevValid = false;
            continue;
          }

          if (!prevValid) {
            d += ` M ${px.toFixed(1)} ${py.toFixed(1)}`;
            prevValid = true;
          } else {
            d += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
          }
        } catch {
          prevValid = false;
        }
      }
      return d;
    });
  }, [funcs, toMathX, toPxY]);

  return (
    <div className="canvas-card math-plot-card" style={{ gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "var(--accent)", display: "inline-flex", alignItems: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" />
              <path d="M7 16c2-8 4-8 6 0s4 8 6 0" />
            </svg>
          </span>
          <span style={{ fontWeight: 550, fontSize: "var(--fs-xs)", color: "var(--text)" }}>
            {b.title || "Function Plot"}
          </span>
        </div>

        {/* Zoom & Reset Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            type="button"
            className="comp-action-btn"
            onClick={() => handleZoom(0.7)}
            title="Zoom in"
            style={{ width: 22, height: 22, padding: 0, display: "grid", placeItems: "center" }}
          >
            +
          </button>
          <button
            type="button"
            className="comp-action-btn"
            onClick={() => handleZoom(1.4)}
            title="Zoom out"
            style={{ width: 22, height: 22, padding: 0, display: "grid", placeItems: "center" }}
          >
            −
          </button>
          <button
            type="button"
            className="comp-action-btn"
            onClick={handleReset}
            title="Reset view"
            style={{ height: 22, padding: "0 6px", fontSize: 11 }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Function Legend */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "2px 0" }}>
        {funcs.map((fItem, idx) => (
          <span
            key={idx}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontFamily: "var(--mono)",
              color: "var(--text-dim)",
              background: "var(--surface)",
              border: "1px solid var(--line-soft)",
              borderRadius: "var(--r-xs)",
              padding: "2px 6px",
            }}
          >
            <span style={{ width: 8, height: 2.5, borderRadius: 1, background: fItem.color }} />
            <span>f(x) = {fItem.label}</span>
          </span>
        ))}
      </div>

      {/* Coordinate Canvas */}
      <div style={{ position: "relative", width: "100%", background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-sm)", overflow: "hidden" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: "auto", display: "block", cursor: "crosshair", userSelect: "none" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            dragRef.current.dragging = false;
            setHoverCoord(null);
          }}
        >
          {/* Subtle Grid Lines */}
          <g opacity="0.35">
            {xTicks.map((x, i) => (
              <line
                key={`grid-x-${i}`}
                x1={toPxX(x)}
                x2={toPxX(x)}
                y1={0}
                y2={H}
                stroke="var(--line)"
                strokeWidth="0.8"
                strokeDasharray="2 3"
              />
            ))}
            {yTicks.map((y, i) => (
              <line
                key={`grid-y-${i}`}
                x1={0}
                x2={W}
                y1={toPxY(y)}
                y2={toPxY(y)}
                stroke="var(--line)"
                strokeWidth="0.8"
                strokeDasharray="2 3"
              />
            ))}
          </g>

          {/* Major Axes */}
          <line
            x1={0}
            x2={W}
            y1={Math.max(0, Math.min(H, originY))}
            y2={Math.max(0, Math.min(H, originY))}
            stroke="var(--line-strong, rgba(255,255,255,0.25))"
            strokeWidth="1.2"
          />
          <line
            x1={Math.max(0, Math.min(W, originX))}
            x2={Math.max(0, Math.min(W, originX))}
            y1={0}
            y2={H}
            stroke="var(--line-strong, rgba(255,255,255,0.25))"
            strokeWidth="1.2"
          />

          {/* Tick Labels */}
          <g fontSize="9" fill="var(--text-faint)" fontFamily="var(--mono)">
            {xTicks.map((x, i) => {
              if (Math.abs(x) < 0.0001) return null;
              const px = toPxX(x);
              return (
                <text
                  key={`tx-${i}`}
                  x={px}
                  y={Math.min(H - 4, Math.max(14, originY + 12))}
                  textAnchor="middle"
                >
                  {x}
                </text>
              );
            })}
            {yTicks.map((y, i) => {
              if (Math.abs(y) < 0.0001) return null;
              const py = toPxY(y);
              return (
                <text
                  key={`ty-${i}`}
                  x={Math.min(W - 6, Math.max(18, originX - 6))}
                  y={py + 3}
                  textAnchor="end"
                >
                  {y}
                </text>
              );
            })}
          </g>

          {/* Function Curves */}
          {paths.map((d, idx) => (
            <path
              key={idx}
              d={d}
              fill="none"
              stroke={funcs[idx]?.color || "var(--accent)"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Hover Crosshair and Dot */}
          {hoverCoord && (
            <g>
              <line
                x1={hoverCoord.px}
                x2={hoverCoord.px}
                y1={0}
                y2={H}
                stroke="var(--line-strong, rgba(255,255,255,0.22))"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <line
                x1={0}
                x2={W}
                y1={hoverCoord.py}
                y2={hoverCoord.py}
                stroke="var(--line-strong, rgba(255,255,255,0.22))"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {/* Steady Focal Dot with calm ring — NO infinite pulse loop */}
              <circle cx={hoverCoord.px} cy={hoverCoord.py} r={6} fill={funcs[0]?.color || "var(--accent)"} opacity="0.2" />
              <circle
                cx={hoverCoord.px}
                cy={hoverCoord.py}
                r={3.5}
                fill={funcs[0]?.color || "var(--accent)"}
                stroke="var(--surface)"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Hover Coordinate Badge */}
        {hoverCoord && (
          <div
            style={{
              position: "absolute",
              top: Math.max(8, Math.min(H - 34, hoverCoord.py - 28)),
              left: Math.max(8, Math.min(W - 110, hoverCoord.px + 10)),
              background: "var(--surface-3)",
              border: "1px solid var(--line-soft)",
              borderRadius: "var(--r-xs)",
              padding: "2px 6px",
              fontSize: 10.5,
              fontFamily: "var(--mono)",
              color: "var(--text)",
              pointerEvents: "none",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>x: {hoverCoord.x.toFixed(2)}</span>
            <span style={{ color: "var(--text-faint)" }}>·</span>
            <span>y: {hoverCoord.y.toFixed(2)}</span>
          </div>
        )}
      </div>

      {b.caption && (
        <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)", lineHeight: 1.4 }}>
          {b.caption}
        </div>
      )}
    </div>
  );
}
