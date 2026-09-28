import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageTitle } from "@/components/aegis/AppShell";
import { PhoneCodeForm } from "@/components/aegis/PhoneCode";
import { supabase } from "@/integrations/supabase/client";
import { authErrorKey, useSession } from "@/lib/auth";
import { deleteMyAccount } from "@/lib/account.functions";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account — AEGIS" },
      { name: "description", content: "Manage your AEGIS account: name, recovery email, phone number and deletion." },
      { property: "og:title", content: "Account — AEGIS" },
      { property: "og:description", content: "Your AEGIS account settings." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const t = useT();
  const nav = useNavigate();
  const { user } = useSession();
  const del = useServerFn(deleteMyAccount);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState<string | null>(null);
  const [showPhone, setShowPhone] = useState(false);

  useEffect(() => {
    if (!user) return;
    void supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setName(data?.display_name ?? ""));
  }, [user]);

  if (!user) return null;
  const pendingEmail = user.new_email;

  async function signOut() {
    await supabase.auth.signOut();
    void nav({ to: "/", replace: true });
  }

  return (
    <div className="space-y-4">
      <PageTitle sub={t("account_cloud_body")}>{t("account")}</PageTitle>

      <section className="card-aegis space-y-2 p-4">
        <p className="chip chip-safe">{t("acc_cloud")}</p>
        <p className="text-lg font-bold">{user.phone ? `+${user.phone}` : "—"}</p>
        <form className="flex gap-2" onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: name.trim().slice(0, 80) || null });
          if (error) toast.error(t("generic_error")); else toast.success(t("saved"));
        }}>
          <input className="input-aegis flex-1" placeholder={t("display_name")} aria-label={t("display_name")} maxLength={80}
            value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn btn-soft">{t("save")}</button>
        </form>
      </section>

      <section className="card-aegis space-y-2 p-4">
        <h2 className="font-bold">{t("recovery_email")}</h2>
        <p className="text-sm text-muted-foreground">{t("recovery_email_hint")}</p>
        {user.email && <p className="text-sm">{user.email} <span className="chip chip-safe ml-1">{t("email_verified")}</span></p>}
        {pendingEmail && <p className="text-sm">{pendingEmail} <span className="chip chip-warn ml-1">{t("email_pending")}</span></p>}
        <form className="flex gap-2" onSubmit={async (e) => {
          e.preventDefault();
          if (!/^\S+@\S+\.\S+$/.test(email)) return;
          const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${window.location.origin}/account` });
          if (error) toast.error(t(authErrorKey(error))); else setEmailSent(email);
        }}>
          <input className="input-aegis flex-1" type="email" placeholder={t("email_label")} aria-label={t("email_label")}
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn btn-soft">{t("save")}</button>
        </form>
        {emailSent && <p role="status" className="text-sm text-safe">{t("email_link_sent", { e: emailSent })}</p>}
      </section>

      <section className="card-aegis space-y-2 p-4">
        <h2 className="font-bold">{t("change_phone")}</h2>
        <p className="text-sm text-muted-foreground">{t("phone_change_hint")}</p>
        {showPhone ? (
          <PhoneCodeForm
            phoneLabel="new_phone"
            onSend={async (phone) => {
              const { error } = await supabase.auth.updateUser({ phone });
              return error ? authErrorKey(error) : null;
            }}
            onVerify={async (phone, token) => {
              const { error } = await supabase.auth.verifyOtp({ phone, token, type: "phone_change" });
              if (error) return authErrorKey(error);
              toast.success(t("saved")); setShowPhone(false);
              return null;
            }}
          />
        ) : <button className="btn btn-outline" onClick={() => setShowPhone(true)}>{t("change_phone")}</button>}
      </section>

      <section className="card-aegis space-y-2 p-4">
        <button className="btn btn-soft w-full" onClick={() => void signOut()}>{t("sign_out")}</button>
        <button className="btn btn-danger w-full" onClick={async () => {
          if (!confirm(t("confirm_delete_account"))) return;
          try {
            await del();
            await supabase.auth.signOut();
            toast.success(t("account_deleted"));
            void nav({ to: "/", replace: true });
          } catch { toast.error(t("generic_error")); }
        }}>{t("delete_account")}</button>
      </section>
    </div>
  );
}
