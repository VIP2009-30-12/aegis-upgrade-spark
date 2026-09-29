import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageTitle } from "@/components/aegis/AppShell";
import { SessionPanel } from "@/components/aegis/SessionPanel";
import { Choice, Toggle } from "@/components/aegis/Toggle";
import { useAegis, activeSession, startSession } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { WalkMap } from "@/components/aegis/Location";

export const Route = createFileRoute("/walk")({
  head: () => ({
    meta: [
      { title: "Quick Walk — AEGIS" },
      { name: "description", content: "Start a spontaneous safety session with an optional timer. No destination required." },
      { property: "og:title", content: "Quick Walk — AEGIS" },
      { property: "og:description", content: "One-tap safety session with optional timer." },
    ],
  }),
  component: Walk,
});

function Walk() {
  const t = useT();
  const active = useAegis(activeSession);
  const settings = useAegis((s) => s.settings);
  const [timer, setTimer] = useState<number | null>(null);
  const [share, setShare] = useState(false);

  if (active) return (
    <div className="space-y-4">
      <PageTitle>{t("quick_walk")}</PageTitle>
      {active.type !== "walk" && <p className="text-sm text-warning">{t("session_exists")}</p>}
      <SessionPanel full />
      <WalkMap destination={active.destination} />
    </div>
  );

  return (
    <div className="space-y-5">
      <PageTitle sub={t("quick_walk_desc")}>{t("quick_walk")}</PageTitle>
      <section className="card-aegis space-y-3 p-4">
        <h2 className="font-semibold">{t("timer_label")}</h2>
        <Choice label={t("timer_label")} value={timer} onChange={setTimer} options={[
          { v: 15, label: t("m15") }, { v: 30, label: t("m30") }, { v: 60, label: t("h1") }, { v: 120, label: t("h2") }, { v: null, label: t("no_timer") },
        ]} />
        <Toggle label={t("share_location")} checked={share && settings.locationConsent} onChange={setShare}
          hint={settings.locationConsent ? t("share_location_hint") : t("loc_consent_off")} />
      </section>
      <WalkMap />
      <button className="btn btn-safe h-14 w-full text-lg"
        onClick={() => startSession({ type: "walk", intervalMin: timer, graceMin: settings.graceMin, shareLocation: share && settings.locationConsent })}>
        {t("walk_start")}
      </button>
    </div>
  );
}
