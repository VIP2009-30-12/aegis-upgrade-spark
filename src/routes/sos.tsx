import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone, MapPin, Users, Radio, Info, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useAegis, activateSOS, endSOS, retryAlert, activeSos, type Alert } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { fmtTime, mapLink } from "@/lib/format";
import { HoldSOS } from "@/components/aegis/HoldSOS";
import type { ReactNode } from "react";

export const Route = createFileRoute("/sos")({
  head: () => ({
    meta: [
      { title: "SOS — AEGIS" },
      { name: "description", content: "Emergency SOS status: 112 call, location and trusted-contact alerts." },
      { property: "og:title", content: "SOS — AEGIS" },
      { property: "og:description", content: "Emergency SOS status screen." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SosPage,
});

function Row({ icon, title, state, children }: { icon: ReactNode; title: string; state: "ok" | "wait" | "bad" | "info"; children?: ReactNode }) {
  const Ic = state === "ok" ? CheckCircle2 : state === "wait" ? Loader2 : state === "bad" ? XCircle : Info;
  const col = state === "ok" ? "text-safe" : state === "wait" ? "text-warning animate-spin" : state === "bad" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="card-aegis p-4">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <p className="flex-1 font-semibold">{title}</p>
        <Ic className={`size-5 ${col}`} aria-hidden />
      </div>
      {children && <div className="mt-2 space-y-2 text-sm">{children}</div>}
    </div>
  );
}

function AlertDetail({ a }: { a: Alert | undefined }) {
  const t = useT();
  if (!a) return <p className="text-muted-foreground">{t("not_needed")}</p>;
  if (!a.recipients.length) return <p className="text-muted-foreground">{t("no_contacts")}</p>;
  const failed = a.recipients.some((r) => r.status === "failed");
  return (
    <>
      <ul className="space-y-1">
        {a.recipients.map((r) => (
          <li key={r.contactId} className="flex items-center justify-between">
            <span>{r.name}</span>
            <span className={r.status === "failed" ? "chip chip-danger" : r.status === "acknowledged" ? "chip chip-safe" : "chip chip-warn"}>
              {t(r.status === "failed" ? "failed" : r.status === "acknowledged" ? "acknowledged" : "simulated")}
            </span>
          </li>
        ))}
      </ul>
      {a.location ? (
        <p className="text-xs text-muted-foreground">
          {a.locationStale ? t("last_known") : t("loc_acquired")} · {fmtTime(a.location.at)} · ±{a.location.acc} m ·{" "}
          <a className="text-safe underline" href={mapLink(a.location)} target="_blank" rel="noreferrer">{t("open_map")}</a>
        </p>
      ) : <p className="text-xs text-muted-foreground">{t("loc_unavailable")}</p>}
      {failed && <button className="btn btn-soft w-full" onClick={() => retryAlert(a.id)}>{t("retry")}</button>}
    </>
  );
}

function SosPage() {
  const t = useT();
  const sos = useAegis(activeSos);
  const alerts = useAegis((s) => s.alerts);

  if (!sos) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-bold">SOS</h1>
        <div className="flex justify-center py-6"><HoldSOS /></div>
        <a href="tel:112" className="btn btn-outline w-full"><Phone className="size-4" aria-hidden />{t("sos_call_again")}</a>
      </div>
    );
  }
  const main = alerts.find((a) => a.id === sos.alertId);
  const upd = sos.updateAlertId ? alerts.find((a) => a.id === sos.updateAlertId) : undefined;
  const locState = sos.locStatus === "acquired" ? "ok" : sos.locStatus === "pending" ? "wait" : "bad";
  const locText = { acquired: t("loc_acquired"), pending: t("loc_pending"), unavailable: t("loc_unavailable"), consent_off: t("loc_consent_off") }[sos.locStatus];

  return (
    <div className="space-y-3" aria-live="polite">
      <div className="card-aegis border-destructive p-4">
        <p className="chip chip-danger">{t("sos_active")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{fmtTime(sos.startedAt)}</p>
      </div>
      <Row icon={<Phone className="size-5" />} title={t("sos_call")} state={sos.dialerOpened ? "ok" : "bad"}>
        <p className="text-muted-foreground">{t("sos_call_opened")}</p>
        <a href="tel:112" className="btn btn-danger w-full"><Phone className="size-4" aria-hidden />{t("sos_call_again")}</a>
      </Row>
      <Row icon={<Users className="size-5" />} title={t("sos_contacts")} state="info"><AlertDetail a={main} /></Row>
      <Row icon={<MapPin className="size-5" />} title={`${t("sos_location")}: ${locText}`} state={locState}>
        {sos.loc && (
          <p className="text-xs text-muted-foreground">
            {sos.loc.lat.toFixed(5)}, {sos.loc.lng.toFixed(5)} · ±{sos.loc.acc} m · {fmtTime(sos.loc.at)}
          </p>
        )}
      </Row>
      <Row icon={<Radio className="size-5" />} title={t("sos_loc_update")} state="info"><AlertDetail a={upd} /></Row>
      <div className="card-aegis flex gap-3 border-warning p-4 text-sm">
        <Info className="size-5 shrink-0 text-warning" aria-hidden />
        <p>{t("sos_112_notice")}</p>
      </div>
      <button className="btn btn-safe w-full" onClick={endSOS}>{t("sos_end")}</button>
      <button className="btn btn-outline w-full" onClick={() => { endSOS(); activateSOS(); }}>{t("sos_again")}</button>
      <Link to="/help" className="block text-center text-sm text-safe underline">{t("help")}</Link>
    </div>
  );
}
