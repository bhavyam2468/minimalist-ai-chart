import { useEffect, useMemo, useRef, useState } from "react";
import { I } from "./Icons";
import { useApp } from "../lib/store";
import { send, stopGeneration } from "../lib/agent";
import { ingest } from "../lib/ingest";
import { SKILLS } from "../lib/skills";

export function Composer({ chatId, threadId, inline, centered }: { chatId: string; threadId?: string | null; inline?: boolean; centered?: boolean }) {
  const chat = useApp((s) => s.chats[chatId]);
  const busy = useApp((s) => s.busy[chatId]);
  const ui = useApp((s) => s.ui);
  const setUI = useApp((s) => s.setUI);
  const putFile = useApp((s) => s.putFile);
  const setFileState = useApp((s) => s.setFileState);
  const patchChat = useApp((s) => s.patchChat);
  const settings = useApp((s) => s.settings);

  const [text, setText] = useState("");
  const [attached, setAttached] = useState<string[]>([]);
  const [menu, setMenu] = useState<null | "plus" | "tools" | "knowledge" | "mention">(null);
  const [mentionQ, setMentionQ] = useState("");
  const [mentionIdx, setMentionIdx] = useState(0);
  const ta = useRef<HTMLTextAreaElement>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  const quote = ui.composerQuote && (!threadId || ui.composerQuote.threadId === threadId) ? ui.composerQuote : null;

  useEffect(() => {
    const el = ta.current; if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [text]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as any)) setMenu(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const files = Object.values(chat?.files ?? {});
  type Hit = { kind: "file" | "skill"; label: string; meta: string; state?: string };
  const mentionHits = useMemo<Hit[]>(() => {
    const q = mentionQ.toLowerCase();
    const f: Hit[] = files.filter((x) => x.path.toLowerCase().includes(q)).map((x) => ({ kind: "file", label: x.path, meta: x.kind, state: x.state }));
    const s: Hit[] = SKILLS.filter((x) => x.name.includes(q)).map((x) => ({ kind: "skill", label: x.name, meta: "skill" }));
    return [...f, ...s].slice(0, 8);
  }, [files, mentionQ]);

  const upload = async (list: FileList | null) => {
    if (!list) return;
    for (const f of Array.from(list)) {
      const wf = await ingest(f);
      putFile(chatId, wf);
      setAttached((a) => [...new Set([...a, wf.path])]);
      if (wf.skill) patchChat(chatId, (c) => { const cur = c.enabledSkills ?? []; if (!cur.includes(wf.skill!)) c.enabledSkills = [...cur, wf.skill!]; });
    }
    setMenu(null);
  };

  const submit = () => {
    const body = text.trim();
    if (!body || busy) return;
    setText("");
    const atts = attached;
    setAttached([]);
    setUI({ composerQuote: null });
    send(chatId, body, atts, threadId ?? null, quote?.text);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (menu === "mention" && mentionHits.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIdx((i) => (i + 1) % mentionHits.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIdx((i) => (i - 1 + mentionHits.length) % mentionHits.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const pick = mentionHits[mentionIdx] || mentionHits[0];
        if (pick) pickMention(pick);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey && menu !== "mention") { e.preventDefault(); submit(); return; }
    if (e.key === "Escape") { setMenu(null); setUI({ composerQuote: null }); }
  };

  const onChange = (v: string) => {
    setText(v);
    const m = v.slice(0, ta.current?.selectionStart ?? v.length).match(/@([\w./-]*)$/);
    if (m) {
      setMenu("mention");
      setMentionQ(m[1]);
      setMentionIdx(0);
    } else if (menu === "mention") {
      setMenu(null);
    }
  };

  const pickMention = (hit: { kind: "file" | "skill"; label: string }) => {
    setText((t) => t.replace(/@([\w./-]*)$/, `@${hit.label} `));
    if (hit.kind === "file") {
      setAttached((a) => [...new Set([...a, hit.label])]);
      setFileState(chatId, hit.label, "context");
    } else {
      patchChat(chatId, (c) => { const cur = c.enabledSkills ?? []; if (!cur.includes(hit.label)) c.enabledSkills = [...cur, hit.label]; });
    }
    setMenu(null);
    ta.current?.focus();
  };

  const pinned = chat?.enabledSkills ?? [];
  const toggleSkill = (name: string) =>
    patchChat(chatId, (c) => {
      const cur = c.enabledSkills ?? [];
      c.enabledSkills = cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name];
    });

  const [viewH, setViewH] = useState(() => (window.visualViewport?.height ?? window.innerHeight));
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const h = () => setViewH(vv.height);
    vv.addEventListener("resize", h);
    return () => vv.removeEventListener("resize", h);
  }, []);
  const menuTop = useMemo(() => {
    if (!menu) return undefined;
    if (!wrap.current) return undefined;
    const r = wrap.current.getBoundingClientRect();
    return r.top - 6;
  }, [menu, attached.length, viewH]);
  void viewH; // keep subscription live

  const narrow = viewH < 700 || window.innerWidth < 900;
  const menuStyle = (anchor: "left" | "right"): React.CSSProperties => {
    const base: React.CSSProperties = {};
    if (narrow && menuTop !== undefined) {
      // Mobile: full-width bottom sheet positioned just above the composer
      base.position = "fixed";
      base.left = 8;
      base.right = 8;
      base.top = undefined;
      base.bottom = viewH - menuTop;
      base.width = "auto";
      base.maxHeight = "58vh";
    } else if (anchor === "right") {
      base.right = 34;
    } else {
      base.left = 0;
    }
    return base;
  };

  const body = (
    <div className="composer" ref={wrap} style={inline ? { boxShadow: "none" } : undefined}>
      {(quote || attached.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "2px 4px" }}>
          {quote && (
            <span className="chip" data-on="true">
              <I.quote size={11} />{quote.text.slice(0, 46)}{quote.text.length > 46 ? "…" : ""}
              <button className="icon-btn sm" onClick={() => setUI({ composerQuote: null })}><I.x size={10} /></button>
            </span>
          )}
          {attached.map((p) => (
            <span className="chip" key={p}>
              <I.file size={11} />{p.split("/").pop()}
              <button className="icon-btn sm" onClick={() => setAttached((a) => a.filter((x) => x !== p))}><I.x size={10} /></button>
            </span>
          ))}
        </div>
      )}

      <textarea ref={ta} value={text} rows={1} onChange={(e) => onChange(e.target.value)} onKeyDown={onKey} spellCheck={false} autoFocus={!inline} />

      <div className="composer-row" style={{ position: "relative" }}>
        <button className="icon-btn" data-active={menu === "plus"} onClick={() => setMenu(menu === "plus" ? null : "plus")}><I.plus size={16} /></button>
        <button className="icon-btn" data-active={menu === "tools"} onClick={() => setMenu(menu === "tools" ? null : "tools")}><I.tools size={16} /></button>
        <span className="grow" />
        <button className="icon-btn" title="Skills" data-active={menu === "knowledge"} onClick={() => setMenu(menu === "knowledge" ? null : "knowledge")}><I.knowledge size={16} /></button>
        {busy ? (
          <button className="send" onClick={() => stopGeneration(chatId)}><I.stop size={14} /></button>
        ) : (
          <button className="send" data-idle={!text.trim()} onClick={submit}><I.send size={16} /></button>
        )}

        {menu === "plus" && (
          <div className="pop menu" style={menuStyle("left")}>
            <button className="menu-item" onClick={() => fileIn.current?.click()}><I.file size={14} />Upload a file<span className="dim">image · pdf · docx · xlsx · code</span></button>
            <button className="menu-item" onClick={() => { setText((t) => t + "@"); setMenu("mention"); setMentionQ(""); ta.current?.focus(); }}>
              <I.spark size={14} />Mention a workspace file<span className="dim">@</span>
            </button>
            <div style={{ borderTop: "1px solid var(--line-soft)", margin: "6px 0" }} />
            {files.slice(0, 6).map((f) => (
              <button key={f.path} className="menu-item" onClick={() => { setAttached((a) => [...new Set([...a, f.path])]); setFileState(chatId, f.path, "context"); setMenu(null); }}>
                <span className="dot" data-state={f.state} /> {f.path}
              </button>
            ))}
          </div>
        )}

        {menu === "tools" && (
          <div className="pop menu" style={menuStyle("left")}>
            <div className="label" style={{ padding: "4px 10px 6px" }}>tools</div>
            {["web_search · web_fetch · web_crawl · site_search", "edit_file · read_file · apply_diff · list_files", "run_python (numpy · pandas · matplotlib)", "artifact · open_canvas (charts · html · embeds)", "add_context · remove_context · compact_context"].map((t) => (
              <div key={t} className="menu-item" style={{ cursor: "default" }}><I.check size={13} />{t}</div>
            ))}
            <div style={{ borderTop: "1px solid var(--line-soft)", margin: "6px 0" }} />
            <button className="menu-item" onClick={() => { setUI({ modal: "mcp" }); setMenu(null); }}>
              <I.plug size={14} />MCP servers<span className="dim">{settings.mcp.filter((m) => m.enabled).length || "none"}</span>
            </button>
          </div>
        )}

        {menu === "knowledge" && (
          <div className="pop menu" style={menuStyle("right")}>
            <div className="label" style={{ padding: "4px 10px 6px" }}>skills</div>
            {SKILLS.map((s) => (
              <button key={s.name} className="menu-item" onClick={() => toggleSkill(s.name)} title={s.description}>
                <span className="dot" data-state={pinned.includes(s.name) || s.always ? "context" : "known"} />
                {s.name}
                <span className="dim">{s.always ? "always" : pinned.includes(s.name) ? "pinned" : ""}</span>
              </button>
            ))}
            <div style={{ borderTop: "1px solid var(--line-soft)", margin: "6px 0" }} />
            <button className="menu-item" onClick={() => { setUI({ modal: "skills" }); setMenu(null); }}><I.book size={14} />Browse skill bodies</button>
          </div>
        )}

        {menu === "mention" && mentionHits.length > 0 && (
          <div className="pop menu" style={menuStyle("left")}>
            {mentionHits.map((h, i) => (
              <button
                key={h.kind + h.label}
                className="menu-item"
                data-active={i === mentionIdx}
                onMouseEnter={() => setMentionIdx(i)}
                onClick={() => pickMention(h)}
              >
                <span className="dot" data-state={h.state ?? "known"} />{h.label}<span className="dim">{h.meta}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <input ref={fileIn} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
    </div>
  );

  if (inline) return body;
  return (
    <div className="composer-wrap" style={centered ? { top: "50%", bottom: "auto", transform: "translateY(-50%)", background: "none" } : undefined}>
      {body}
    </div>
  );
}
