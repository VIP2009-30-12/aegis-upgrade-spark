import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { Toggle } from "./Toggle";
import { useSession } from "@/lib/auth";
import { useAegis } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { fmtTime } from "@/lib/format";
import { listCircle, createInvite, setPerm, revokeMember, deleteMember, circleState, type Perm, type CircleRow } from "@/lib/cloud";

const PERMS: { k: Perm; label: "p_walk" | "p_checkins" | "p_alerts" | "p_location" }[] = [
  { k: "perm_walk", label: "p_walk" }, { k: "perm_checkins", label: "p_checkins" },
  { k: "perm_alerts", label: "p_alerts" }, { k: "perm_location", label: "p_location" },
];

export function SafetyCircle() {
  const t = useT();
  const { user, ready } = useSession();
  const qc = useQueryClient();
  const local = useAegis((s) => s.contacts);
  const q = useQuery({ queryKey: ["circle", user?.id], queryFn: listCircle, enabled: !!user });
  const [name, setName] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["circle"] });

  if (!ready) return null;
  if (!user) return (
    <section className="card-aegis space-y-2 p-4">
      <h2 className="flex items-center gap-2 font-bold"><Users className="size-4" aria-hidden />{t("circle_title")}</h2>
      <p className="text-sm text-muted-foreground">{t("circle_signin")}</p>
      <Link to="/auth" className="btn btn-safe w-full">{t("sign_in")}</Link>
    </section>
  );

  const invite = async (n: string, rel = "", perms?: Partial<Record<Perm, boolean>>) => {
    const nm = n.trim().slice(0, 60);
    if (!nm) return;
    setBusy(true);
    try {
      const url = await createInvite({ name: nm, relationship: rel.slice(0, 40), perms: { perm_walk: true, perm_checkins: true, perm_alerts: true, perm_location: false, ...perms } });
      setLink(url); setName(""); void refresh();
    } catch { toast.error(t("generic_error")); } finally { setBusy(false); }
  };
  const act = async (fn: () => Promise<void>) => { try { await fn(); await refresh(); } catch { toast.error(t("generic_error")); } };
  const rows = q.data ?? [];
  const invitedNames = new Set(rows.filter((r) => circleState(r) !== "revoked").map((r) => r.name));

  return (
    <section className="card-aegis space-y-3 p-4">
      <h2 className="flex items-center gap-2 font-bold"><Users className="size-4" aria-hidden />{t("circle_title")}</h2>
      <p className="text-sm text-muted-foreground">{t("circle_intro")}</p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void invite(name); }}>
        <input className="field flex-1" aria-label={t("name")} placeholder={t("name")} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-safe" disabled={busy || !name.trim()}>{t("invite")}</button>
      </form>
      {link && (
        <div className="space-y-2 rounded-lg border border-safe p-3" role="status">
          <p className="text-sm">{t("invite_created")}</p>
          <input readOnly className="field text-xs" value={link} onFocus={(e) => e.currentTarget.select()} aria-label={t("copy_link")} />
          <div className="grid grid-cols-2 gap-2">
            <button className="btn btn-soft" onClick={() => { void navigator.clipboard?.writeText(link); toast(t("copied")); }}>{t("copy_link")}</button>
            {"share" in navigator
              ? <button className="btn btn-soft" onClick={() => void navigator.share({ title: "AEGIS", url: link }).catch(() => {})}>{t("share_link")}</button>
              : <span />}
          </div>
        </div>
      )}
      {q.isError && <p role="alert" className="text-sm text-destructive">{t("generic_error")}</p>}
      {!rows.length && q.isSuccess && <p className="text-sm text-muted-foreground">{t("circle_empty")}</p>}
      <ul className="space-y-3">{rows.map((r) => <Member key={r.id} r={r} act={act} />)}</ul>

      {local.some((c) => !invitedNames.has(c.name)) && (
        <div className="space-y-2 border-t pt-3">
          <h3 className="text-sm font-bold">{t("migrate_title")}</h3>
          <p className="text-xs text-muted-foreground">{t("migrate_body")}</p>
          <ul className="space-y-1">
            {local.filter((c) => !invitedNames.has(c.name)).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{c.name} <span className="text-muted-foreground">· {c.relationship}</span></span>
                <button className="btn btn-soft" disabled={busy} onClick={() => void invite(c.name, c.relationship, {
                  perm_walk: c.journey, perm_checkins: c.journey, perm_alerts: c.missed, perm_location: c.location,
                })}>{t("invite_this")}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Link to="/guardian" className="text-sm text-safe underline">{t("guardian_title")}</Link>
    </section>
  );
}

function Member({ r, act }: { r: CircleRow; act: (fn: () => Promise<void>) => Promise<void> }) {
  const t = useT();
  const st = circleState(r);
  const chip = st === "accepted" ? "chip-safe" : st === "pending" ? "chip-warn" : "";
  return (
    <li className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">{r.name}{r.relationship && <span className="font-normal text-muted-foreground"> · {r.relationship}</span>}</p>
        <span className={`chip ${chip}`}>{t(`st_${st}`)}</span>
      </div>
      {st === "pending" && <p className="text-xs text-muted-foreground">{t("expires", { t: fmtTime(new Date(r.expires_at).getTime()) })}</p>}
      {(st === "pending" || st === "accepted") && (
        <div className="divide-y">
          {PERMS.map((p) => (
            <Toggle key={p.k} label={t(p.label)} checked={r[p.k]} onChange={(v) => void act(() => setPerm(r.id, p.k, v))} />
          ))}
        </div>
      )}
      <div className="mt-2">
        {st === "pending" || st === "accepted"
          ? <button className="btn btn-outline w-full" onClick={() => { if (confirm(t("confirm_revoke"))) void act(() => revokeMember(r.id)); }}>{t("revoke")}</button>
          : <button className="btn btn-outline w-full" onClick={() => void act(() => deleteMember(r.id))}>{t("delete_invite")}</button>}
      </div>
    </li>
  );
}
