import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PageTitle, beep } from "@/components/aegis/AppShell";
import { Choice, Toggle } from "@/components/aegis/Toggle";
import { useAegis, updateSettings, deleteAll, requestLocation } from "@/lib/store";
import { useT, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AEGIS" },
      { name: "description", content: "Language, location consent, check-ins, discreet reminders and accessibility." },
      { property: "og:title", content: "Settings — AEGIS" },
      { property: "og:description", content: "AEGIS preferences and privacy." },
    ],
  }),
  component: SettingsPage,
});

function Sec({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card-aegis p-4">
      <h2 className="mb-1 font-bold">{title}</h2>
      <div className="divide-y">{children}</div>
    </section>
  );
}

function SettingsPage() {
  const t = useT();
  const s = useAegis((st) => st.settings);
  return (
    <div className="space-y-4">
      <PageTitle>{t("settings")}</PageTitle>
      <Sec title={t("language")}>
        <div className="py-3">
          <Choice<Lang> label={t("language")} value={s.lang} onChange={(lang) => updateSettings({ lang })}
            options={[{ v: "en", label: "English" }, { v: "hi", label: "हिन्दी" }, { v: "te", label: "తెలుగు" }]} />
        </div>
      </Sec>
      <Sec title={t("privacy")}>
        <Toggle label={t("location_consent")} hint={t("location_explain")} checked={s.locationConsent}
          onChange={(v) => { updateSettings({ locationConsent: v }); if (v) void requestLocation(); }} />
        <div className="py-3"><Link to="/contacts" className="text-sm text-safe underline">{t("contacts")}</Link></div>
      </Sec>
      <Sec title={t("checkins")}>
        <div className="space-y-2 py-3"><p className="text-sm font-semibold">{t("default_interval")}</p>
          <Choice label={t("default_interval")} value={s.defaultInterval} onChange={(v) => updateSettings({ defaultInterval: v })}
            options={[10, 15, 30, 60].map((v) => ({ v, label: `${v} ${t("minutes")}` }))} /></div>
        <div className="space-y-2 py-3"><p className="text-sm font-semibold">{t("grace")}</p>
          <Choice label={t("grace")} value={s.graceMin} onChange={(v) => updateSettings({ graceMin: v })}
            options={[2, 5, 10, 15].map((v) => ({ v, label: `${v} ${t("minutes")}` }))} /></div>
      </Sec>
      <Sec title={t("notifications")}>
        <Toggle label={t("vibration")} checked={s.vibration} onChange={(v) => updateSettings({ vibration: v })} />
        <Toggle label={t("sound")} checked={s.sound} onChange={(v) => updateSettings({ sound: v })} />
        <div className="flex items-center gap-3 py-3">
          <button className="btn btn-soft" onClick={() => { if (s.vibration) navigator.vibrate?.([120, 80, 120]); if (s.sound) beep(); }}>{t("test")}</button>
          <p className="text-xs text-muted-foreground">{t("device_limits")}</p>
        </div>
      </Sec>
      <Sec title={t("accessibility")}>
        <Toggle label={t("high_contrast")} checked={s.highContrast} onChange={(v) => updateSettings({ highContrast: v })} />
        <Toggle label={t("large_text")} checked={s.largeText} onChange={(v) => updateSettings({ largeText: v })} />
        <Toggle label={t("reduced_motion")} checked={s.reducedMotion} onChange={(v) => updateSettings({ reducedMotion: v })} />
      </Sec>
      <Sec title={t("sandbox_title")}>
        <Toggle label={t("simulate_failure")} checked={s.simulateFailure} onChange={(v) => updateSettings({ simulateFailure: v })} />
      </Sec>
      <Sec title={t("data")}>
        <div className="py-3">
          <button className="btn btn-danger w-full" onClick={() => { if (confirm(t("confirm_delete_all"))) deleteAll(); }}>{t("delete_all")}</button>
        </div>
      </Sec>
    </div>
  );
}
