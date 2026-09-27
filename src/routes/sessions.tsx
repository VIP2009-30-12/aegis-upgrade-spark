import { createFileRoute, Link } from "@tanstack/react-router";
import { Footprints, Route as RouteIcon, Users } from "lucide-react";
import { PageTitle } from "@/components/aegis/AppShell";
import { SessionPanel } from "@/components/aegis/SessionPanel";
import { useAegis, activeSession } from "@/lib/store";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/sessions")({
  head: () => ({
    meta: [
      { title: "Safety sessions — AEGIS" },
      { name: "description", content: "Start or manage a Quick Walk or Planned Journey safety session." },
      { property: "og:title", content: "Safety sessions — AEGIS" },
      { property: "og:description", content: "Quick Walk and Planned Journey sessions." },
    ],
  }),
  component: Sessions,
});

function Sessions() {
  const t = useT();
  const active = useAegis(activeSession);
  return (
    <div className="space-y-4">
      <PageTitle>{t("sessions_title")}</PageTitle>
      {active ? <SessionPanel /> : <p className="text-sm text-muted-foreground">{t("no_active")}</p>}
      <Link to="/walk" className="card-aegis flex items-center gap-4 p-4">
        <Footprints className="size-6 text-safe" aria-hidden />
        <div><p className="font-bold">{t("quick_walk")}</p><p className="text-sm text-muted-foreground">{t("quick_walk_desc")}</p></div>
      </Link>
      <Link to="/journey" className="card-aegis flex items-center gap-4 p-4">
        <RouteIcon className="size-6 text-warning" aria-hidden />
        <div><p className="font-bold">{t("planned_journey")}</p><p className="text-sm text-muted-foreground">{t("planned_journey_desc")}</p></div>
      </Link>
      <Link to="/contacts" className="card-aegis flex items-center gap-4 p-4">
        <Users className="size-6 text-safe" aria-hidden /><p className="font-bold">{t("contacts")}</p>
      </Link>
    </div>
  );
}
