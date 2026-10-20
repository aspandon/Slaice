import { useEffect, useRef, type CSSProperties, type SyntheticEvent } from "react";

/* ---- A loop nobody can see (AENR-814) ----
   Shared by the Video sea and the Blender sea (AENR-827). Two players take turns: shortly before
   the playing one ends, the other starts from the top and the two crossfade, so the guest never sees
   the browser jump back to the start (some browsers hitch for a frame on a plain `loop`). Only one
   decodes outside the half-second handover. Paused while the tab is hidden. A clip that is exactly
   periodic (`period`) hands over at the period instead, into the same moment of the loop. */
const HANDOVER = 0.5; // s

export interface LoopSource {
  src: string;
  type: string;
}

export function LoopVideo({
  className,
  style,
  sources,
  poster,
  rate,
  period,
  onFail,
  onSlow,
}: {
  className: string;
  style: CSSProperties;
  /** Best first; errors on a <source> don't reach the video, so the last one reports a failure. */
  sources: readonly LoopSource[];
  poster: string;
  rate: number;
  /** The loop's period (s) when the clip is exactly periodic and runs a tail of 1 s past it. */
  period?: number;
  onFail: () => void;
  /** The device decodes it too slowly (over a fifth of the frames dropped) — a 4K file on a
   *  decoder that can't keep up (AENR-856): the host steps down to a smaller file. */
  onSlow?: () => void;
}) {
  const a = useRef<HTMLVideoElement>(null);
  const b = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const va = a.current;
    const vb = b.current;
    if (!va || !vb) return;
    // A re-run (the wind changed the speed) keeps whichever player is showing in front.
    let front = vb.style.opacity === "1" ? vb : va;
    let back = front === va ? vb : va;
    let handing = false;
    let timer = 0;
    [va, vb].forEach((v) => (v.playbackRate = rate));
    if (!va.style.opacity) {
      va.style.opacity = "1";
      vb.style.opacity = "0";
    }
    void front.play().catch(() => undefined);
    const tick = () => {
      const d = front.duration;
      // A periodic clip (the Blender sea): it runs one tail past its period, and the other player
      // takes over at the same moment of the loop — so the two crossfade over identical frames.
      const at = period ? Math.min(period, d - HANDOVER * rate) : d - HANDOVER * rate;
      if (!handing && d && front.currentTime >= at) {
        handing = true;
        back.currentTime = period ? Math.max(0, front.currentTime - period) : 0;
        back.playbackRate = rate;
        void back.play().catch(() => undefined);
        back.style.opacity = "1";
        front.style.opacity = "0";
        const done = front;
        timer = window.setTimeout(
          () => {
            done.pause();
            done.currentTime = 0;
            [front, back] = [back, front];
            handing = false;
          },
          HANDOVER * 1000 + 60,
        );
      }
    };
    va.addEventListener("timeupdate", tick);
    vb.addEventListener("timeupdate", tick);
    const onVis = () => {
      if (document.hidden) [va, vb].forEach((v) => v.pause());
      else void front.play().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVis);
    // Measured on the playing player, from its own counts since it started.
    const slow = onSlow
      ? window.setInterval(() => {
          const q = front.getVideoPlaybackQuality?.();
          if (q && q.totalVideoFrames > 72 && q.droppedVideoFrames / q.totalVideoFrames > 0.2) onSlow();
        }, 3000)
      : 0;
    return () => {
      window.clearInterval(slow);
      window.clearTimeout(timer);
      va.removeEventListener("timeupdate", tick);
      vb.removeEventListener("timeupdate", tick);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onSlow is read when it fires
  }, [rate, period]);
  const list = (
    <>
      {sources.map((s, i) => (
        <source
          key={s.src}
          src={s.src}
          type={s.type}
          onError={i === sources.length - 1 ? onFail : undefined}
        />
      ))}
    </>
  );
  // The player's own error (a file that won't decode). React hands a <source>'s error to the
  // <video> too: a browser skipping a file it can't play is not a failure, the last source says so.
  const own = (e: SyntheticEvent<HTMLVideoElement>) => {
    if (e.target === e.currentTarget) onFail();
  };
  // Opacity is owned by the handover (set on the elements, never by a re-render); the filter keeps its glide.
  const fade = { transition: `opacity ${HANDOVER}s linear, filter 1s` };
  return (
    <>
      <video
        ref={a}
        className={className}
        style={{ ...style, ...fade }}
        poster={poster}
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onError={own}
      >
        {list}
      </video>
      <video
        ref={b}
        className={className}
        style={{ ...style, ...fade }}
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onError={own}
      >
        {list}
      </video>
    </>
  );
}
