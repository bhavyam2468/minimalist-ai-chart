import { useState, useMemo } from "react";
import { I } from "./Icons";
import { useApp, uid } from "../lib/store";
import { SKILLS } from "../lib/skills";
import { mcpList } from "../lib/mcp";
import { Markdown } from "../md/Markdown";
import { copyToClipboard as copy } from "../lib/clipboard";
import { BlockR } from "../canvas/Blocks";
import { ErrorBoundary } from "./ErrorBoundary";
import { searchComponents, COMPONENT_CATALOG, UIComponentDef } from "../lib/ui-library";
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
    { id: "all", label: "All Components" },
    { id: "form", label: "Forms & Inputs" },
    { id: "chart", label: "Charts & Graphs" },
    { id: "math-science", label: "Math & Science" },
    { id: "layout", label: "Layout & Dashboards" },
    { id: "feedback", label: "Feedback & Meters" },
    { id: "interactive", label: "Decision & Questions" },
  ];

  const filtered = useMemo(() => {
    return searchComponents(query, {
      category: category === "all" ? undefined : category,
      tag: selectedTag || undefined,
      limit: 50,
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
    const chatId = state.activeChatId;
    if (!chatId) return;
    const path = `artifacts/${comp.id}-demo.ui.json`;
    state.putFile(chatId, {
      path,
      content: comp.jsonSnippet,
      size: comp.jsonSnippet.length,
      kind: "ui",
      state: "idle",
      updatedAt: Date.now(),
    });
    state.openCanvas({ kind: "file", path });
    setUI({ modal: null });
  };

  return (
    <Shell title="UI Component Marketplace & Library" style={{ width: "min(840px, 96vw)", maxHeight: "90vh" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Search & Tag Filter Bar */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search components by type, tag, or description (e.g. 'slider', 'button', 'math', 'chart')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              padding: "8px 14px",
              borderRadius: "var(--r-sm)",
              background: "var(--surface-2)",
              border: "1px solid var(--line-soft)",
              color: "var(--text)",
              fontSize: "var(--fs-xs)",
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

        {/* Category Pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1px solid var(--line-soft)", paddingBottom: 10 }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setCategory(cat.id); setSelectedTag(null); }}
              className="chip"
              data-on={category === cat.id}
              style={{
                fontSize: "11.5px",
                padding: "4px 10px",
                cursor: "pointer",
                borderRadius: "var(--r-xs)",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Component Cards List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: "64vh", overflowY: "auto", paddingRight: 4 }}>
          {filtered.map((comp) => (
            <div
              key={comp.id}
              className="surface a-blk"
              style={{
                padding: "14px 16px",
                background: "var(--surface-2)",
                borderRadius: "var(--r)",
                border: "1px solid var(--line-soft)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <b style={{ fontSize: "var(--fs-sm)", fontWeight: 560, color: "var(--text)" }}>{comp.name}</b>
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontFamily: "var(--mono)",
                      color: "var(--accent)",
                      background: "var(--accent-soft)",
                      padding: "2px 6px",
                      borderRadius: "var(--r-xs)",
                    }}
                  >
                    type="{comp.type}"
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-faint)" }}>· {comp.category}</span>
                </div>
                <div style={{ display: "inline-flex", gap: 6 }}>
                  <button
                    className="btn sm"
                    onClick={() => onCopy(comp.id + "-tag", comp.snippet)}
                    title="Copy <component> HTML tag"
                    style={{ fontSize: "11px", padding: "3px 8px" }}
                  >
                    {copiedId === comp.id + "-tag" ? "copied tag!" : "copy tag"}
                  </button>
                  <button
                    className="btn sm"
                    onClick={() => onCopy(comp.id + "-json", comp.jsonSnippet)}
                    title="Copy JSON structure"
                    style={{ fontSize: "11px", padding: "3px 8px" }}
                  >
                    {copiedId === comp.id + "-json" ? "copied json!" : "copy json"}
                  </button>
                  <button
                    className="btn sm primary"
                    onClick={() => onOpenInCanvas(comp)}
                    title="Open live preview in canvas"
                    style={{ fontSize: "11px", padding: "3px 8px" }}
                  >
                    open in canvas
                  </button>
                </div>
              </div>

              <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-dim)", lineHeight: 1.4 }}>
                {comp.description}
              </div>

              {/* Live Interactive Preview */}
              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--line-soft)",
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontSize: "10px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>
                  Live Interactive Preview
                </div>
                <ErrorBoundary name={comp.name}>
                  <BlockR b={{ type: comp.type, ...comp.defaultProps }} />
                </ErrorBoundary>
              </div>

              {/* Tags */}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "10px", color: "var(--text-faint)", marginRight: 2 }}>tags:</span>
                {comp.tags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTag(t)}
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "none",
                      color: "var(--text-faint)",
                      fontSize: "10.5px",
                      borderRadius: "var(--r-xs)",
                      padding: "1px 6px",
                      cursor: "pointer",
                    }}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {!filtered.length && (
            <div className="empty-hint" style={{ padding: "30px 0" }}>
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
