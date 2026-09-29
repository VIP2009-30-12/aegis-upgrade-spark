import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageTitle } from "@/components/aegis/AppShell";
import { useNow } from "@/components/aegis/useNow";
import { useSession } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { fmtTime, fmtDuration } from "@/lib/format";
import { guardianOverview, ackAlert, leaveCircle, type GuardianEntry } from "@/lib/cloud";

export const Route = createFileRoute("/guardian")({
  head: () => ({
    meta: [
      { title: "Guardian view — AEGIS" },
      { name: "description", content: "See the walk status people in your Safety Circle chose to share with you." },
      { property: "og:title", content: "Guardian view — AEGIS" },
      { property: "og:description", content: "Consent-based walk status for AEGIS Safety Circle guardians." },
    ],
  }),
  component: Guardian,
});

function Guardian() {
  const t = useT();
  const { user, ready } = useSession();
  const q = useQuery({ queryKey: ["guardian", user?.id], queryFn: guardianOverview, enabled: !!user, refetchInterval: 15000 });
  return (
    <div className="space-y-4">
      <PageTitle sub={t("guardian_intro")}>{t("guardian_title")}</PageTitle>
      {!ready ? null : !user ? (
        <div className="card-aegis space-y-3 p-4"><p className="text-sm">{t("inv_signin")}</p><Link to="/auth" className="btn btn-safe w-full">{t("sign_in")}</Link></div>
      ) : (
        <>
          {q.isError && <p role="alert" className="text-sm text-destructive">{t("generic_error")}</p>}
          {q.dataUpdatedAt > 0 && <p className="text-xs text-muted-foreground">{t("g_updated", { t: fmtTime(q.dataUpdatedAt) })}</p>}
          {q.isSuccess && !q.data.length && <p className="text-sm text-muted-foreground">{t("guardian_empty")}</p>}
          <ul className="space-y-3">{q.data?.map((g) => <Entry key={g.circle_id} g={g} />)}</ul>
        </>
      )}
    </div>
  );
}

function Entry({ g }: { g: GuardianEntry }) {
  const t = useT();
  const now = useNow(5000);
  const qc = useQueryClient();
  const w = g.walk;
  const refresh = () => qc.invalidateQueries({ queryKey: ["guardian"] });
  const locAge = w?.location ? now - new Date(w.location.at).getTime() : 0;
  return (
    <li className="card-aegis space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">{g.owner_name ?? t("someone")}</h2>
        {w && <span className={`chip ${w.overdue ? "chip-warn" : "chip-safe"}`}>{w.overdue ? t("g_overdue") : g.perms.checkins ? t("g_on_time") : t("active_session")}</span>}
      </div>
      {!g.perms.walk ? <p className="text-sm text-muted-foreground">{t("g_hidden")}</p>
        : !w ? <p className="text-sm text-muted-foreground">{t("g_no_walk")}</p>
        : (
          <div className="space-y-1 text-sm">
            <p>{w.type === "walk" ? t("walk_active") : t("journey_active")} · {fmtTime(new Date(w.started_at).getTime())}</p>
            {w.destination && <p>📍 {w.destination}{w.eta ? ` · ${w.eta}` : ""}</p>}
            {g.perms.checkins && <p>{t("g_last_checkin")}: {w.last_checkin_at ? fmtTime(new Date(w.last_checkin_at).getTime()) : t("never")}</p>}
            {g.perms.checkins && w.next_checkin_at && <p>{t("g_next")}: {fmtTime(new Date(w.next_checkin_at).getTime())}</p>}
            {g.perms.location && (w.location ? (
              <p>{t("g_location")}: <a className="text-safe underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${w.location.lat},${w.location.lng}`}>{t("open_map")}</a>{" "}
                <span className="text-xs text-muted-foreground">{t("g_loc_age", { a: fmtDuration(locAge), m: w.location.acc ?? "?" })}</span>
                {locAge > 3 * 60000 && <span className="chip chip-warn ml-1">{t("g_stale")}</span>}</p>
            ) : <p className="text-xs text-muted-foreground">{t("g_no_loc")}</p>)}
          </div>
        )}
      {g.alerts && g.alerts.length > 0 && (
        <div className="space-y-2 border-t pt-2">
          <h3 className="text-sm font-bold">{t("g_alerts")}</h3>
          <p className="text-xs text-muted-foreground">{t("g_sim")}</p>
          {g.alerts.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{fmtTime(new Date(a.created_at).getTime())}</span>
              {a.status === "acknowledged" ? <span className="chip chip-safe">{t("acked")}</span>
                : <button className="btn btn-soft" onClick={async () => { try { await ackAlert(a.id); await refresh(); } catch { toast.error(t("generic_error")); } }}>{t("ack")}</button>}
            </div>
          ))}
        </div>
      )}
      <button className="text-xs text-muted-foreground underline" onClick={async () => {
        if (!confirm(t("confirm_leave"))) return;
        try { await leaveCircle(g.circle_id); await refresh(); } catch { toast.error(t("generic_error")); }
      }}>{t("leave")}</button>
    </li>
  );
}
