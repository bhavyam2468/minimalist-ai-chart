import { useState } from "react";
import { Markdown } from "../md/Markdown";
import { I } from "./Icons";
import { siblings, threadPath, threadsFor, useApp } from "../lib/store";
import { editUser, regenerate } from "../lib/agent";
import { copyToClipboard } from "../lib/clipboard";
import { VIEW_LABEL, viewOf } from "../canvas/view";
import type { Chat, Node } from "../lib/types";
import { Composer } from "./Composer";

function Act({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className="icon-btn sm" title={label} onClick={onClick}>{icon}</button>;
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  const handleCopy = async () => {
    const success = await copyToClipboard(text);
    if (success) {
      setOk(true);
      setTimeout(() => setOk(false), 1400);
    }
  };
  return (
    <Act
      icon={ok ? <I.check size={13} /> : <I.copy size={13} />}
      label={ok ? "Copied" : "Copy"}
      onClick={handleCopy}
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
  const calls = node.toolCalls;
  if (!calls?.length) return null;

  const [isOpen, setIsOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const running = calls.find((t) => t.status === "running");
  const hasError = calls.some((t) => t.status === "error");
  const totalMs = calls.reduce((acc, t) => acc + (t.ms || 0), 0);
  const statusMode = hasError ? "error" : running ? "running" : "done";

  return (
    <div className="trace-dropdown" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: 8 }}>
      <button
        type="button"
        className="trace-summary"
        data-running={!!running}
        data-error={hasError}
        data-status={statusMode}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Toggle tool call details"
        style={{
          display: "inline-flex",
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "nowrap",
          whiteSpace: "nowrap",
          gap: 7,
          height: 28,
          padding: "0 10px",
          cursor: "pointer",
        }}
      >
        <span className="trace-summary-icon" style={{ display: "inline-flex", alignItems: "center" }}>
          {running ? (
            <span className="trace-spinner" />
          ) : hasError ? (
            <span style={{ color: "var(--err, #ef4444)", display: "inline-flex", alignItems: "center" }}>
              <I.alert size={12} />
            </span>
          ) : (
            <span style={{ color: "var(--ok, #22c55e)", display: "inline-flex", alignItems: "center" }}>
              <I.check size={12} />
            </span>
          )}
        </span>
        <span
          className="trace-summary-text"
          style={{
            display: "inline-flex",
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "nowrap",
            whiteSpace: "nowrap",
            gap: 6,
          }}
        >
          {running ? (
            <>
              <b>{running.name}</b>
              <span className="trace-hint" style={{ whiteSpace: "nowrap" }}>
                {typeof Object.values(running.args || {})[0] === "string"
                  ? String(Object.values(running.args || {})[0]).slice(0, 48)
                  : "running..."}
              </span>
            </>
          ) : (
            <>
              <span style={{ whiteSpace: "nowrap" }}>
                {calls.length} {calls.length === 1 ? "tool call" : "tool calls"}
              </span>
              {totalMs > 0 && (
                <span className="trace-time" style={{ whiteSpace: "nowrap" }}>
                  · {totalMs > 1000 ? `${(totalMs / 1000).toFixed(1)}s` : `${totalMs}ms`}
                </span>
              )}
              {hasError && (
                <span className="trace-err-badge" style={{ color: "var(--err, #ef4444)", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" }}>
                  ({calls.filter((t) => t.status === "error").length} failed)
                </span>
              )}
            </>
          )}
        </span>
        <span className="trace-caret" style={{ display: "inline-flex", alignItems: "center", marginLeft: 4 }}>
          {isOpen ? <I.up size={12} /> : <I.down size={12} />}
        </span>
      </button>

      {isOpen && (
        <div className="trace-list" style={{ width: "100%", maxWidth: 640 }}>
          {calls.map((t) => {
            const arg = Object.values(t.args || {})[0];
            const hint =
              typeof arg === "string"
                ? arg.slice(0, 80)
                : Array.isArray(arg)
                ? arg.join(", ").slice(0, 80)
                : "";
            const isItemOpen = expandedItem === t.id;
            const isErr = t.status === "error";
            const isDone = t.status === "done";
            return (
              <div key={t.id} className="trace-item">
                <div
                  className="trace-row"
                  data-status={t.status}
                  data-running={t.status === "running"}
                  onClick={() => setExpandedItem(isItemOpen ? null : t.id)}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    flexWrap: "nowrap",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    className="trace-row-status-icon"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      color: isErr ? "var(--err, #ef4444)" : isDone ? "var(--ok, #22c55e)" : "var(--text-faint)",
                    }}
                  >
                    {t.status === "running" ? (
                      <span className="trace-spinner sm" />
                    ) : isErr ? (
                      <I.alert size={12} />
                    ) : (
                      <I.check size={12} />
                    )}
                  </span>
                  <b>{t.name}</b>
                  <span className="trace-hint-row">{hint}</span>
                  <span
                    className={`trace-badge ${isErr ? "err" : isDone ? "ok" : ""}`}
                    style={{
                      marginLeft: 6,
                      fontSize: 10,
                      color: isErr ? "var(--err, #ef4444)" : isDone ? "var(--ok, #22c55e)" : "inherit",
                    }}
                  >
                    {isErr ? "failed" : isDone ? "ok" : "running"}
                  </span>
                  {t.ms != null && <span className="trace-duration">{t.ms}ms</span>}
                  <span className="trace-row-toggle">{isItemOpen ? "−" : "+"}</span>
                </div>
                {isItemOpen && (
                  <div className="trace-out" style={{ borderColor: isErr ? "rgba(239, 68, 68, 0.3)" : undefined }}>
                    {t.argsRaw && t.argsRaw !== "{}" && (
                      <div className="trace-args">
                        <b>args:</b> {t.argsRaw}
                      </div>
                    )}
                    <div className="trace-result" style={{ color: isErr ? "var(--err, #ef4444)" : undefined }}>
                      {t.output || "…"}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
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
