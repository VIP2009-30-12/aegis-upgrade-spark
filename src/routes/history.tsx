import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageTitle } from "@/components/aegis/AppShell";
import { useAegis, deleteHistory, retryAlert, type EventType } from "@/lib/store";
import { useT, type TKey } from "@/lib/i18n";
import { fmtTime } from "@/lib/format";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — AEGIS" },
      { name: "description", content: "Your private SOS, alert and session history, stored on this device." },
      { property: "og:title", content: "History — AEGIS" },
      { property: "og:description", content: "Private safety history." },
    ],
  }),
  component: HistoryPage,
});

const groups: Record<string, EventType[]> = {
  all: [], sos: ["sos"], alerts: ["alert", "missed", "loc_update"], sessions: ["session_start", "session_end", "session_cancel", "checkin"],
};
const label: Record<EventType, TKey> = {
  sos: "ev_sos", alert: "ev_alert", missed: "ev_missed", session_start: "ev_session_start", session_end: "ev_session_end",
  session_cancel: "ev_session_cancel", checkin: "ev_checkin", loc_update: "ev_loc_update",
};

function HistoryPage() {
  const t = useT();
  const log = useAegis((s) => s.log);
  const alerts = useAegis((s) => s.alerts);
  const [f, setF] = useState<keyof typeof groups>("all");
  const rows = f === "all" ? log : log.filter((e) => groups[f].includes(e.type));
  return (
    <div className="space-y-4">
      <PageTitle>{t("history")}</PageTitle>
      <div role="tablist" className="flex gap-2 overflow-x-auto">
        {(["all", "sos", "alerts", "sessions"] as const).map((k) => (
          <button key={k} role="tab" aria-selected={f === k} className={`btn min-h-10 ${f === k ? "btn-safe" : "btn-outline"}`} onClick={() => setF(k)}>
            {t(`filter_${k}` as TKey)}
          </button>
        ))}
      </div>
      {!rows.length && <p className="text-sm text-muted-foreground">{t("history_empty")}</p>}
      <ul className="space-y-2">
        {rows.map((e) => {
          const a = e.alertId ? alerts.find((x) => x.id === e.alertId) : undefined;
          const failed = a?.recipients.filter((r) => r.status === "failed").length ?? 0;
          return (
            <li key={e.id} className="card-aegis p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">
                  {t(label[e.type])}
                  {e.sessionType && <span className="font-normal text-muted-foreground"> · {t(e.sessionType === "walk" ? "quick_walk" : "planned_journey")}</span>}
                </p>
                <time className="text-xs text-muted-foreground">{fmtTime(e.at)}</time>
              </div>
              {a && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="chip chip-warn">{t("simulated")}</span>
                  <span className="text-muted-foreground">{a.recipients.length} {t("recipients")}</span>
                  {failed > 0 && <><span className="chip chip-danger">{failed} {t("failed")}</span>
                    <button className="underline" onClick={() => retryAlert(a.id)}>{t("retry")}</button></>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {log.length > 0 && (
        <button className="btn btn-outline w-full" onClick={() => { if (confirm(t("confirm_delete"))) deleteHistory(); }}>{t("delete_history")}</button>
      )}
    </div>
  );
}
