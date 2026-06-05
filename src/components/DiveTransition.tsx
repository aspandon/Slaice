import { Icon } from "../lib/icons";
import { useT } from "../app/store";
import { BeachBackdrop } from "./Beach";

/* Full-screen "dive into the beach" wipe, played when a guest starts a booking:
   the tenant scene scales up and washes over the screen while the wizard mounts
   behind it, then fades to reveal the immersive flow. Rendered at the app root so
   it survives the home→wizard route change. Pointer-transparent; the caller skips
   it entirely under reduced motion, navigating straight through. */
export function DiveTransition({ active }: { active: boolean }) {
  const t = useT();
  if (!active) return null;
  return (
    <div aria-hidden className="fixed inset-0 z-[100] pointer-events-none overflow-hidden animate-dive">
      <BeachBackdrop pos="absolute" className="inset-0 rounded-none" shoreline={0.6} />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/15 via-transparent to-navy-950/35" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="flex items-center gap-2.5 text-white font-display font-semibold text-lg drop-shadow-lg">
          <span className="animate-floaty"><Icon.umbrella size={24} /></span> {t("Setting up your beach…")}
        </div>
      </div>
    </div>
  );
}
