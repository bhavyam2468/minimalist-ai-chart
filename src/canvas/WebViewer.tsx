import { useEffect, useMemo, useState } from "react";
import { Markdown } from "../md/Markdown";
import { I } from "../ui/Icons";
import { hostOf, webFetch } from "../lib/web";
import { useApp } from "../lib/store";
import { copyToClipboard } from "../lib/clipboard";
import { youtubeId } from "../md/parse";

/* ===========================================================================
   WebViewer — a source opened inside the floating canvas.

   Supports:
   1. "video"   native embedded player for YouTube, Vimeo, and direct MP4/WebM videos.
                YouTube uses youtube-nocookie.com/embed with full autoplay/pip permissions,
                bypassing standard watch page X-Frame-Options blocks.
   2. "reader"  clean markdown extracted from the page.
   3. "live"    sandboxed iframe for framing-permissive web pages with fallback probe.
   ========================================================================= */

type Tab = "video" | "reader" | "live";

export function WebViewer({ url, title }: { url: string; title?: string }) {
  const key = useApp((s) => s.settings.firecrawlKey);

  // Video source detection
  const ytId = useMemo(() => youtubeId(url), [url]);
  const vimeoId = useMemo(() => url.match(/(?:vimeo\.com\/)(\d+)/)?.[1], [url]);
  const isDirectVideo = useMemo(() => /\.(mp4|webm|ogg|mov|m4v)($|\?)/i.test(url), [url]);
  const hasVideo = Boolean(ytId || vimeoId || isDirectVideo);

  // Default to video tab if a video source is detected, otherwise reader
  const [tab, setTab] = useState<Tab>(hasVideo ? "video" : "reader");
  const [md, setMd] = useState<string | null>(null);
  const [head, setHead] = useState(title || (ytId ? "YouTube Video" : hostOf(url)));
  const [err, setErr] = useState<string | null>(null);
  const [frameBlocked, setFrameBlocked] = useState(false);
  const [probing, setProbing] = useState(false);

  useEffect(() => {
    if (hasVideo) setTab("video");
    else setTab("reader");
  }, [hasVideo, url]);

  useEffect(() => {
    // If it's a pure video, only fetch reader notes on demand or if tab is reader
    if (hasVideo && tab !== "reader") return;
    let dead = false;
    setMd(null);
    setErr(null);
    webFetch(url, key)
      .then((r) => {
        if (dead) return;
        setMd(r.markdown);
        if (r.title) setHead(r.title);
      })
      .catch((e) => {
        if (!dead) setErr(e.message);
      });
    return () => {
      dead = true;
    };
  }, [url, key, hasVideo, tab]);

  // Probe whether the site allows framing in "live" tab.
  useEffect(() => {
    if (tab !== "live") return;
    setFrameBlocked(false);
    setProbing(true);
    const t = setTimeout(() => {
      setProbing(false);
      setFrameBlocked(true);
    }, 3500);
    return () => clearTimeout(t);
  }, [tab, url]);

  const faviconUrl = ytId
    ? "https://www.youtube.com/s/desktop/9b47a06f/img/favicon_32x32.png"
    : `https://www.google.com/s2/favicons?domain=${hostOf(url)}&sz=32`;

  return (
    <div className="fe">
      <div className="fe-bar">
        <img className="src-fav" src={faviconUrl} alt="" />
        <span
          className="fe-tag"
          style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {ytId ? "YouTube" : hostOf(url)}
        </span>
        <span className="grow" />
        <div className="fe-seg">
          {hasVideo && (
            <button data-active={tab === "video"} onClick={() => setTab("video")}>
              video
            </button>
          )}
          <button data-active={tab === "reader"} onClick={() => setTab("reader")}>
            {hasVideo ? "notes" : "reader"}
          </button>
          <button data-active={tab === "live"} onClick={() => setTab("live")}>
            live
          </button>
        </div>
        <button className="icon-btn sm" title="Copy link" onClick={() => copyToClipboard(url)}>
          <I.copy size={13} />
        </button>
        <a className="icon-btn sm" href={url} target="_blank" rel="noreferrer noopener" title="Open in a new tab">
          ↗
        </a>
      </div>

      <div className="fe-body" style={{ padding: tab === "video" || tab === "live" ? 0 : undefined }}>
        {/* Native Embedded Video Player */}
        {tab === "video" && (
          <div style={{ width: "100%", height: "100%", background: "#000", position: "relative", overflow: "hidden" }}>
            {ytId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`}
                title={head}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{ width: "100%", height: "100%", border: 0 }}
              />
            ) : vimeoId ? (
              <iframe
                src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1`}
                title={head}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                style={{ width: "100%", height: "100%", border: 0 }}
              />
            ) : isDirectVideo ? (
              <video
                src={url}
                controls
                autoPlay
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-dim)" }}>
                No video stream found for this URL.
              </div>
            )}
          </div>
        )}

        {/* Reader / Markdown Notes */}
        {tab === "reader" && (
          <>
            {!md && !err && (
              <div className="thinking" style={{ padding: 18 }}>
                <i />
                <i />
                <i />
              </div>
            )}
            {err && (
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
                <div style={{ color: "var(--err)", fontSize: "var(--fs-sm)" }}>could not read page — {err}</div>
                {hasVideo ? (
                  <button className="btn primary" onClick={() => setTab("video")}>
                    play video
                  </button>
                ) : (
                  <a className="btn" href={url} target="_blank" rel="noreferrer noopener">
                    open {hostOf(url)} ↗
                  </a>
                )}
              </div>
            )}
            {md && (
              <div className="fe-preview">
                <h1 className="md-h md-h1" style={{ marginBottom: 6 }}>
                  {head}
                </h1>
                <a
                  className="md-a"
                  href={url}
                  target="_blank"
                  rel="noreferrer noopener"
                  style={{ fontSize: "var(--fs-sm)", color: "var(--text-faint)" }}
                >
                  {url}
                </a>
                <div style={{ height: 18 }} />
                <Markdown text={md} animate={false} />
              </div>
            )}
          </>
        )}

        {/* Live Raw Webpage Frame */}
        {tab === "live" && (
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <iframe
              src={url}
              title={head}
              onLoad={() => {
                setProbing(false);
              }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer"
              style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
            />
            {(probing || frameBlocked) && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  background: "var(--surface)",
                  gap: 12,
                  textAlign: "center",
                  padding: 20,
                  pointerEvents: frameBlocked ? "auto" : "none",
                }}
              >
                {probing && !frameBlocked && (
                  <div className="thinking">
                    <i />
                    <i />
                    <i />
                  </div>
                )}
                {frameBlocked && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
                    <div style={{ color: "var(--text-dim)", fontSize: "var(--fs-sm)", maxWidth: 380 }}>
                      {hostOf(url)} refuses to be embedded directly (X-Frame-Options / CSP).
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {hasVideo && (
                        <button className="btn primary" onClick={() => setTab("video")}>
                          play in video player
                        </button>
                      )}
                      <button className="btn" onClick={() => setTab("reader")}>
                        read notes
                      </button>
                      <a className="btn" href={url} target="_blank" rel="noreferrer noopener">
                        open ↗
                      </a>
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
