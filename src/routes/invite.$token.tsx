import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageTitle } from "@/components/aegis/AppShell";
import { useSession } from "@/lib/auth";
import { useT, type TKey } from "@/lib/i18n";
import { acceptInvite, type AcceptResult } from "@/lib/cloud";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [
      { title: "Safety Circle invite — AEGIS" },
      { name: "description", content: "Accept an invitation to someone's AEGIS Safety Circle." },
      { property: "og:title", content: "Safety Circle invite — AEGIS" },
      { property: "og:description", content: "You've been invited to an AEGIS Safety Circle." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Invite,
});

const MSG: Record<Exclude<AcceptResult, "accepted">, TKey> = {
  expired: "inv_expired", revoked: "inv_revoked", invalid: "inv_invalid", used: "inv_used", own: "inv_own", already: "inv_already", signin: "inv_signin",
};

function Invite() {
  const t = useT();
  const { token } = Route.useParams();
  const { user, ready } = useSession();
  const [res, setRes] = useState<{ result: AcceptResult; owner: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  return (
    <div className="space-y-4">
      <PageTitle sub={t("inv_body")}>{t("inv_title")}</PageTitle>
      {!ready ? null : !user ? (
        <div className="card-aegis space-y-3 p-4">
          <p className="text-sm">{t("inv_signin")}</p>
          <Link to="/auth" className="btn btn-safe w-full">{t("sign_in")}</Link>
        </div>
      ) : res ? (
        <div className="card-aegis space-y-3 p-4" role="status">
          <p>{res.result === "accepted" ? t("inv_accepted", { n: res.owner ?? t("someone") }) : t(MSG[res.result])}</p>
          {(res.result === "accepted" || res.result === "already") && <Link to="/guardian" className="btn btn-safe w-full">{t("go_guardian")}</Link>}
        </div>
      ) : (
        <div className="card-aegis space-y-3 p-4">
          <button className="btn btn-safe w-full" disabled={busy} onClick={async () => {
            setBusy(true); setErr(false);
            try { setRes(await acceptInvite(token)); } catch { setErr(true); } finally { setBusy(false); }
          }}>{t("inv_accept")}</button>
          {err && <p role="alert" className="text-sm text-destructive">{t("generic_error")}</p>}
        </div>
      )}
    </div>
  );
}
