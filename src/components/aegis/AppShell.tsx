import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Home, ShieldCheck, LifeBuoy, History, Settings as Cog, FlaskConical } from "lucide-react";
import { useAegis, activeSession, checkInSafe, extendTimer, escalateIfOverdue, endSession } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { useNow } from "./useNow";
import { useNavigate } from "@tanstack/react-router";

function useA11ySync() {
  const s = useAegis((st) => st.settings);
  useEffect(() => {
    const h = document.documentElement;
    h.lang = s.lang;
    h.classList.toggle("hc", s.highContrast);
    h.classList.toggle("lt", s.largeText);
    h.classList.toggle("rm", s.reducedMotion);
  }, [s.lang, s.highContrast, s.largeText, s.reducedMotion]);
}

/** In-app check-in monitor: discreet reminder, optional vibration, single escalation after grace. */
function CheckInMonitor() {
  const t = useT();
  const nav = useNavigate();
  const now = useNow();
  const s = useAegis(activeSession);
  const settings = useAegis((st) => st.settings);
  const [notice, setNotice] = useState<string | null>(null);
  const buzzedFor = useRef<number | null>(null);
  const due = !!(s?.nextCheckInAt && now && now >= s.nextCheckInAt);

  useEffect(() => {
    if (!s?.nextCheckInAt || !due) return;
    if (buzzedFor.current !== s.nextCheckInAt) {
      buzzedFor.current = s.nextCheckInAt;
      if (settings.vibration && "vibrate" in navigator) navigator.vibrate?.([120, 80, 120]);
      if (settings.sound) beep();
    }
    if (escalateIfOverdue(now)) setNotice(t("escalated"));
  }, [now, due, s?.nextCheckInAt, settings.vibration, settings.sound, t]);

  if (!s || !due) return notice ? (
    <div role="status" className="fixed inset-x-3 top-3 z-50 mx-auto max-w-md card-aegis border-warning p-3 text-sm">
      {notice} <button className="ml-2 underline" onClick={() => setNotice(null)}>OK</button>
    </div>
  ) : null;

  return (
    <div role="alertdialog" aria-labelledby="ci-title" className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md card-aegis border-warning p-4 shadow-2xl space-y-3">
      <h2 id="ci-title" className="font-bold text-warning">{t("checkin_due")}</h2>
      <p className="text-sm text-muted-foreground">{t("checkin_body", { m: s.graceMin })}</p>
      {notice && <p className="chip chip-warn">{notice}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button className="btn btn-safe" onClick={() => { checkInSafe(); setNotice(null); }}>{t("im_safe")}</button>
        <button className="btn btn-soft" onClick={() => { extendTimer(15); setNotice(null); }}>{t("extend")}</button>
        <button className="btn btn-danger" onClick={() => nav({ to: "/sos" })}>{t("need_help")}</button>
        <button className="btn btn-outline" onClick={() => { endSession("completed"); setNotice(null); }}>{t("end")}</button>
      </div>
    </div>
  );
}

function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    g.gain.value = 0.05; o.frequency.value = 660; o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.2);
  } catch { /* not supported */ }
}
export { beep };

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  useA11ySync();
  const items = [
    { to: "/", icon: Home, label: t("nav_home") },
    { to: "/sessions", icon: ShieldCheck, label: t("nav_sessions") },
    { to: "/help", icon: LifeBuoy, label: t("nav_help") },
    { to: "/history", icon: History, label: t("nav_history") },
    { to: "/settings", icon: Cog, label: t("nav_settings") },
  ] as const;
  return (
    <div className="min-h-screen pb-24">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 btn btn-soft">Skip</a>
      <div className="flex items-center justify-center gap-2 border-b bg-surface px-3 py-1.5 text-xs text-warning">
        <FlaskConical className="size-3.5" aria-hidden /> {t("sandbox")}
      </div>
      <main id="main" className="mx-auto w-full max-w-xl px-4 pt-5">{children}</main>
      <CheckInMonitor />
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface/95 backdrop-blur">
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {items.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground"
                activeProps={{ className: "text-safe" }}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-5">
      <h1 className="text-2xl font-bold">{children}</h1>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </header>
  );
}
