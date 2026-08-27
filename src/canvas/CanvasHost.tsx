import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useApp, type CanvasRect } from "../lib/store";
import { I } from "../ui/Icons";
import { hostOf } from "../lib/web";
import { FileEditor } from "./FileEditor";
import { WebViewer } from "./WebViewer";
import { ProjectView } from "./ProjectView";
import { VIEW_LABEL, viewOf, viewSize } from "./view";
import { copyToClipboard } from "../lib/clipboard";
import type { CanvasTarget } from "../lib/types";

/* ===========================================================================
   CanvasHost — the universal floating viewport.

   It holds anything that is not chat: a workspace file (which adapts to its
   type), a web page, or an *artefact* — which is nothing more than a saved
   reference to one of those. It slides in sized to its content, and can be
   dragged and resized from any edge or corner. On narrow screens it becomes a
   bottom sheet with a grab-handle.
   ========================================================================= */

const MIN_W = 320;
const MIN_H = 220;
const PAD = 12;

type Dir = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const isVideo = (u = "") => /youtu\.be|youtube\.com|vimeo\.com|\.mp4($|\?)/i.test(u);

/** Resolve an artefact reference into the concrete thing to display. */
function resolveTarget(chat: any, target: CanvasTarget): { title: string; badge: string; path?: string; url?: string } {
  if (target.kind === "artifact") {
    const a = chat?.artifacts?.[target.id];
    if (!a) return { title: "artifact not found", badge: "—", path: undefined, url: undefined };
    if (a.kind === "url") return { title: a.title, badge: isVideo(a.ref) ? "video" : "site", url: a.ref, path: undefined };
    const f = chat?.files?.[a.ref];
    if (!f) return { title: a.title, badge: "missing file", path: a.ref, url: undefined };
    return { title: a.title, badge: VIEW_LABEL[viewOf(a.ref, f)], path: a.ref, url: undefined };
  }
  if (target.kind === "file") {
    const f = chat?.files?.[target.path];
    return { title: target.path, badge: VIEW_LABEL[viewOf(target.path, f)], path: target.path, url: undefined };
  }
  return { title: target.title || hostOf(target.url), badge: isVideo(target.url) ? "video" : "site", url: target.url, path: undefined };
}

function preferred(res: { path?: string; url?: string }, file?: any): { w: number; h: number } {
  const vw = window.innerWidth, vh = window.innerHeight;
  const capW = Math.min(vw - PAD * 2, 1220);
  const capH = vh - PAD * 2;
  const clamp = (w: number, h: number) => ({ w: Math.min(w, capW), h: Math.min(h, capH) });

  if (res.url && !file) {
    if (isVideo(res.url)) { const w = Math.min(900, capW); return { w, h: Math.min(Math.round((w - 24) * 9 / 16) + 92, capH) }; }
    return clamp(900, Math.min(820, capH));
  }
  const v = viewOf(res.path || "", file);
  if (v === "image") return clamp(740, Math.round(vh * 0.8));
  if (v === "project") return clamp(940, Math.round(vh * 0.86));
  const { w, h } = viewSize(v);
  return clamp(w, h);
}

/* ================================================================== host */
export function CanvasHost({ chatId }: { chatId: string }) {
  const target = useApp((s) => s.ui.canvas);
  const storedRect = useApp((s) => s.ui.canvasRect);
  const maximized = useApp((s) => s.ui.canvasMax);
  const setUI = useApp((s) => s.setUI);
  const closeCanvas = useApp((s) => s.closeCanvas);
  const chat = useApp((s) => s.chats[chatId]);

  const [mobile, setMobile] = useState(() => window.innerWidth < 900);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const h = () => setMobile(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  const res = useMemo(() => (target ? resolveTarget(chat, target) : null), [target, chat]);
  const file = res?.path ? chat?.files?.[res.path] : undefined;

  const [rect, setRect] = useState<CanvasRect | null>(storedRect);
  const key = target ? JSON.stringify(target) : "";

  // size + place the window to whatever it is holding
  useLayoutEffect(() => {
    if (!target) { setRect(null); return; }
    const { w, h } = preferred(res || {}, file);
    const x = Math.max(PAD, window.innerWidth - w - PAD - 6);
    const y = Math.max(PAD, Math.round((window.innerHeight - h) / 2));
    setRect({ x, y, w, h });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // keep it inside the viewport
  useEffect(() => {
    const onResize = () => {
      setRect((r) => {
        if (!r) return r;
        const w = Math.min(r.w, window.innerWidth - PAD * 2);
        const h = Math.min(r.h, window.innerHeight - PAD * 2);
        return {
          w, h,
          x: Math.min(Math.max(PAD, r.x), Math.max(PAD, window.innerWidth - w - PAD)),
          y: Math.min(Math.max(PAD, r.y), Math.max(PAD, window.innerHeight - h - PAD)),
        };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" && target) closeCanvas(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [target, closeCanvas]);

  /* ------------------------------------------------------ drag & resize */
  const drag = useRef<{ dir: Dir; px: number; py: number; r: CanvasRect } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent, dir: Dir) => {
    if (!rect || maximized) return;
    e.preventDefault();
    e.stopPropagation();
    drag.current = { dir, px: e.clientX, py: e.clientY, r: { ...rect } };
    document.body.style.userSelect = "none";
    document.body.style.cursor = dir === "move" ? "grabbing" : `${dir}-resize`;

    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = ev.clientX - d.px;
      const dy = ev.clientY - d.py;
      let { x, y, w, h } = d.r;
      const maxW = window.innerWidth - PAD * 2;
      const maxH = window.innerHeight - PAD * 2;

      if (d.dir === "move") {
        x = Math.min(Math.max(PAD, x + dx), window.innerWidth - w - PAD);
        y = Math.min(Math.max(PAD, y + dy), window.innerHeight - h - PAD);
      } else {
        if (d.dir.includes("e")) w = Math.min(Math.max(MIN_W, w + dx), maxW - (x - PAD));
        if (d.dir.includes("s")) h = Math.min(Math.max(MIN_H, h + dy), maxH - (y - PAD));
        if (d.dir.includes("w")) { const nw = Math.min(Math.max(MIN_W, w - dx), x + w - PAD); x = x + w - nw; w = nw; }
        if (d.dir.includes("n")) { const nh = Math.min(Math.max(MIN_H, h - dy), y + h - PAD); y = y + h - nh; h = nh; }
      }
      setRect({ x, y, w, h });
    };

    const up = () => {
      drag.current = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", move);
      setUI({ canvasRect: rect });
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up, { once: true });
    window.addEventListener("pointercancel", up, { once: true });
  }, [rect, maximized, setUI]);

  /* ------------------------------------------ mobile sheet drag-to-size */
  const [sheetH, setSheetH] = useState(0.8);
  const onSheetDrag = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const start = sheetH;
    const move = (ev: PointerEvent) => {
      const delta = (startY - ev.clientY) / window.innerHeight;
      setSheetH(Math.min(0.97, Math.max(0.34, start + delta)));
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", () => window.removeEventListener("pointermove", move), { once: true });
  }, [sheetH]);

  const isVid = isVideo(res?.url);
  const [topHover, setTopHover] = useState(false);
  const [bottomHover, setBottomHover] = useState(false);

  const onCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const bottomY = rect.bottom - e.clientY;

    setTopHover(y <= 46);
    setBottomHover(bottomY <= 52);
  }, []);

  const onCanvasPointerLeave = useCallback(() => {
    setTopHover(false);
    setBottomHover(false);
  }, []);

  const body = useMemo(() => {
    if (!target) return null;
    if (res?.url) return <WebViewer url={res.url} title={res.title} />;
    const path = res?.path;
    if (!path) return <div className="empty-hint" style={{ padding: 20 }}>nothing to show</div>;
    const v = viewOf(path, file);
    if (v === "project") return <ProjectView chatId={chatId} path={path} />;
    if (v === "ui") return <FileEditor chatId={chatId} path={path} view="ui" />;
    return <FileEditor chatId={chatId} path={path} />;
  }, [target, res, file, chatId]);

  if (!target || !res) return null;

  /* -------------------------------------------------------- mobile sheet */
  if (mobile) {
    return (
      <>
        <div className="cv-backdrop" onClick={closeCanvas} />
        <div className="cv-win cv-sheet" style={{ height: `${sheetH * 100}dvh` }}>
          <div className="cv-grab" onPointerDown={onSheetDrag}><span /></div>
          <div className="cv-corner-h left" onPointerDown={onSheetDrag} title="Drag to resize" />
          <div className="cv-corner-h right" onPointerDown={onSheetDrag} title="Drag to resize" />
          <div className="cv-bar">
            <span className="cv-title">{res.title}</span>
            <span className="chip sm">{res.badge}</span>
            <span style={{ flex: 1 }} />
            <button className="icon-btn sm" onClick={closeCanvas}><I.x size={15} /></button>
          </div>
          <div className="cv-body">{body}</div>
        </div>
      </>
    );
  }

  /* ------------------------------------------------------ desktop window */
  const style: React.CSSProperties = maximized
    ? { left: PAD, top: PAD, width: `calc(100vw - ${PAD * 2}px)`, height: `calc(100vh - ${PAD * 2}px)` }
    : rect
      ? { left: rect.x, top: rect.y, width: rect.w, height: rect.h }
      : isVid
        ? { right: PAD, top: PAD, width: 780, height: 490 }
        : { right: PAD, top: PAD, width: 880, height: 660 };

  const handles: Dir[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

  return (
    <div
      className="cv-win"
      style={style}
      data-top-hover={topHover}
      data-bottom-hover={bottomHover}
      onPointerMove={onCanvasPointerMove}
      onPointerLeave={onCanvasPointerLeave}
    >
      {/* Floating Top Window Controls Bar — ONLY shows on top hover */}
      <div
        className="cv-floating-bar"
        onMouseEnter={() => setTopHover(true)}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button, a, input")) return;
          onPointerDown(e, "move");
        }}
      >
        <div className="cv-floating-left">
          {res.url ? (
            isVid ? <I.video size={13} /> : <I.globe size={13} />
          ) : res.path && viewOf(res.path, file) === "project" ? (
            <I.canvas size={13} />
          ) : (
            <I.file size={13} />
          )}
          <span className="cv-floating-title" title={res.title}>
            {res.title}
          </span>
          {res.url && <span className="cv-floating-meta">{hostOf(res.url)}</span>}
          {!res.url && res.path && res.path !== res.title && (
            <span className="cv-floating-meta">{res.path}</span>
          )}
        </div>

        <span style={{ flex: 1 }} />

        <div className="cv-floating-win-ctrls">
          <button
            className="cv-floating-btn"
            title="Reload"
            onClick={() => setRect((r) => (r ? { ...r } : r))}
          >
            <I.refresh size={12} />
          </button>
          <button
            className="cv-floating-btn"
            title={maximized ? "Restore" : "Maximise"}
            onClick={() => setUI({ canvasMax: !maximized })}
          >
            {maximized ? "▫" : "▢"}
          </button>
          <button
            className="cv-floating-btn close"
            title="Close (Esc)"
            onClick={closeCanvas}
          >
            <I.x size={13} />
          </button>
        </div>
      </div>

      {/* Canvas Body — full bleed immersion */}
      <div className="cv-body">{body}</div>

      {!maximized && handles.map((d) => (
        <div key={d} className={`cv-h cv-h-${d}`} onPointerDown={(e) => onPointerDown(e, d)} />
      ))}
      {!maximized && <div className="cv-grip" aria-hidden />}
    </div>
  );
}
