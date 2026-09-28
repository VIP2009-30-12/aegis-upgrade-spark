import { useEffect, useState } from "react";
import { COUNTRIES, normalizePhone, type CountryCode } from "@/lib/auth";
import { useT, type TKey } from "@/lib/i18n";

const COOLDOWN = 60;

/** Shared two-step phone → 6-digit code form. Caller supplies the send and verify actions. */
export function PhoneCodeForm({
  phoneLabel, onSend, onVerify,
}: {
  phoneLabel: TKey;
  onSend: (e164: string) => Promise<TKey | null>;
  onVerify: (e164: string, code: string) => Promise<TKey | null>;
}) {
  const t = useT();
  const [country, setCountry] = useState<CountryCode>("IN");
  const [raw, setRaw] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<TKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  async function send(target: string) {
    setBusy(true); setErr(null);
    const e = await onSend(target);
    setBusy(false);
    if (e) { setErr(e); return; }
    setPhone(target); setCode(""); setLeft(COOLDOWN);
  }

  if (!phone) {
    return (
      <form className="space-y-3" onSubmit={(e) => {
        e.preventDefault();
        const n = normalizePhone(country, raw);
        if (!n) { setErr("phone_invalid"); return; }
        void send(n);
      }}>
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <label className="sr-only" htmlFor="cc">{t("country")}</label>
          <select id="cc" className="field" value={country} onChange={(e) => setCountry(e.target.value as CountryCode)}>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <label className="sr-only" htmlFor="ph">{t(phoneLabel)}</label>
          <input id="ph" className="field" inputMode="tel" autoComplete="tel-national" placeholder={t(phoneLabel)}
            value={raw} onChange={(e) => setRaw(e.target.value)} />
        </div>
        {err && <p role="alert" className="text-sm text-destructive">{t(err)}</p>}
        <button className="btn btn-safe w-full" disabled={busy}>{t("send_code")}</button>
      </form>
    );
  }

  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      if (!/^\d{6}$/.test(code)) { setErr("wrong_code"); return; }
      setBusy(true); setErr(null);
      const r = await onVerify(phone, code);
      setBusy(false);
      if (r) setErr(r);
    }}>
      <label htmlFor="otp" className="text-sm font-semibold">{t("code_sent_to", { p: phone })}</label>
      <input id="otp" className="field text-center text-2xl tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code"
        maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} aria-label={t("code_label")} />
      {err && <p role="alert" className="text-sm text-destructive">{t(err)}</p>}
      <button className="btn btn-safe w-full" disabled={busy || code.length !== 6}>{t("verify")}</button>
      <div className="flex justify-between text-sm">
        <button type="button" className="underline" onClick={() => { setPhone(null); setErr(null); }}>{t("change_number")}</button>
        <button type="button" className="underline disabled:no-underline disabled:opacity-60" disabled={left > 0 || busy} onClick={() => void send(phone)}>
          {left > 0 ? t("resend_in", { s: left }) : t("resend")}
        </button>
      </div>
    </form>
  );
}
