import { useEffect, useRef, useState } from "react";
import { mainPath, useApp } from "./lib/store";
import { Turn } from "./ui/Message";
import { Composer } from "./ui/Composer";
import { Panel, Rail, Sidebar } from "./ui/Chrome";
import { Modals } from "./ui/Modals";
import { CanvasHost } from "./canvas/CanvasHost";
import { I } from "./ui/Icons";

function SelectionPopup({ chatId }: { chatId: string }) {
  const [pos, setPos] = useState<{ x: number; y: number; text: string; nodeId: string } | null>(null);
  const setUI = useApp((s) => s.setUI);
  const createThread = useApp((s) => s.createThread);

  useEffect(() => {
    const up = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? "";
      if (!text || text.length < 3) { setPos(null); return; }
      const anchor = sel!.anchorNode as HTMLElement | null;
      const el = (anchor?.nodeType === 1 ? anchor : anchor?.parentElement) as HTMLElement | null;
      const host = el?.closest<HTMLElement>("[data-node]");
      if (!host) { setPos(null); return; }
      const r = sel!.getRangeAt(0).getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.top - 42, text, nodeId: host.dataset.node! });
    };
    const down = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest(".sel-pop")) setPos(null); };
    document.addEventListener("mouseup", up);
    document.addEventListener("mousedown", down);
    return () => { document.removeEventListener("mouseup", up); document.removeEventListener("mousedown", down); };
  }, []);

  if (!pos) return null;
  return (
    <div className="sel-pop pop" style={{ left: Math.max(12, pos.x - 90), top: Math.max(12, pos.y) }}>
      <button className="menu-item" onClick={() => { setUI({ composerQuote: { nodeId: pos.nodeId, text: pos.text } }); setPos(null); window.getSelection()?.removeAllRanges(); }}>
        <I.quote size={13} />quote
      </button>
      <button className="menu-item" onClick={() => {
        const tid = createThread(chatId, pos.nodeId, pos.text);
        setUI({ composerQuote: { nodeId: pos.nodeId, text: pos.text, threadId: tid }, activeThreadId: tid });
        setPos(null); window.getSelection()?.removeAllRanges();
      }}>
        <I.thread size={13} />thread on this
      </button>
    </div>
  );
}



export default function App() {
  const activeId = useApp((s) => s.activeId);
  const chat = useApp((s) => s.chats[s.activeId]);
  const ui = useApp((s) => s.ui);
  const setUI = useApp((s) => s.setUI);
  const streamId = useApp((s) => s.streamId);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const h = (e: MediaQueryListEvent | MediaQueryList) => {
      setMobile(e.matches);
      if (e.matches) setUI({ sidebar: false, panel: false });
    };
    h(mq);
    mq.addEventListener("change", h as any);
    return () => mq.removeEventListener("change", h as any);
  }, [setUI]);

  const path = chat ? mainPath(chat) : [];
  const lastContent = path.length ? path[path.length - 1].content.length : 0;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => { stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160; };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!stick.current) return;
    const el = scroller.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: streamId ? "auto" : "smooth" });
  }, [lastContent, path.length, streamId]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") { e.preventDefault(); setUI({ sidebar: !ui.sidebar }); }
      if ((e.metaKey || e.ctrlKey) && e.key === ".") { e.preventDefault(); setUI({ panel: !ui.panel }); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [ui.sidebar, ui.panel, setUI]);

  if (!chat) return null;

  const sheetOpen = mobile && (ui.sidebar || ui.panel);

  return (
    <div className="app">
      {sheetOpen && (
        <div className="sheet-backdrop" onClick={() => setUI({ sidebar: false, panel: false })} />
      )}
      <Sidebar />
      <main className="center">
        <div style={{ position: "absolute", top: 10, left: 10, zIndex: 6, display: "flex", gap: 2 }}>
          <button className="icon-btn" onClick={() => setUI({ sidebar: !ui.sidebar })}><I.sidebar size={15} /></button>
        </div>
        <div style={{ position: "absolute", top: 10, right: 10, zIndex: 6, display: "flex", gap: 2 }}>
          <button className="icon-btn" onClick={() => setUI({ panel: !ui.panel })}><I.panel size={15} /></button>
        </div>

        <div className="scroll" ref={scroller}>
          <div className="col">
            {path.map((n) => <Turn key={n.id} chat={chat} node={n} />)}
          </div>
        </div>

        <Rail chat={chat} scroller={scroller} />
        <Composer chatId={activeId} centered={path.length === 0} />
        <SelectionPopup chatId={activeId} />
      </main>
      <Panel chat={chat} />
      <CanvasHost chatId={activeId} />
      <Modals />
    </div>
  );
}
