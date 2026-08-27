import { useState } from "react";
import { I } from "./Icons";
import { useApp, uid } from "../lib/store";
import { SKILLS } from "../lib/skills";
import { mcpList } from "../lib/mcp";
import { Markdown } from "../md/Markdown";
import type { McpServer } from "../lib/types";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const setUI = useApp((s) => s.setUI);
  return (
    <div className="modal-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) setUI({ modal: null }); }}>
      <div className="pop modal a-pop">
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

export function Modals() {
  const modal = useApp((s) => s.ui.modal);
  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", url: "" });
  const [busy, setBusy] = useState(false);

  if (!modal) return null;

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
