import { useEffect, useRef, type CSSProperties, type SyntheticEvent } from "react";
import { isBusy, isMoving, onMove } from "../../lib/busy";

/* ---- A loop nobody can see (AENR-814, one player since AENR-860 1A) ----
   Shared by the Video sea and the Blender sea (AENR-827). One <video autoplay muted loop playsinline>
   and the browser's own loop, as sites that play smooth background video do (aktitouiliou.gr, Six
   Senses): the files are exact loops (the Video sea's crossfade is baked into the file, the Blender
   files are exactly one 8 s period), so the loop point can't be seen. It replaced two players that
   handed over with a crossfade — that blended two moments of the water for half a second at every
   loop, and kept two decoders busy.

   It keeps playing by itself: a watchdog restarts it when it stops showing new frames while the
   page is visible (a browser pausing a muted video on its own, a stall), and it resumes on
   visibilitychange, pageshow and focus. It holds still while the camera moves (AENR-866): a
   paused video is a picture the compositor moves for free. A file the device can't decode reports
   onFail; one it decodes too slowly in its first seconds reports onSlow, so the host can step down
   a size before the guest settles in — never mid-play. */
const WATCH_MS = 1000;
const STALL_MS = 1500;
const START_CHECK_S = 4;

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
  onFail,
  onSlow,
}: {
  className: string;
  style: CSSProperties;
  /** Best first; errors on a <source> don't reach the video, so the last one reports a failure. */
  sources: readonly LoopSource[];
  poster: string;
  rate: number;
  onFail: () => void;
  /** The device can't keep up with this file in its first seconds (over a quarter of the frames
   *  dropped, page changes aside): the host steps down a size. */
  onSlow?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const slowCb = useRef(onSlow);
  slowCb.current = onSlow;

  // Muted must be on the element before it loads, or iOS won't autoplay it (React sets only the property).
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.defaultMuted = true;
    v.muted = true;
    v.setAttribute("muted", "");
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (v) v.playbackRate = v.defaultPlaybackRate = rate;
  }, [rate]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    let lastFrame = performance.now();
    let frameCb = 0;
    // Each frame shown where the browser can say so (all current engines), else each time update.
    const rvfc = typeof v.requestVideoFrameCallback === "function";
    const seen = () => {
      lastFrame = performance.now();
      if (rvfc) frameCb = v.requestVideoFrameCallback(seen);
    };
    if (rvfc) frameCb = v.requestVideoFrameCallback(seen);
    else v.addEventListener("timeupdate", seen);

    const wanted = () => !document.hidden && !isMoving();
    const play = () => {
      if (!wanted()) return;
      lastFrame = performance.now();
      void v.play().catch(() => undefined);
    };
    // The browser may pause a muted video by itself (a hidden or covered window, power saving) and
    // not always resume it: whenever the page can be seen, it must be playing and showing new frames.
    const watch = window.setInterval(() => {
      if (!wanted()) return;
      if (v.paused || (v.readyState >= 2 && performance.now() - lastFrame > STALL_MS)) play();
    }, WATCH_MS);
    const onVis = () => (document.hidden ? v.pause() : play());
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", play);
    window.addEventListener("focus", play);
    const stopMove = onMove((moving) => (moving ? v.pause() : play()));

    // Only in its first seconds of playing: can this device keep up with this file?
    let checked = false;
    const startCheck = () => {
      if (checked || v.currentTime < START_CHECK_S) return;
      checked = true;
      v.removeEventListener("timeupdate", startCheck);
      const q = v.getVideoPlaybackQuality?.();
      if (q && !isBusy() && q.totalVideoFrames > 48 && q.droppedVideoFrames / q.totalVideoFrames > 0.25) slowCb.current?.();
    };
    v.addEventListener("timeupdate", startCheck);
    play();
    return () => {
      window.clearInterval(watch);
      if (frameCb) v.cancelVideoFrameCallback(frameCb);
      v.removeEventListener("timeupdate", seen);
      v.removeEventListener("timeupdate", startCheck);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", play);
      window.removeEventListener("focus", play);
      stopMove();
    };
  }, []);

  // The player's own error (a file that won't decode). React hands a <source>'s error to the
  // <video> too: a browser skipping a file it can't play is not a failure, the last source says so.
  const own = (e: SyntheticEvent<HTMLVideoElement>) => {
    if (e.target === e.currentTarget) onFail();
  };
  return (
    <video
      ref={ref}
      className={className}
      style={style}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      disablePictureInPicture
      onError={own}
    >
      {sources.map((s, i) => (
        <source key={s.src} src={s.src} type={s.type} onError={i === sources.length - 1 ? onFail : undefined} />
      ))}
    </video>
  );
}
