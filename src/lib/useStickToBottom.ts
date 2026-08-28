import { useEffect, useRef } from "react";
import Lenis from "lenis";

/**
 * Keeps a transcript pinned to its bottom while new content streams in, and
 * gets out of the way the moment the user scrolls up to read.
 *
 * "Stuck" means the bottom is within 160px of the viewport — so a small
 * overshoot while reading the last message does not detach. When stuck,
 * auto-scroll is instant during streaming (`behavior: "auto"`) and smooth
 * once a turn completes, so the tail of a long reply glides into place
 * instead of snapping.
 *
 * Smooth-wheel scrolling is layered on with Lenis when it is available; if it
 * is not (or it throws), the scroller still works natively.
 *
 * `signal` is anything that grows as content arrives — pass the character
 * length of the last message, so each streamed token re-runs the follow.
 * Returns the ref to attach to the scrolling element.
 */
export function useStickToBottom({ streamId, signal }: { streamId: string | null; signal: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  /* Track whether the user is parked at the bottom. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  /* Lenis smooth-wheel for the lifetime of the scroller. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let lenis: Lenis | null = null;
    let reqId = 0;
    try {
      lenis = new Lenis({
        wrapper: el,
        content: (el.firstElementChild as HTMLElement) || el,
        smoothWheel: true,
        lerp: 0.12,
        syncTouch: false,
      });
      const raf = (time: number) => {
        lenis?.raf(time);
        reqId = requestAnimationFrame(raf);
      };
      reqId = requestAnimationFrame(raf);
    } catch {
      /* Lenis unavailable — native scrolling is fine. */
    }

    return () => {
      if (reqId) cancelAnimationFrame(reqId);
      lenis?.destroy();
    };
  }, []);

  /* Follow new content: the growing tail of the last node, or a new node. */
  useEffect(() => {
    if (!stick.current) return;
    const el = ref.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: streamId ? "auto" : "smooth" });
  }, [signal, streamId]);

  return { ref, isStuck: () => stick.current };
}
