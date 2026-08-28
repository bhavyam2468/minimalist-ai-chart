import { useState, useMemo } from "react";
import { I } from "./Icons";
import { useApp, uid } from "../lib/store";
import { SKILLS } from "../lib/skills";
import { mcpList } from "../lib/mcp";
import { Markdown } from "../md/Markdown";
import { copyToClipboard as copy } from "../lib/clipboard";
import { searchComponents, type UIComponentDef } from "../lib/ui-library";
import type { McpServer } from "../lib/types";

function Shell({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  const setUI = useApp((s) => s.setUI);
  return (
    <div className="modal-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) setUI({ modal: null }); }}>
      <div className="pop modal a-pop" style={style}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "var(--sp-4)" }}>
          <span className="label">{title}</span>
          <span style={{ flex: 1 }} />
          <button className="icon-btn" onClick={() => setUI({ modal: null })}><I.x size={15} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ComponentsModal() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const setUI = useApp((s) => s.setUI);

  const categories = [
    { id: "all", label: "all" },
    { id: "interactive", label: "interactive" },
    { id: "chart", label: "charts" },
    { id: "slides", label: "slides" },
    { id: "visualizer", label: "visualizers" },
    { id: "data", label: "data" },
    { id: "layout", label: "layout" },
  ];

  const filtered = useMemo(() => {
    return searchComponents(query, {
      category: category === "all" ? undefined : category,
      tag: selectedTag || undefined,
      limit: 120,
    });
  }, [query, category, selectedTag]);

  const onCopy = async (id: string, text: string) => {
    const ok = await copy(text);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1400);
    }
  };

  const onOpenInCanvas = (comp: UIComponentDef) => {
    const state = useApp.getState();
    const chatId = state.activeId;
    if (!chatId) return;
    const path = `artifacts/${comp.id}-demo.ui.json`;
    state.putFile(chatId, {
      path,
      content: comp.jsonSnippet,
      size: comp.jsonSnippet.length,
      mime: "application/json",
      kind: "data",
      state: "local",
      origin: "agent",
      createdAt: Date.now(),
    });
    state.openCanvas({ kind: "file", path });
    setUI({ modal: null });
  };

  return (
    <Shell title="component library" style={{ width: "min(860px, 96vw)", maxHeight: "90vh" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Search Bar & Category Segment */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search components or tags (slider, button, chart, slides, math)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              padding: "7px 12px",
              borderRadius: "var(--r-sm)",
              background: "var(--surface-2)",
              border: "1px solid var(--line-soft)",
              color: "var(--text)",
              fontSize: "12px",
              outline: "none",
            }}
          />
          {selectedTag && (
            <button
              className="chip"
              data-on="true"
              onClick={() => setSelectedTag(null)}
              title="Clear tag filter"
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              #{selectedTag} <I.x size={11} />
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", paddingBottom: 6, borderBottom: "1px solid var(--line-soft)" }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setCategory(cat.id); setSelectedTag(null); }}
              className="chip"
              data-on={category === cat.id}
              style={{
                fontSize: "11px",
                padding: "3px 9px",
                cursor: "pointer",
                borderRadius: "var(--r-xs)",
              }}
            >
              {cat.label}
            </button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-faint)", alignSelf: "center" }}>
            {filtered.length} components
          </span>
        </div>

        {/* Minimal Grid with Hover-Revealed Metadata */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 10, maxHeight: "68vh", overflowY: "auto", paddingRight: 4 }}>
          {filtered.map((comp) => (
            <div key={comp.id} className="comp-card a-blk">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", fontWeight: 550, color: "var(--text)" }}>{comp.name}</span>
                <span style={{ fontSize: "10px", fontFamily: "var(--mono)", color: "var(--text-faint)", background: "rgba(255,255,255,0.04)", padding: "1px 5px", borderRadius: "var(--r-xs)" }}>
                  {comp.type}
                </span>
              </div>

              {/* Renderer is being rebuilt — show the JSON shape instead of a live preview */}
              <div style={{ padding: "2px 0" }}>
                <pre
                  style={{
                    margin: 0, padding: "6px 8px", maxHeight: 96, overflow: "auto",
                    fontFamily: "var(--mono)", fontSize: "10.5px", lineHeight: 1.5,
                    color: "var(--text-dim)", background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--line-soft)", borderRadius: "var(--r-xs)",
                    whiteSpace: "pre",
                  }}
                >{comp.jsonSnippet}</pre>
              </div>

              {/* Hover-revealed tray: description, actions, and tags */}
              <div className="comp-card-hover-tray">
                <div style={{ fontSize: "11px", color: "var(--text-dim)", lineHeight: 1.35 }}>
                  {comp.description}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {comp.tags.slice(0, 3).map((t) => (
                      <span key={t} style={{ fontSize: "9.5px", color: "var(--text-faint)", background: "rgba(255,255,255,0.04)", padding: "1px 4px", borderRadius: 3 }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "inline-flex", gap: 4, flexShrink: 0 }}>
                    <button
                      className="btn sm"
                      onClick={() => onCopy(comp.id + "-tag", comp.snippet)}
                      title="Copy <component> tag"
                      style={{ fontSize: "10.5px", padding: "2px 6px" }}
                    >
                      {copiedId === comp.id + "-tag" ? "copied!" : "tag"}
                    </button>
                    <button
                      className="btn sm"
                      onClick={() => onCopy(comp.id + "-json", comp.jsonSnippet)}
                      title="Copy JSON snippet"
                      style={{ fontSize: "10.5px", padding: "2px 6px" }}
                    >
                      {copiedId === comp.id + "-json" ? "copied!" : "json"}
                    </button>
                    <button
                      className="btn sm primary"
                      onClick={() => onOpenInCanvas(comp)}
                      title="Open in Canvas"
                      style={{ fontSize: "10.5px", padding: "2px 6px" }}
                    >
                      canvas
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {!filtered.length && (
            <div className="empty-hint" style={{ padding: "30px 0", gridColumn: "1 / -1" }}>
              No components match query "{query}".
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

export function Modals() {
  const modal = useApp((s) => s.ui.modal);
  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", url: "" });
  const [busy, setBusy] = useState(false);

  if (!modal) return null;

  if (modal === "components") return <ComponentsModal />;

  if (modal === "settings")
    return (
      <Shell title="settings">
        <div className="field">
          <span className="label">openai api key</span>
          <input type="password" value={settings.apiKey} onChange={(e) => setSettings({ apiKey: e.target.value })} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)" }}>
          <div className="field">
            <span className="label">model</span>
            <input value={settings.model} onChange={(e) => setSettings({ model: e.target.value })} />
          </div>
          <div className="field">
            <span className="label">base url</span>
            <input value={settings.baseUrl} onChange={(e) => setSettings({ baseUrl: e.target.value })} />
          </div>
          <div className="field">
            <span className="label">firecrawl key (optional)</span>
            <input type="password" value={settings.firecrawlKey} onChange={(e) => setSettings({ firecrawlKey: e.target.value })} />
          </div>
          <div className="field">
            <span className="label">temperature · {settings.temperature}</span>
            <input type="range" min={0} max={2} step={0.1} value={settings.temperature} onChange={(e) => setSettings({ temperature: +e.target.value })} />
          </div>
        </div>
        <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-faint)" }}>
          Requests go straight from this browser to {settings.baseUrl}. If the model name is unavailable the client falls back to gpt-4.1, then gpt-4o.
        </div>
      </Shell>
    );

  if (modal === "skills")
    return (
      <Shell title="skill library">
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {SKILLS.map((s) => (
            <div key={s.name} className="surface" style={{ padding: "10px 14px", background: "var(--surface-2)" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }} onClick={() => setOpen(open === s.name ? null : s.name)}>
                <I.book size={14} />
                <b style={{ fontWeight: 520 }}>{s.name}</b>
                {s.always && <span className="chip" data-on="true">always</span>}
                <span style={{ flex: 1 }} />
                <I.down size={13} />
              </div>
              <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-dim)", marginTop: 4 }}>{s.description}</div>
              {open === s.name && (
                <div style={{ marginTop: 10, borderTop: "1px solid var(--line-soft)", paddingTop: 10 }}>
                  <Markdown text={s.body} animate={false} />
                </div>
              )}
            </div>
          ))}
        </div>
      </Shell>
    );

  const connect = async (srv: McpServer) => {
    setBusy(true);
    try {
      const tools = await mcpList(srv);
      setSettings({ mcp: settings.mcp.map((m) => (m.id === srv.id ? { ...m, tools, error: undefined, enabled: true } : m)) });
    } catch (e: any) {
      setSettings({ mcp: settings.mcp.map((m) => (m.id === srv.id ? { ...m, error: e.message } : m)) });
    }
    setBusy(false);
  };

  return (
    <Shell title="mcp servers">
      <div style={{ display: "flex", gap: 8, marginBottom: "var(--sp-4)" }}>
        <input className="field" style={{ margin: 0 }} placeholder="name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <input className="field" style={{ margin: 0, flex: 2 }} placeholder="https://server/mcp" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
        <button
          className="btn primary"
          onClick={() => {
            if (!draft.url) return;
            const srv: McpServer = { id: uid("m"), name: draft.name || new URL(draft.url).hostname, url: draft.url, enabled: false };
            setSettings({ mcp: [...settings.mcp, srv] });
            setDraft({ name: "", url: "" });
            connect(srv);
          }}
        >add</button>
      </div>
      {settings.mcp.length === 0 && <div className="empty-hint">no servers. Streamable-HTTP endpoints only (stateless 2026-07-28 or 2025 spec).</div>}
      {settings.mcp.map((m) => (
        <div key={m.id} className="surface" style={{ padding: "10px 14px", marginBottom: 6, background: "var(--surface-2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="dot" data-state={m.enabled ? "context" : "known"} />
            <b style={{ fontWeight: 520 }}>{m.name}</b>
            <span style={{ color: "var(--text-faint)", fontSize: "var(--fs-xs)" }}>{m.tools?.length ?? 0} tools</span>
            <span style={{ flex: 1 }} />
            <button className="btn" disabled={busy} onClick={() => connect(m)}>refresh</button>
            <button className="btn" onClick={() => setSettings({ mcp: settings.mcp.map((x) => (x.id === m.id ? { ...x, enabled: !x.enabled } : x)) })}>
              {m.enabled ? "disable" : "enable"}
            </button>
            <button className="icon-btn" onClick={() => setSettings({ mcp: settings.mcp.filter((x) => x.id !== m.id) })}><I.trash size={13} /></button>
          </div>
          {m.error && <div style={{ color: "var(--err)", fontSize: "var(--fs-sm)", marginTop: 6 }}>{m.error}</div>}
          {!!m.tools?.length && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
              {m.tools.map((t) => <span key={t.name} className="chip" title={t.description}>{t.name}</span>)}
            </div>
          )}
        </div>
      ))}
    </Shell>
  );
}
