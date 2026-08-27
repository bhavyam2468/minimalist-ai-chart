import { useState } from "react";
import { Markdown } from "../md/Markdown";
import { I } from "./Icons";
import { siblings, threadPath, threadsFor, useApp } from "../lib/store";
import { editUser, regenerate } from "../lib/agent";
import { VIEW_LABEL, viewOf } from "../canvas/view";
import type { Chat, Node } from "../lib/types";
import { Composer } from "./Composer";

function Act({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className="icon-btn sm" title={label} onClick={onClick}>{icon}</button>;
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <Act
      icon={ok ? <I.check size={13} /> : <I.copy size={13} />}
      label="Copy"
      onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); }}
    />
  );
}

function Branches({ chat, node }: { chat: Chat; node: Node }) {
  const pick = useApp((s) => s.pickBranch);
  const { list, index } = siblings(chat, node);
  if (list.length < 2) return null;
  const go = (d: number) => {
    const next = list[(index + d + list.length) % list.length];
    pick(chat.id, node.parentId, next, node.threadId);
  };
  return (
    <span className="branch">
      <button className="icon-btn sm" onClick={() => go(-1)}><I.left size={12} /></button>
      {index + 1}/{list.length}
      <button className="icon-btn sm" onClick={() => go(1)}><I.right size={12} /></button>
    </span>
  );
}

function ToolTrace({ node }: { node: Node }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!node.toolCalls?.length) return null;
  return (
    <div className="trace">
      {node.toolCalls.map((t) => {
        const arg = Object.values(t.args || {})[0];
        const hint = typeof arg === "string" ? arg.slice(0, 68) : Array.isArray(arg) ? arg.join(", ").slice(0, 68) : "";
        return (
          <div key={t.id}>
            <div className="trace-row" data-running={t.status === "running"} onClick={() => setOpen(open === t.id ? null : t.id)} style={{ cursor: "pointer" }}>
              {t.name.startsWith("web") || t.name === "site_search" ? <I.globe size={13} /> :
               t.name === "canvas" ? <I.canvas size={13} /> :
               t.name.includes("skill") ? <I.spark size={13} /> :
               t.name.includes("context") ? <I.compact size={13} /> : <I.file size={13} />}
              <b>{t.name}</b>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hint}</span>
              {t.ms != null && <span style={{ marginLeft: "auto", opacity: .6 }}>{t.ms}ms</span>}
            </div>
            {open === t.id && <div className="trace-out">{t.output || "…"}</div>}
          </div>
        );
      })}
    </div>
  );
}

function ArtifactChips({ chat, node }: { chat: Chat; node: Node }) {
  const openCanvas = useApp((s) => s.openCanvas);
  if (!node.artifactIds?.length) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {node.artifactIds.map((id: string) => {
        const a = chat.artifacts[id];
        if (!a) return null;
        const f = a.kind === "file" ? chat.files[a.ref] : undefined;
        const v = viewOf(a.ref, f);
        return (
          <button key={id} className="canvas-thumb" title={a.ref} onClick={() => openCanvas({ kind: "artifact", id })}>
            {a.kind === "url" ? <I.globe size={14} /> : <I.canvas size={14} />} {a.title}
            <span style={{ color: "var(--text-faint)", fontSize: "var(--fs-xs)" }}>{VIEW_LABEL[v] || "link"}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Turn({ chat, node }: { chat: Chat; node: Node; threadId?: string | null }) {
  const streamId = useApp((s) => s.streamId);
  const busy = useApp((s) => s.busy[chat.id]);
  const createThread = useApp((s) => s.createThread);
  const setUI = useApp((s) => s.setUI);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.content);

  const streaming = streamId === node.id;
  const threads = threadsFor(chat, node.id);

  const openThread = () => {
    const id = createThread(chat.id, node.id);
    setUI({ activeThreadId: id });
  };

  if (node.role === "user") {
    return (
      <div className="turn user" data-node={node.id}>
        {node.quote && <div className="quote-note">“{node.quote.slice(0, 220)}”</div>}
        {!!node.attachments?.length && (
          <div className="attach-row">
            {node.attachments.map((p) => {
              const f = chat.files[p];
              if (!f) return null;
              return <span className="attach" key={p}>{f.dataUrl ? <img src={f.dataUrl} alt="" /> : <I.file size={12} />}{f.path.split("/").pop()}</span>;
            })}
          </div>
        )}
        {editing ? (
          <div className="bubble editing">
            <textarea
              autoFocus value={draft} rows={Math.min(10, draft.split("\n").length + 1)}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); setEditing(false); editUser(chat.id, node.id, draft); }
                if (e.key === "Escape") { setEditing(false); setDraft(node.content); }
              }}
            />
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn" onClick={() => { setEditing(false); setDraft(node.content); }}>cancel</button>
              <button className="btn primary" onClick={() => { setEditing(false); editUser(chat.id, node.id, draft); }}>branch</button>
            </div>
          </div>
        ) : (
          <div className="bubble">{node.content}</div>
        )}
        <div className="acts">
          <Branches chat={chat} node={node} />
          <CopyBtn text={node.content} />
          <Act icon={<I.edit size={13} />} label="Edit → new branch" onClick={() => { setDraft(node.content); setEditing(true); }} />
          <Act icon={<I.thread size={13} />} label="Open a thread here" onClick={openThread} />
        </div>
        {threads.map((t) => <ThreadView key={t.id} chat={chat} threadId={t.id} />)}
      </div>
    );
  }

  return (
    <div className="turn" data-node={node.id}>
      <ToolTrace node={node} />
      {!node.content && streaming && !node.toolCalls?.length && (
        <div className="thinking"><i /><i /><i /></div>
      )}
      {node.content && <Markdown text={node.content} streaming={streaming} animate={streaming} />}
      {node.error && <div className="trace-out" style={{ color: "var(--err)" }}>{node.error}</div>}
      <ArtifactChips chat={chat} node={node} />
      {!streaming && (
        <div className="acts">
          <Branches chat={chat} node={node} />
          <CopyBtn text={node.content} />
          <Act icon={<I.refresh size={13} />} label="Regenerate → new branch" onClick={() => !busy && regenerate(chat.id, node.id)} />
          <Act icon={<I.thread size={13} />} label="Open a thread here" onClick={openThread} />
        </div>
      )}
      {threads.map((t) => <ThreadView key={t.id} chat={chat} threadId={t.id} />)}
    </div>
  );
}

export function ThreadView({ chat, threadId }: { chat: Chat; threadId: string }) {
  const th = chat.threads[threadId];
  const patchThread = useApp((s) => s.patchThread);
  const path = threadPath(chat, threadId);
  if (!th) return null;
  return (
    <div className="thread">
      <div className="thread-head">
        <button className="icon-btn sm" onClick={() => patchThread(chat.id, threadId, { collapsed: !th.collapsed })}>
          {th.collapsed ? <I.right size={12} /> : <I.down size={12} />}
        </button>
        <I.thread size={12} />
        <span>thread · {path.filter((n) => n.role === "user").length || 0} turns · isolated context</span>
      </div>
      {!th.collapsed && (
        <>
          {th.quote && <div className="quote-note">“{th.quote.slice(0, 300)}”</div>}
          {path.map((n) => <Turn key={n.id} chat={chat} node={n} threadId={threadId} />)}
          <Composer chatId={chat.id} threadId={threadId} inline />
        </>
      )}
    </div>
  );
}
