import { useEffect, useState } from "react";
import { useApp } from "../lib/store";
import { I } from "./Icons";

/**
 * The little tray that appears when you select text inside a message.
 *
 * Two actions, both of which turn a passage into a first-class reference:
 *   quote        — drop the selection into the composer as a quote
 *   thread on this — fork a side conversation anchored to that node
 *
 * It only offers itself for selections inside a rendered node (anything with
 * a `data-node` host), and it anchors to the selection's bounding box.
 */
export function SelectionPopup({ chatId }: { chatId: string }) {
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

  const item: React.CSSProperties = {
    display: "inline-flex",
    flexDirection: "row",
    alignItems: "center",
    whiteSpace: "nowrap",
    flexShrink: 0,
    width: "auto",
    gap: 6,
    padding: "5px 9px",
  };

  const quote = () => {
    setUI({ composerQuote: { nodeId: pos.nodeId, text: pos.text } });
    setPos(null);
    window.getSelection()?.removeAllRanges();
  };

  const thread = () => {
    const tid = createThread(chatId, pos.nodeId, pos.text);
    setUI({ composerQuote: { nodeId: pos.nodeId, text: pos.text, threadId: tid }, activeThreadId: tid });
    setPos(null);
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div
      className="sel-pop pop"
      style={{
        left: Math.max(12, pos.x - 90),
        top: Math.max(12, pos.y),
        display: "inline-flex",
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "nowrap",
        whiteSpace: "nowrap",
        gap: 4,
        padding: "4px 6px",
      }}
    >
      <button className="menu-item" style={item} onClick={quote}>
        <I.quote size={13} />quote
      </button>
      <button className="menu-item" style={item} onClick={thread}>
        <I.thread size={13} />thread on this
      </button>
    </div>
  );
}
