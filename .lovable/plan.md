# AEGIS — Build Plan

This project is currently empty, so AEGIS will be built fresh here, in three phases. Each phase is usable on its own.

## Phase 1 — The app on your phone (sandbox mode)
- Dark navy look with teal, gold and restrained red; mobile-first, one-handed, bottom navigation.
- Home: large hold-to-activate SOS, Quick Walk, Planned Journey, plus active-session banner.
- SOS: hold ~2s, then in parallel: open the 112 dialer, record alerts to every eligible contact, start GPS. Status screen shows each step separately (call opened / contacts alerted / location acquired / "112 has NOT received your location"). Retry failed alerts. No alarm sound. Duplicate SOS blocked.
- Quick Walk: one tap, optional timer (15m / 30m / 1h / 2h / none), elapsed time, countdown, I'm Safe, Extend, End, Alert contacts, SOS.
- Planned Journey: optional destination, arrival time, check-in interval, grace period, location sharing.
- Discreet check-ins: silent visual reminder, optional vibration, grace period, then one neutral escalation (no duplicates).
- Trusted contacts: add/edit/remove, choose who gets alerts and location, consent status.
- Help directory: official India/Telangana numbers (112, 181, 1098, 100, 108, Tele-MANAS 14416, etc.), verified before publishing, emergency vs non-emergency clearly split, one-tap call.
- History with filters and delete-all; Settings for language (English / Hindi / Telugu), check-ins, sound/vibration (off by default), high contrast, large text, reduced motion, delete data.
- All alerts are clearly labelled "Simulated — not sent".

## Phase 2 — Lovable Cloud
- Sign-in; contacts, sessions and alerts stored privately per user.
- Server-side scheduled check that escalates overdue sessions even if the page is closed.
- Secure, expiring acknowledgement links for contacts (no location on public pages beyond what's authorized).

## Phase 3 — Real SMS/email
- Requires a provider account (e.g. Twilio / MSG91) and your explicit go-ahead; stays sandboxed until then.

## Honest limitations (will be in the final report)
- Web apps cannot send GPS to 112 or place calls silently; we only open the dialer. ERSS integration requires official authorization.
- Browsers cannot run in the background when closed; reliable background location/alerts need a native Android/iOS app.

## Technical notes
- TanStack Start routes: `/`, `/sos`, `/walk`, `/journey`, `/contacts`, `/help`, `/history`, `/settings`.
- Phase 1 state in a typed local store (localStorage) behind a data layer so Phase 2 swaps to Cloud tables with RLS + a cron server route.
- i18n via a typed dictionary; accessibility via CSS tokens toggled on `<html>`.
