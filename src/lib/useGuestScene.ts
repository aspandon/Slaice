import { useApp } from "../app/store";
import { STILL_HOUR, type SceneFx, type WeatherKind } from "../data/beach";
import { useTenantFeatures } from "./useFeatures";

/* The weather and time of day the guest site shows (AENR-737). The tenant's
   "Live weather and time of day" switch (Platform › tenant › Modules & features) decides:
   on — the demo weather, the scene clock and the manager's scene switches;
   off — always a clear sunny day at 11:00, with no demo controls. Every guest
   surface reads the scene through this hook, never straight from the store. */
const STILL_FX: SceneFx = { weather: true, daytime: true };

export function useGuestScene(): {
  live: boolean;
  weather: WeatherKind;
  dayTime: number;
  sceneFx: SceneFx;
} {
  const { weather, dayTime, sceneFx } = useApp();
  const live = useTenantFeatures().feature("guest.liveScene");
  return live
    ? { live, weather, dayTime, sceneFx }
    : { live, weather: "sunny", dayTime: STILL_HOUR, sceneFx: STILL_FX };
}
