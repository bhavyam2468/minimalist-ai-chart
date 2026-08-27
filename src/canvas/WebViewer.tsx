import { useEffect, useMemo, useState } from "react";
import { Markdown } from "../md/Markdown";
import { I } from "../ui/Icons";
import { hostOf, webFetch } from "../lib/web";
import { useApp } from "../lib/store";
import { copyToClipboard } from "../lib/clipboard";
import { youtubeId } from "../md/parse";

/* ===========================================================================
   WebViewer — a web or video source inside the floating canvas.

   Fix for YouTube Error 153:
   - Modern YouTube embeds strictly require `referrerPolicy="strict-origin-when-cross-origin"`.
   - Stripped problematic query parameters (`enablejsapi=1` without origin validation).
   - Uses standard `www.youtube.com/embed/{id}` with optional privacy toggle.
   - Plays natively edge-to-edge inside the canvas.
   ========================================================================= */

export type WebTab = "video" | "reader" | "live";

export function WebViewer({
  url,
  title,
  tab: controlledTab,
  onTabChange,
  hideBar = false,
}: {
  url: string;
  title?: string;
  tab?: WebTab;
  onTabChange?: (tab: WebTab) => void;
  hideBar?: boolean;
}) {
  const key = useApp((s) => s.settings.firecrawlKey);

  // Video source detection
  const ytId = useMemo(() => youtubeId(url), [url]);
  const vimeoId = useMemo(() => url.match(/(?:vimeo\.com\/)(\d+)/)?.[1], [url]);
  const isDirectVideo = useMemo(() => /\.(mp4|webm|ogg|mov|m4v)($|\?)/i.test(url), [url]);
  const hasVideo = Boolean(ytId || vimeoId || isDirectVideo);

  // Mode state
  const [internalTab, setInternalTab] = useState<WebTab>(hasVideo ? "video" : "reader");
  const tab = controlledTab ?? internalTab;
  const setTab = (t: WebTab) => {
    setInternalTab(t);
    onTabChange?.(t);
  };

  const [useNocookie, setUseNocookie] = useState(false);
  const [md, setMd] = useState<string | null>(null);
  const [head, setHead] = useState(title || (ytId ? "YouTube Video" : hostOf(url)));
  const [err, setErr] = useState<string | null>(null);
  const [frameBlocked, setFrameBlocked] = useState(false);
  const [probing, setProbing] = useState(false);

  useEffect(() => {
    if (hasVideo && !controlledTab) setInternalTab("video");
  }, [hasVideo, controlledTab, url]);

  // Fetch page markdown notes
  useEffect(() => {
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

  // Probe whether the site allows framing in "live" mode
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

  // YouTube Embed URL (Clean params, strict-origin, no JS API mismatch)
  const ytEmbedSrc = useMemo(() => {
    if (!ytId) return "";
    const base = useNocookie ? "https://www.youtube-nocookie.com" : "https://www.youtube.com";
    return `${base}/embed/${ytId}?autoplay=1&rel=0&playsinline=1`;
  }, [ytId, useNocookie]);

  const faviconUrl = ytId
    ? "https://www.youtube.com/s/desktop/9b47a06f/img/favicon_32x32.png"
    : `https://www.google.com/s2/favicons?domain=${hostOf(url)}&sz=32`;

  return (
    <div className="fe" style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Top bar is only shown when hideBar is false (e.g. non-floating full view) */}
      {!hideBar && (
        <div className="fe-bar">
          <img className="src-fav" src={faviconUrl} alt="" />
          <span
            className="fe-tag"
            style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
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
      )}

      <div
        className="fe-body"
        style={{
          padding: tab === "video" || tab === "live" ? 0 : undefined,
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      >
        {/* Native Embedded Video Player */}
        {tab === "video" && (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#000",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {ytId ? (
              <>
                <iframe
                  key={ytEmbedSrc}
                  src={ytEmbedSrc}
                  title={head}
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  style={{ width: "100%", height: "100%", border: 0, background: "#000" }}
                />
                {/* Fallback helper if user's browser has strict privacy settings */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 8,
                    right: 12,
                    display: "flex",
                    gap: 6,
                    opacity: 0.25,
                    transition: "opacity 0.2s ease",
                    zIndex: 10,
                  }}
                  className="yt-fallback-pills"
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "0.25";
                  }}
                >
                  <button
                    onClick={() => setUseNocookie((v) => !v)}
                    style={{
                      background: "rgba(0,0,0,0.7)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 4,
                      color: "#999",
                      fontSize: 10,
                      padding: "2px 6px",
                      cursor: "pointer",
                    }}
                    title={useNocookie ? "Currently using youtube-nocookie. Click to use standard embed" : "Currently using standard embed. Click to use nocookie"}
                  >
                    {useNocookie ? "using nocookie" : "using standard"}
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{
                      background: "rgba(0,0,0,0.7)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 4,
                      color: "#999",
                      fontSize: 10,
                      padding: "2px 6px",
                      textDecoration: "none",
                    }}
                  >
                    open in yt ↗
                  </a>
                </div>
              </>
            ) : vimeoId ? (
              <iframe
                src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1`}
                title={head}
                referrerPolicy="strict-origin-when-cross-origin"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                style={{ width: "100%", height: "100%", border: 0, background: "#000" }}
              />
            ) : isDirectVideo ? (
              <video
                src={url}
                controls
                autoPlay
                style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
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
              <div className="fe-preview" style={{ paddingTop: hideBar ? 48 : undefined }}>
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
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
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
