import { Link } from "@tanstack/react-router";
import { ShieldCheck, Clock, Timer } from "lucide-react";
import { useAegis, activeSession, checkInSafe, extendTimer, endSession, sendManualAlert } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { fmtDuration, osmEmbed, mapLink } from "@/lib/format";
import { useNow } from "./useNow";
import { HoldSOS } from "./HoldSOS";
import { toast } from "sonner";

/** Compact banner for Home, or full controls for the active-session screens. */
export function SessionPanel({ full = false }: { full?: boolean }) {
  const t = useT();
  const now = useNow();
  const s = useAegis(activeSession);
  const lastKnown = useAegis((st) => st.lastKnown);
  const consent = useAegis((st) => st.settings.locationConsent);
  if (!s) return null;
  const elapsed = now ? now - s.startedAt : 0;
  const left = s.nextCheckInAt && now ? s.nextCheckInAt - now : null;
  const overdue = left != null && left <= 0;
  const title = s.type === "walk" ? t("walk_active") : t("journey_active");

  return (
    <section aria-label={t("active_session")} className="card-aegis p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-safe" aria-hidden />
          <h2 className="font-bold">{title}</h2>
        </div>
        <span className={overdue ? "chip chip-warn" : "chip chip-safe"}>{overdue ? t("checkin_due") : t("active_session")}</span>
      </div>
      {s.destination && <p className="text-sm">📍 {s.destination}{s.eta ? ` · ${s.eta}` : ""}</p>}
      {!s.destination && s.eta && <p className="text-sm">{t("eta")}: {s.eta}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-surface p-3">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" aria-hidden />{t("elapsed")}</p>
          <p className="font-display text-2xl tabular-nums">{fmtDuration(elapsed)}</p>
        </div>
        <div className="rounded-lg bg-surface p-3">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Timer className="size-3" aria-hidden />{t("next_checkin")}</p>
          <p className={`font-display text-2xl tabular-nums ${overdue ? "text-warning" : ""}`}>
            {left == null ? t("no_timer") : fmtDuration(left)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button className="btn btn-safe" onClick={() => { checkInSafe(); toast(t("ev_checkin")); }}>{t("im_safe")}</button>
        <button className="btn btn-soft" onClick={() => extendTimer(15)}>{t("extend")}</button>
      </div>
      {!full && (
        <Link to={s.type === "walk" ? "/walk" : "/journey"} className="btn btn-outline w-full">{t("open")}</Link>
      )}
      {full && (
        <>
          {s.shareLocation && consent && lastKnown && (
            <div className="overflow-hidden rounded-lg border">
              <iframe title={t("sos_location")} src={osmEmbed(lastKnown)} className="h-48 w-full" loading="lazy" />
              <a href={mapLink(lastKnown)} target="_blank" rel="noreferrer" className="block p-2 text-xs text-safe underline">
                {t("open_map")} · ±{lastKnown.acc} m
              </a>
            </div>
          )}
          <button className="btn btn-warn w-full" onClick={() => { sendManualAlert(s.id); toast(t("alert_sent_sim")); }}>
            {t("alert_contacts")}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn btn-outline" onClick={() => endSession("completed")}>
              {s.type === "walk" ? t("end_walk") : t("end_journey")}
            </button>
            {s.type === "journey" ? (
              <button className="btn btn-outline" onClick={() => endSession("cancelled")}>{t("cancel_journey")}</button>
            ) : <span />}
          </div>
          <div className="pt-2"><HoldSOS size="sm" /></div>
        </>
      )}
    </section>
  );
}
