import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { MapPin, WifiOff } from "lucide-react";
import { useAegis, updateSettings, requestLocation, stopSharing, activeSession, getState } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { osmEmbed, mapLink } from "@/lib/format";

export type PermState = "granted" | "denied" | "prompt" | "unsupported" | "unknown";

/** Reads the real OS/browser permission state; reacts to revocation. */
export function useLocPermission(): PermState {
  const [st, setSt] = useState<PermState>("unknown");
  useEffect(() => {
    if (!("geolocation" in navigator)) { setSt("unsupported"); return; }
    let perm: PermissionStatus | null = null;
    const apply = () => {
      if (!perm) return;
      setSt(perm.state as PermState);
      if (perm.state === "denied" && getState().settings.locationConsent) {
        updateSettings({ locationConsent: false });
        if (activeSession(getState())?.shareLocation) stopSharing();
      }
    };
    navigator.permissions?.query({ name: "geolocation" as PermissionName })
      .then((p) => { perm = p; apply(); p.onchange = apply; })
      .catch(() => setSt("prompt"));
    return () => { if (perm) perm.onchange = null; };
  }, []);
  return st;
}

/** First-launch explanation. Continue triggers the browser prompt from a user tap; Not now never re-prompts. */
export function LocationOnboarding() {
  const t = useT();
  const onboarded = useAegis((s) => s.settings.onboarded);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || onboarded || path === "/sos" || path.startsWith("/invite")) return null;
  const done = () => updateSettings({ onboarded: true });
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="ob-title" className="fixed inset-0 z-[60] flex items-end justify-center bg-background/90 p-3 backdrop-blur sm:items-center">
      <div className="card-aegis w-full max-w-md space-y-4 p-5">
        <MapPin className="size-8 text-safe" aria-hidden />
        <h2 id="ob-title" className="text-xl font-bold">{t("ob_title")}</h2>
        <p className="text-sm">{t("ob_body")}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>{t("ob_b1")}</li><li>{t("ob_b2")}</li><li>{t("ob_b3")}</li><li>{t("ob_b4")}</li>
        </ul>
        <p className="text-xs text-muted-foreground">{t("ob_note")}</p>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-outline" onClick={done}>{t("ob_not_now")}</button>
          <button className="btn btn-safe" disabled={busy} onClick={async () => {
            setBusy(true);
            const loc = await requestLocation();
            updateSettings({ locationConsent: !!loc, onboarded: true });
          }}>{t("ob_continue")}</button>
        </div>
        <Link to="/sos" onClick={done} className="btn btn-danger w-full">SOS · 112</Link>
      </div>
    </div>
  );
}

export function useOnline() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const u = () => setOn(navigator.onLine);
    u(); window.addEventListener("online", u); window.addEventListener("offline", u);
    return () => { window.removeEventListener("online", u); window.removeEventListener("offline", u); };
  }, []);
  return on;
}

export function OfflineBanner() {
  const t = useT();
  if (useOnline()) return null;
  return <div role="status" className="flex items-center justify-center gap-2 border-b bg-surface px-3 py-1.5 text-xs text-warning"><WifiOff className="size-3.5" aria-hidden />{t("offline_banner")}</div>;
}

/** Optional map for Quick Walk / Planned Journey. No routes are drawn in-app unless Google Maps is configured. */
export function WalkMap({ destination }: { destination?: string | undefined }) {
  const t = useT();
  const consent = useAegis((s) => s.settings.locationConsent);
  const last = useAegis((s) => s.lastKnown);
  const gKey = import.meta.env["VITE_GOOGLE_MAPS_BROWSER_KEY"] as string | undefined;
  const dir = destination
    ? `https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${encodeURIComponent(destination)}${last ? `&origin=${last.lat},${last.lng}` : ""}`
    : null;
  return (
    <section className="card-aegis space-y-2 p-3">
      <h2 className="text-sm font-bold">{t("map_title")}</h2>
      {consent && last ? (
        <div className="overflow-hidden rounded-lg border">
          <iframe title={t("map_title")} src={osmEmbed(last)} className="h-44 w-full" loading="lazy" />
          <a href={mapLink(last)} target="_blank" rel="noreferrer" className="block p-2 text-xs text-safe underline">{t("open_map")} · ±{last.acc} m</a>
        </div>
      ) : <p className="text-xs text-muted-foreground">{t("map_no_loc")}</p>}
      {!gKey && <p className="text-xs text-muted-foreground">{t("maps_unconfigured")}</p>}
      {dir && <a href={dir} target="_blank" rel="noreferrer" className="btn btn-soft w-full">{t("directions_gmaps")}</a>}
      {dir && <p className="text-[11px] text-muted-foreground">{t("route_note")}</p>}
      <Link to="/nearby" className="text-xs text-safe underline">{t("nearby_link")}</Link>
    </section>
  );
}
