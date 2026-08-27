import { useEffect, useState } from "react";
import { Markdown } from "../md/Markdown";
import { I } from "../ui/Icons";
import { hostOf, webFetch } from "../lib/web";
import { useApp } from "../lib/store";
import { copyToClipboard } from "../lib/clipboard";

/* ===========================================================================
   WebViewer — a source opened inside the canvas.

   "reader"  always works: the page is pulled through the same fetch pipeline
             the agent uses and rendered as markdown inside our design system.
   "live"    an actual iframe. Most large sites send X-Frame-Options / CSP
             frame-ancestors and will refuse — the browser gives no readable
             error, so we detect a silent failure with a load probe and offer
             the reader or an external redirect instead.
   ========================================================================= */

type Tab = "reader" | "live";

export function WebViewer({ url, title }: { url: string; title?: string }) {
  const key = useApp((s) => s.settings.firecrawlKey);
  const [tab, setTab] = useState<Tab>("reader");
  const [md, setMd] = useState<string | null>(null);
  const [head, setHead] = useState(title || hostOf(url));
  const [err, setErr] = useState<string | null>(null);
  const [frameBlocked, setFrameBlocked] = useState(false);
  const [probing, setProbing] = useState(false);

  useEffect(() => {
    let dead = false;
    setMd(null); setErr(null);
    webFetch(url, key)
      .then((r) => { if (dead) return; setMd(r.markdown); if (r.title) setHead(r.title); })
      .catch((e) => { if (!dead) setErr(e.message); });
    return () => { dead = true; };
  }, [url, key]);

  // Probe whether the site allows framing.
  useEffect(() => {
    if (tab !== "live") return;
    setFrameBlocked(false);
    setProbing(true);
    const t = setTimeout(() => { setProbing(false); setFrameBlocked(true); }, 3500);
    return () => clearTimeout(t);
  }, [tab, url]);

  return (
    <div className="fe">
      <div className="fe-bar">
        <img className="src-fav" src={`https://www.google.com/s2/favicons?domain=${hostOf(url)}&sz=32`} alt="" />
        <span className="fe-tag" style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hostOf(url)}</span>
        <span className="grow" />
        <div className="fe-seg">
          <button data-active={tab === "reader"} onClick={() => setTab("reader")}>reader</button>
          <button data-active={tab === "live"} onClick={() => setTab("live")}>live</button>
        </div>
        <button className="icon-btn sm" title="Copy link" onClick={() => copyToClipboard(url)}><I.copy size={13} /></button>
        <a className="icon-btn sm" href={url} target="_blank" rel="noreferrer noopener" title="Open in a new tab">↗</a>
      </div>

      <div className="fe-body" style={{ padding: tab === "live" ? 0 : undefined }}>
        {tab === "reader" && (
          <>
            {!md && !err && <div className="thinking" style={{ padding: 18 }}><i /><i /><i /></div>}
            {err && (
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
                <div style={{ color: "var(--err)", fontSize: "var(--fs-sm)" }}>could not read this page — {err}</div>
                <a className="btn" href={url} target="_blank" rel="noreferrer noopener">open {hostOf(url)} ↗</a>
              </div>
            )}
            {md && (
              <div className="fe-preview">
                <h1 className="md-h md-h1" style={{ marginBottom: 6 }}>{head}</h1>
                <a className="md-a" href={url} target="_blank" rel="noreferrer noopener" style={{ fontSize: "var(--fs-sm)", color: "var(--text-faint)" }}>{url}</a>
                <div style={{ height: 18 }} />
                <Markdown text={md} animate={false} />
              </div>
            )}
          </>
        )}

        {tab === "live" && (
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <iframe
              src={url}
              title={head}
              onLoad={() => { setProbing(false); }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer"
              style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
            />
            {(probing || frameBlocked) && (
              <div style={{
                position: "absolute", inset: 0, display: "grid", placeItems: "center",
                background: "var(--surface)", gap: 12, textAlign: "center", padding: 20,
                pointerEvents: frameBlocked ? "auto" : "none",
              }}>
                {probing && !frameBlocked && <div className="thinking"><i /><i /><i /></div>}
                {frameBlocked && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
                    <div style={{ color: "var(--text-dim)", fontSize: "var(--fs-sm)", maxWidth: 380 }}>
                      {hostOf(url)} refuses to be embedded (X-Frame-Options / CSP). Use reader mode, or open it in a new tab.
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn" onClick={() => setTab("reader")}>read here</button>
                      <a className="btn primary" href={url} target="_blank" rel="noreferrer noopener">open ↗</a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
