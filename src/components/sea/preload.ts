import { blenderResOf, type SeaStyle, type TenantSea } from "../../domain/features";
import { LITE_SCENE_QUERY, prefersReducedMotion } from "../../lib/motion";

/* ============ Fetch the tenant's sea first (AENR-838) ============
   The sea is the first thing a guest sees, and each sea is its own lazy chunk (three.js for the
   Classic live water, the Coastal shader, the Video player and its poster, the Blender beach). Without help the chunk
   is only asked for once React has rendered the beach. This starts it as the app boots — in
   parallel with the language file — for the sea this tenant shows on this device, read from the
   saved demo state. Back-office roles skip it (they never see the beach); so do Save-Data,
   reduced motion and the still phone sea, which need no chunk at all. The same import() calls as
   the components', so the browser fetches each file once. */

const BASE = import.meta.env.BASE_URL;
const saveData = () =>
  !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

interface SavedTenant {
  id: string;
  sea?: TenantSea;
}
interface Saved {
  signedIn?: boolean;
  persona?: string;
  platform?: { siteTenant?: string; tenants?: SavedTenant[] };
}

export function preloadSavedSea() {
  let s: Saved = {};
  try {
    s = JSON.parse(localStorage.getItem("slaice.v1") || "{}") as Saved;
  } catch {
    /* no saved state: the defaults below */
  }
  // Only the guest pages and the sign-in screen draw the beach.
  if (s.signedIn && s.persona && s.persona !== "customer") return;
  if (saveData() || prefersReducedMotion()) return;
  const lite = window.matchMedia?.(LITE_SCENE_QUERY).matches ?? false;
  const tenant = s.platform?.tenants?.find((t) => t.id === s.platform?.siteTenant);
  const style: SeaStyle = tenant?.sea?.[lite ? "mobile" : "desktop"] ?? "classic";
  const quiet = () => undefined;
  if (style === "video") {
    // The poster is the video's first frame — on screen before a byte of the video plays.
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = `${BASE}sea/sea-poster.webp`;
    document.head.appendChild(link);
    void import("./VideoSea").catch(quiet);
  } else if (style === "blender") {
    // The rendered beach (AENR-827): its player, and the poster of the cut this screen uses.
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    // At the tenant's resolution for this device (AENR-844).
    const r = blenderResOf(tenant, lite ? "mobile" : "desktop");
    const suf = r === "standard" ? "" : `-${r}`;
    const cut = lite && window.innerHeight > window.innerWidth ? "beach-portrait" : "beach";
    link.href = `${BASE}sea/blender/${cut}${suf}-poster.webp`;
    document.head.appendChild(link);
    void import("./BlenderSea").catch(quiet);
  } else if (style === "coastal") {
    void import("./CoastalSea").catch(quiet);
  } else if (!lite && typeof WebGL2RenderingContext !== "undefined") {
    // Classic: the live three.js water on computers; phones keep the still sea (no chunk).
    void import("../LiveSeaCanvas").catch(quiet);
  }
}
