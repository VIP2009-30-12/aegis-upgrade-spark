import { createFileRoute, Link } from "@tanstack/react-router";
import { Footprints, Route as RouteIcon, Users, ChevronRight, LifeBuoy } from "lucide-react";
import { HoldSOS } from "@/components/aegis/HoldSOS";
import { SessionPanel } from "@/components/aegis/SessionPanel";
import { useT } from "@/lib/i18n";
import { useAegis, activeSession, startSession } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AEGIS — Personal Safety Companion" },
      { name: "description", content: "Hold-to-activate SOS, Quick Walk timers and planned journeys with trusted contacts. Built for Hyderabad." },
      { property: "og:title", content: "AEGIS — Personal Safety Companion" },
      { property: "og:description", content: "SOS, Quick Walk and planned journeys with trusted contacts." },
    ],
  }),
  component: Home,
});

function Home() {
  const t = useT();
  const active = useAegis(activeSession);
  const settings = useAegis((s) => s.settings);
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-[0.2em]">AEGIS</h1>
          <p className="text-sm text-warning">{t("tagline")}</p>
        </div>
      </header>

      {active && <SessionPanel />}

      <div className="flex justify-center py-4"><HoldSOS /></div>

      <div className="grid gap-3">
        {active ? (
          <Link to="/walk" className="card-aegis flex items-center gap-4 p-4">
            <Footprints className="size-7 text-safe" aria-hidden />
            <div className="flex-1"><p className="font-bold">{t("quick_walk")}</p><p className="text-sm text-muted-foreground">{t("session_exists")}</p></div>
          </Link>
        ) : (
          <button
            className="card-aegis flex items-center gap-4 p-4 text-left"
            onClick={() => startSession({ type: "walk", intervalMin: null, graceMin: settings.graceMin, shareLocation: false })}
          >
            <Footprints className="size-7 text-safe" aria-hidden />
            <div className="flex-1"><p className="font-bold">{t("walk_start")}</p><p className="text-sm text-muted-foreground">{t("quick_walk_desc")}</p></div>
            <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
          </button>
        )}
        <Link to="/journey" className="card-aegis flex items-center gap-4 p-4">
          <RouteIcon className="size-7 text-warning" aria-hidden />
          <div className="flex-1"><p className="font-bold">{t("planned_journey")}</p><p className="text-sm text-muted-foreground">{t("planned_journey_desc")}</p></div>
          <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/contacts" className="card-aegis flex items-center gap-3 p-4"><Users className="size-5 text-safe" aria-hidden /><span className="font-semibold">{t("contacts")}</span></Link>
          <Link to="/help" className="card-aegis flex items-center gap-3 p-4"><LifeBuoy className="size-5 text-safe" aria-hidden /><span className="font-semibold">{t("help")}</span></Link>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">{t("home_hint")}</p>
    </div>
  );
}
