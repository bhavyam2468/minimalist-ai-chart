import { useEffect, useState } from "react";
import { I } from "./Icons";
import { mainPath, useApp } from "../lib/store";
import { compactChat } from "../lib/compact";
import { contextTokenCount } from "../lib/prompt";
import { hostOf } from "../lib/web";
import { exportChatZip } from "../lib/xml";
import { VIEW_LABEL, viewOf } from "../canvas/view";
import type { Chat } from "../lib/types";

/* --------------------------------------------------------------- sidebar */
export function Sidebar() {
  const chats = useApp((s) => s.chats);
  const order = useApp((s) => s.order);
  const activeId = useApp((s) => s.activeId);
  const createChat = useApp((s) => s.createChat);
  const selectChat = useApp((s) => s.selectChat);
  const deleteChat = useApp((s) => s.deleteChat);
  const ui = useApp((s) => s.ui);
  const setUI = useApp((s) => s.setUI);
  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);

  useEffect(() => { document.documentElement.dataset.theme = settings.theme; }, [settings.theme]);

  return (
    <aside className="side" data-collapsed={!ui.sidebar}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 4px 6px" }}>
        <button className="icon-btn" title="New chat" onClick={() => createChat()}><I.plus size={16} /></button>
        <span className="grow" style={{ flex: 1 }} />
        <button
          className="icon-btn"
          title={settings.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
        >
          {settings.theme === "dark" ? <I.sun size={15} /> : <I.moon size={15} />}
        </button>
        <button className="icon-btn" title="Settings" onClick={() => setUI({ modal: "settings" })}>
          <I.settings size={15} />
        </button>
      </div>
      <div className="side-scroll">
        {order.filter((id) => chats[id]).map((id) => (
          <div key={id} className="side-item" data-active={id === activeId} onClick={() => selectChat(id)}>
            <span>{chats[id].title || "untitled"}</span>
            <button className="icon-btn sm" style={{ marginLeft: "auto" }} onClick={(e) => { e.stopPropagation(); deleteChat(id); }}><I.trash size={12} /></button>
          </div>
        ))}
      </div>
    </aside>
  );
}

/* ----------------------------------------------------------- right panel */
export function Panel({ chat }: { chat: Chat }) {
  const ui = useApp((s) => s.ui);
  const openCanvas = useApp((s) => s.openCanvas);
  const setFileState = useApp((s) => s.setFileState);
  const dropFile = useApp((s) => s.dropFile);
  const dropArtifact = useApp((s) => s.dropArtifact);
  const [compacting, setCompacting] = useState(false);

  const files = Object.values(chat.files);
  const artifacts = Object.values(chat.artifacts ?? {}).sort((a, b) => b.createdAt - a.createdAt);
  const sources = chat.sources.slice().reverse();
  const approxTokens = contextTokenCount(chat);

  return (
    <aside className="panel" data-collapsed={!ui.panel}>
      {/* ---------------------------------------------------- workspace */}
      <section className="panel-box">
        <div className="panel-head">
          <span className="label">workspace</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)" }}>{files.length || 0}</span>
            <button className="icon-btn sm" title="Export chat.xml + files as a zip" onClick={() => exportChatZip(chat)}><I.file size={12} /></button>
          </span>
        </div>
        <div className="panel-scroll" style={{ maxHeight: 230 }}>
          {files.length === 0 && <div className="empty-hint">nothing yet</div>}
          {files.map((f) => (
            <div className="file-row" key={f.path}>
              <span
                className="dot" data-state={f.state} title={`${f.state} — click to toggle context`}
                style={{ cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); setFileState(chat.id, f.path, f.state === "context" ? "known" : "context"); }}
              />
              <button className="name row-open" title={`open ${f.path} in the canvas`}
                      onClick={() => openCanvas({ kind: "file", path: f.path })}>
                {f.path}
              </button>
              <span className="meta">{f.size > 1024 ? `${Math.round(f.size / 1024)}k` : `${f.size}b`}</span>
              <button className="icon-btn sm" onClick={() => dropFile(chat.id, f.path)}><I.x size={11} /></button>
            </div>
          ))}
        </div>
        <div className="file-row" style={{ marginTop: 2 }}>
          <span className="meta">≈{approxTokens.toLocaleString()} tokens in context</span>
          <button className="icon-btn sm" style={{ marginLeft: "auto" }} title="Compact the conversation"
                  onClick={async () => { setCompacting(true); await compactChat(chat.id); setCompacting(false); }}>
            {compacting ? <I.spark size={12} /> : <I.compact size={12} />}
          </button>
        </div>
      </section>

      {/* ---------------------------------------------------- artifacts */}
      {artifacts.length > 0 && (
        <section className="panel-box">
          <div className="panel-head">
            <span className="label">artifacts</span>
            <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)" }}>{artifacts.length}</span>
          </div>
          <div className="panel-scroll" style={{ maxHeight: 190 }}>
            {artifacts.map((a) => {
              const f = a.kind === "file" ? chat.files[a.ref] : undefined;
              const v = viewOf(a.ref, f);
              return (
                <div className="file-row" key={a.id} title={a.note ? `${a.title} — ${a.note}` : a.ref}>
                  {a.kind === "url" ? <I.globe size={13} /> : v === "project" ? <I.canvas size={13} /> : <I.file size={13} />}
                  <button className="name row-open" onClick={() => openCanvas({ kind: "artifact", id: a.id })}>{a.title}</button>
                  <span className="meta">{VIEW_LABEL[v] || "link"}</span>
                  <button className="icon-btn sm" onClick={() => dropArtifact(chat.id, a.id)}><I.x size={11} /></button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------- sources */}
      <section className="panel-box">
        <div className="panel-head">
          <span className="label">sources</span>
          <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)" }}>{sources.length || 0}</span>
        </div>
        <div className="panel-scroll" style={{ maxHeight: 260 }}>
          {sources.length === 0 && <div className="empty-hint">no sites used</div>}
          {sources.slice(0, 40).map((s) => (
            <div className="src-row" key={s.url}>
              <img className="src-fav" src={`https://www.google.com/s2/favicons?domain=${hostOf(s.url)}&sz=32`} alt="" />
              <button className="src-open" title="open in the canvas" onClick={() => openCanvas({ kind: "source", url: s.url, title: s.title })}>
                <span className="src-title">{s.title || s.url}</span>
                <span className="src-host">{hostOf(s.url)}</span>
              </button>
              <a className="icon-btn sm" href={s.url} target="_blank" rel="noreferrer noopener" title="open in a new tab">↗</a>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

/* ------------------------------------------------------- checkpoint rail */
export function Rail({ chat, scroller }: { chat: Chat; scroller: React.RefObject<HTMLDivElement | null> }) {
  const nodes = mainPath(chat).filter((n) => n.role === "user");
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      let best = 0;
      nodes.forEach((n, i) => {
        const t = el.querySelector<HTMLElement>(`[data-node="${n.id}"]`);
        if (t && t.offsetTop - el.scrollTop < el.clientHeight * 0.45) best = i;
      });
      setActive(best);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [nodes.length, scroller]);

  if (nodes.length < 2) return null;
  const max = 14;
  const shown = nodes.length > max ? nodes.slice(nodes.length - max) : nodes;
  const offset = nodes.length - shown.length;

  return (
    <div className="rail">
      {shown.map((n, i) => (
        <button
          key={n.id}
          data-active={i + offset === active}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          onClick={() => {
            const el = scroller.current?.querySelector<HTMLElement>(`[data-node="${n.id}"]`);
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          {hover === i && <span className="rail-tip">{n.content.slice(0, 60) || "prompt"}</span>}
        </button>
      ))}
    </div>
  );
}
