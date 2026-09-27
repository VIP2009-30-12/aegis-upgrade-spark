import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { UserPlus, Phone } from "lucide-react";
import { PageTitle } from "@/components/aegis/AppShell";
import { Toggle } from "@/components/aegis/Toggle";
import { useAegis, saveContact, removeContact, type Contact } from "@/lib/store";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/contacts")({
  head: () => ({
    meta: [
      { title: "Trusted contacts — AEGIS" },
      { name: "description", content: "Choose who receives your SOS alerts, missed check-ins and location." },
      { property: "og:title", content: "Trusted contacts — AEGIS" },
      { property: "og:description", content: "Manage trusted contacts and what they receive." },
    ],
  }),
  component: Contacts,
});

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  phone: z.string().trim().regex(/^\+?[0-9 ]{10,15}$/),
  email: z.string().trim().email().max(120).or(z.literal("")),
  relationship: z.string().trim().max(40),
});
type Draft = Omit<Contact, "id" | "verified"> & { id?: string };
const blank: Draft = { name: "", phone: "", email: "", relationship: "", sos: true, missed: true, journey: true, location: false };

function Editor({ initial, onDone }: { initial: Draft; onDone: () => void }) {
  const t = useT();
  const [d, setD] = useState<Draft>(initial);
  const [err, setErr] = useState<string | null>(null);
  const f = (k: "name" | "phone" | "email" | "relationship", label: string, type = "text") => (
    <label className="block space-y-1"><span className="text-sm font-semibold">{label}</span>
      <input className="field" type={type} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} /></label>
  );
  return (
    <form className="card-aegis space-y-3 p-4" onSubmit={(e) => {
      e.preventDefault();
      const r = schema.safeParse(d);
      if (!r.success) { setErr(r.error.issues.map((i) => i.path.join(".")).join(", ")); return; }
      saveContact({ ...d, ...r.data }); onDone();
    }}>
      {f("name", t("name"))}{f("phone", t("phone"), "tel")}{f("email", t("email"), "email")}{f("relationship", t("relationship"))}
      <p className="pt-2 text-sm font-semibold">{t("receives")}</p>
      <div className="divide-y">
        <Toggle label={t("r_sos")} checked={d.sos} onChange={(v) => setD({ ...d, sos: v })} />
        <Toggle label={t("r_missed")} checked={d.missed} onChange={(v) => setD({ ...d, missed: v })} />
        <Toggle label={t("r_journey")} checked={d.journey} onChange={(v) => setD({ ...d, journey: v })} />
        <Toggle label={t("r_location")} checked={d.location} onChange={(v) => setD({ ...d, location: v })} />
      </div>
      {err && <p role="alert" className="text-sm text-destructive">⚠ {err}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-outline" onClick={onDone}>{t("cancel")}</button>
        <button type="submit" className="btn btn-safe">{t("save")}</button>
      </div>
    </form>
  );
}

function Contacts() {
  const t = useT();
  const contacts = useAegis((s) => s.contacts);
  const [editing, setEditing] = useState<Draft | null>(null);
  return (
    <div className="space-y-4">
      <PageTitle sub={t("contacts_local")}>{t("contacts")}</PageTitle>
      {editing ? <Editor initial={editing} onDone={() => setEditing(null)} /> : (
        <button className="btn btn-safe w-full" onClick={() => setEditing(blank)}><UserPlus className="size-4" aria-hidden />{t("add_contact")}</button>
      )}
      {!contacts.length && !editing && <p className="text-sm text-muted-foreground">{t("no_contacts_yet")}</p>}
      <ul className="space-y-3">
        {contacts.map((c) => (
          <li key={c.id} className="card-aegis p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold">{c.name} <span className="font-normal text-muted-foreground">· {c.relationship}</span></p>
                <p className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="size-3" aria-hidden />{c.phone}</p>
              </div>
              <span className="chip" title={t("verify_hint")}>{t("unverified")}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {c.sos && <span className="chip chip-danger">{t("r_sos")}</span>}
              {c.missed && <span className="chip chip-warn">{t("r_missed")}</span>}
              {c.journey && <span className="chip chip-safe">{t("r_journey")}</span>}
              {c.location && <span className="chip chip-safe">{t("r_location")}</span>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="btn btn-soft" onClick={() => setEditing(c)}>{t("edit")}</button>
              <button className="btn btn-outline" onClick={() => removeContact(c.id)}>{t("remove")}</button>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">{t("verify_hint")}</p>
    </div>
  );
}
