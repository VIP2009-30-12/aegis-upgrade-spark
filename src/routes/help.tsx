import { createFileRoute } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import { PageTitle } from "@/components/aegis/AppShell";
import { HELP } from "@/data/help";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help directory — AEGIS" },
      { name: "description", content: "Official emergency and support helplines for India, Telangana and Hyderabad with one-tap calling." },
      { property: "og:title", content: "Help directory — AEGIS" },
      { property: "og:description", content: "Emergency and support helplines for India and Telangana." },
    ],
  }),
  component: Help,
});

function Help() {
  const t = useT();
  return (
    <div className="space-y-6">
      <PageTitle sub={t("help_note")}>{t("help")}</PageTitle>
      {HELP.map((sec) => (
        <section key={sec.key} className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t(sec.key)}</h2>
          <ul className="space-y-2">
            {sec.items.map((it) => (
              <li key={it.name + it.number} className="card-aegis flex items-center gap-3 p-3">
                <div className="flex-1">
                  <p className="font-semibold">{it.name}</p>
                  <p className="text-sm">
                    <span className="font-display text-lg">{it.number}</span>{" "}
                    <span className={it.emergency ? "chip chip-danger" : "chip chip-safe"}>{it.emergency ? t("emergency_badge") : t("support_badge")}</span>
                    {it.note && <span className="ml-2 text-xs text-muted-foreground">{it.note}</span>}
                  </p>
                </div>
                <a href={`tel:${it.number}`} className={`btn ${it.emergency ? "btn-danger" : "btn-soft"}`} aria-label={`${t("call")} ${it.name} ${it.number}`}>
                  <Phone className="size-4" aria-hidden />{t("call")}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
