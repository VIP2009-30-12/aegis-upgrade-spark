import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";
import { PageTitle } from "@/components/aegis/AppShell";
import { PhoneCodeForm } from "@/components/aegis/PhoneCode";
import { supabase } from "@/integrations/supabase/client";
import { authErrorKey, useSession } from "@/lib/auth";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — AEGIS" },
      { name: "description", content: "Optional AEGIS account: sign in with your phone number and a one-time code." },
      { property: "og:title", content: "Sign in — AEGIS" },
      { property: "og:description", content: "Sign in to AEGIS with your phone number." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const t = useT();
  const nav = useNavigate();
  const { user, ready } = useSession();
  const [online, setOnline] = useState(true);
  const [email, setEmail] = useState("");
  const [linkMsg, setLinkMsg] = useState(false);

  useEffect(() => {
    const u = () => setOnline(navigator.onLine);
    u(); addEventListener("online", u); addEventListener("offline", u);
    return () => { removeEventListener("online", u); removeEventListener("offline", u); };
  }, []);
  useEffect(() => { if (ready && user) void nav({ to: "/account", replace: true }); }, [ready, user, nav]);

  return (
    <div className="space-y-4">
      <PageTitle sub={t("auth_intro")}>{t("auth_title")}</PageTitle>
      <div className="card-aegis border-warning p-3 text-sm">
        <p className="flex items-center gap-2 font-bold text-warning"><FlaskConical className="size-4" aria-hidden />{t("test_mode")}</p>
        <p className="mt-1 text-muted-foreground">{t("test_mode_body")}</p>
      </div>
      {!online && <p role="status" className="chip chip-warn">{t("offline")}</p>}
      <section className="card-aegis p-4">
        <PhoneCodeForm
          phoneLabel="phone_label"
          onSend={async (phone) => {
            const { error } = await supabase.auth.signInWithOtp({ phone });
            return error ? authErrorKey(error) : null;
          }}
          onVerify={async (phone, token) => {
            const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
            if (error || !data.user) return authErrorKey(error);
            await supabase.from("profiles").upsert({ id: data.user.id }, { onConflict: "id", ignoreDuplicates: true });
            void nav({ to: "/account", replace: true });
            return null;
          }}
        />
      </section>
      <section className="card-aegis space-y-2 p-4">
        <h2 className="font-bold">{t("recovery_signin")}</h2>
        <p className="text-sm text-muted-foreground">{t("recovery_signin_hint")}</p>
        <form className="flex gap-2" onSubmit={async (e) => {
          e.preventDefault();
          if (!/^\S+@\S+\.\S+$/.test(email)) return;
          // shouldCreateUser:false → only existing accounts with this confirmed email can use it. Same reply either way.
          await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/account` } });
          setLinkMsg(true);
        }}>
          <input className="input-aegis flex-1" type="email" autoComplete="email" placeholder={t("email_label")} aria-label={t("email_label")}
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn btn-soft">{t("send_link")}</button>
        </form>
        {linkMsg && <p role="status" className="text-sm text-safe">{t("link_sent_generic")}</p>}
      </section>
    </div>
  );
}
