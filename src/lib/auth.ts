/** Account (Cloud) session state and phone helpers. Local mode = no session; the app works fully without one. */
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { TKey } from "./i18n";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); setReady(true); });
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);
  return { session, user: session?.user ?? null, ready };
}

export const COUNTRIES = [
  { code: "IN", dial: "91", label: "India +91", re: /^[6-9]\d{9}$/ },
  { code: "US", dial: "1", label: "USA/Canada +1", re: /^[2-9]\d{9}$/ },
  { code: "GB", dial: "44", label: "UK +44", re: /^7\d{9}$/ },
  { code: "AE", dial: "971", label: "UAE +971", re: /^5\d{8}$/ },
  { code: "SG", dial: "65", label: "Singapore +65", re: /^[89]\d{7}$/ },
  { code: "AU", dial: "61", label: "Australia +61", re: /^4\d{8}$/ },
] as const;
export type CountryCode = (typeof COUNTRIES)[number]["code"];

/** Returns E.164 (e.g. +919876543210) or null when invalid. Strips spaces, dashes and a leading 0. */
export function normalizePhone(country: CountryCode, raw: string): string | null {
  const c = COUNTRIES.find((x) => x.code === country)!;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith(c.dial) && d.length > c.dial.length + 6) d = d.slice(c.dial.length);
  d = d.replace(/^0+/, "");
  return c.re.test(d) ? `+${c.dial}${d}` : null;
}

/** Map sign-in errors to translated, user-meaningful messages. */
export function authErrorKey(err: { code?: string | undefined; message?: string | undefined; status?: number | undefined } | null): TKey {
  const code = err?.code ?? "";
  const msg = (err?.message ?? "").toLowerCase();
  if (code === "otp_expired" || msg.includes("expired")) return "expired_code";
  if (code.includes("rate_limit") || err?.status === 429 || msg.includes("rate limit") || msg.includes("too many")) return "too_many";
  if (code === "sms_send_failed" || code === "phone_provider_disabled" || msg.includes("sms") || msg.includes("provider")) return "sms_down";
  if (code === "invalid_credentials" || msg.includes("invalid") || msg.includes("token")) return "wrong_code";
  return "generic_error";
}
