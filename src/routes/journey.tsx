import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageTitle } from "@/components/aegis/AppShell";
import { SessionPanel } from "@/components/aegis/SessionPanel";
import { Choice, Toggle } from "@/components/aegis/Toggle";
import { useAegis, activeSession, startSession } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { WalkMap } from "@/components/aegis/Location";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "Planned Journey — AEGIS" },
      { name: "description", content: "Plan a journey with optional destination, arrival time, check-ins and grace period." },
      { property: "og:title", content: "Planned Journey — AEGIS" },
      { property: "og:description", content: "Journeys with check-ins and trusted contacts." },
    ],
  }),
  component: Journey,
});

function Journey() {
  const t = useT();
  const active = useAegis(activeSession);
  const settings = useAegis((s) => s.settings);
  const [dest, setDest] = useState("");
  const [eta, setEta] = useState("");
  const [interval, setInterval] = useState<number>(settings.defaultInterval);
  const [grace, setGrace] = useState<number>(settings.graceMin);
  const [share, setShare] = useState(false);

  if (active) return (
    <div className="space-y-4">
      <PageTitle>{t("planned_journey")}</PageTitle>
      {active.type !== "journey" && <p className="text-sm text-warning">{t("session_exists")}</p>}
      <SessionPanel full />
      <WalkMap destination={active.destination} />
    </div>
  );

  return (
    <form className="space-y-5" onSubmit={(e) => {
      e.preventDefault();
      startSession({ type: "journey", intervalMin: interval, graceMin: grace, destination: dest.trim().slice(0, 120) || undefined, eta: eta || undefined, shareLocation: share && settings.locationConsent });
    }}>
      <PageTitle sub={t("planned_journey_desc")}>{t("planned_journey")}</PageTitle>
      <section className="card-aegis space-y-4 p-4">
        <label className="block space-y-1"><span className="text-sm font-semibold">{t("destination")}</span>
          <input className="field" value={dest} maxLength={120} onChange={(e) => setDest(e.target.value)} /></label>
        <label className="block space-y-1"><span className="text-sm font-semibold">{t("eta")}</span>
          <input type="time" className="field" value={eta} onChange={(e) => setEta(e.target.value)} /></label>
        <div className="space-y-2"><p className="text-sm font-semibold">{t("interval")}</p>
          <Choice label={t("interval")} value={interval} onChange={setInterval} options={[10, 15, 30, 60].map((v) => ({ v, label: `${v} ${t("minutes")}` }))} /></div>
        <div className="space-y-2"><p className="text-sm font-semibold">{t("grace")}</p>
          <Choice label={t("grace")} value={grace} onChange={setGrace} options={[2, 5, 10, 15].map((v) => ({ v, label: `${v} ${t("minutes")}` }))} /></div>
        <Toggle label={t("share_location")} checked={share && settings.locationConsent} onChange={setShare}
          hint={settings.locationConsent ? t("share_location_hint") : t("loc_consent_off")} />
      </section>
      <WalkMap destination={dest.trim() || undefined} />
      <button type="submit" className="btn btn-safe h-14 w-full text-lg">{t("start_journey")}</button>
    </form>
  );
}
