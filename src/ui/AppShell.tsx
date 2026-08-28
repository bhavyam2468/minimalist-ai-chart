import { useEffect, useState } from "react";
import { useApp, mainPath } from "../lib/store";
import { Turn } from "./Message";
import { Composer } from "./Composer";
import { Panel, Rail, Sidebar } from "./Chrome";
import { Modals } from "./Modals";
import { CanvasHost } from "../canvas/CanvasHost";
import { SelectionPopup } from "./SelectionPopup";
import { I } from "./Icons";
import { useStickToBottom } from "../lib/useStickToBottom";

/* ===========================================================================
   AppShell — the three-column layout and everything that is always mounted.

   sidebar | center (transcript + rail + composer) | panel, with the canvas
   floating over all of it. Owns the responsive breakpoint, the sidebar/panel
   keyboard shortcuts, and the transcript's stick-to-bottom behaviour.
   ========================================================================= */

export function AppShell({ chatId }: { chatId: string }) {
  const chat = useApp((s) => s.chats[chatId]);
  const ui = useApp((s) => s.ui);
  const setUI = useApp((s) => s.setUI);
  const streamId = useApp((s) => s.streamId);

  const [mobile, setMobile] = useState(false);

  /* --- narrow screens: collapse the side columns into a sheet --- */
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

  /* --- the transcript follows the stream unless the user scrolled up --- */
  const path = chat ? mainPath(chat) : [];
  const lastContent = path.length ? path[path.length - 1].content.length : 0;
  const { ref: scroller } = useStickToBottom({ streamId, signal: lastContent });

  /* --- ⌘\ sidebar, ⌘. panel --- */
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
        <Composer chatId={chatId} centered={path.length === 0} />
        <SelectionPopup chatId={chatId} />
      </main>
      <Panel chat={chat} />
      <CanvasHost chatId={chatId} />
      <Modals />
    </div>
  );
}
