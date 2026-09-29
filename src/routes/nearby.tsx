import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageTitle } from "@/components/aegis/AppShell";
import { useAegis } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { DATASETS, type FacilityKind } from "@/data/facilities";

export const Route = createFileRoute("/nearby")({
  head: () => ({
    meta: [
      { title: "Nearby public facilities — AEGIS" },
      { name: "description", content: "Verified police stations, hospitals, assistance points and public CCTV locations from official sources." },
      { property: "og:title", content: "Nearby public facilities — AEGIS" },
      { property: "og:description", content: "Only verified official data, with source and check date." },
    ],
  }),
  component: Nearby,
});

const TABS: { k: FacilityKind; label: "f_police" | "f_hospital" | "f_assist" | "f_cctv"; q: string }[] = [
  { k: "police", label: "f_police", q: "police station" },
  { k: "hospital", label: "f_hospital", q: "hospital" },
  { k: "assist", label: "f_assist", q: "sakhi one stop centre" },
  { k: "cctv", label: "f_cctv", q: "" },
];

function Nearby() {
  const t = useT();
  const [tab, setTab] = useState<FacilityKind>("police");
  const last = useAegis((s) => s.lastKnown);
  const consent = useAegis((s) => s.settings.locationConsent);
  const cur = TABS.find((x) => x.k === tab)!;
  const sets = DATASETS.filter((d) => d.kind === tab && d.items.length);
  const near = consent && last ? `/@${last.lat},${last.lng},15z` : "";
  return (
    <div className="space-y-4">
      <PageTitle sub={t("nearby_intro")}>{t("nearby_title")}</PageTitle>
      <div role="tablist" className="grid grid-cols-4 gap-1">
        {TABS.map((x) => (
          <button key={x.k} role="tab" aria-selected={tab === x.k} onClick={() => setTab(x.k)}
            className={`btn ${tab === x.k ? "btn-safe" : "btn-outline"} px-1 text-xs`}>{t(x.label)}</button>
        ))}
      </div>
      <section role="tabpanel" className="card-aegis space-y-3 p-4">
        {sets.length ? sets.map((d) => (
          <div key={d.source} className="space-y-2">
            <p className="text-xs text-muted-foreground">{t("source")}: <a className="underline" href={d.url} target="_blank" rel="noreferrer">{d.source}</a> · {d.licence} · {t("verified_on", { d: d.checkedOn })}</p>
            <ul className="space-y-1">{d.items.map((f) => (
              <li key={f.id} className="text-sm"><a className="text-safe underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${f.lat},${f.lng}`}>{f.name}</a>{f.info && <span className="text-muted-foreground"> · {f.info}</span>}</li>
            ))}</ul>
          </div>
        )) : <p className="font-semibold">{tab === "cctv" ? t("cctv_unavailable") : t("f_unavailable")}</p>}
        {tab === "cctv" && <p className="text-xs text-muted-foreground">{t("cctv_note")}</p>}
        {cur.q && (
          <>
            <a className="btn btn-soft w-full" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/${encodeURIComponent(cur.q)}${near}`}>{t("search_gmaps")}</a>
            <p className="text-xs text-muted-foreground">{t("gmaps_disclaimer")}</p>
          </>
        )}
      </section>
    </div>
  );
}
