# AEGIS Upgrade — Audit and Staged Plan

## Audit (what exists today)
- App works fully on the phone with no account: SOS (opens 112 dialer), Quick Walk, Planned Journey, check-ins, trusted contacts, help numbers, history, settings, English/Hindi/Telugu.
- All data is saved only on the device. No accounts, no server, no real messages. Alerts are labelled "Simulated — not sent".
- Check-in timers stop when the app is closed.
- No Android (Capacitor) setup was found in this project, although the brief mentions one. If it lives in the GitHub repo only, it needs to be synced here before Android work.
- No maps, no CCTV data, no guardian view.

### Where each existing feature lives (kept as is, extended only)
- SOS: `routes/sos.tsx`, `components/aegis/HoldSOS.tsx`, store `activateSOS` / `endSOS`.
- Quick Walk / Planned Journey / check-ins: `routes/walk.tsx`, `routes/journey.tsx`, `routes/sessions.tsx`, `components/aegis/SessionPanel.tsx`, store `startSession`, `checkInSafe`, `extendTimer`, `endSession`, `escalateIfOverdue`.
- Contacts: `routes/contacts.tsx`, store `saveContact` / `removeContact`.
- Help: `routes/help.tsx`, `data/help.ts`. History: `routes/history.tsx`. Settings: `routes/settings.tsx`.
- Languages: `lib/i18n.ts`. Navigation: `components/aegis/AppShell.tsx`.

## Stage 1 in detail (first thing built after approval)
- Turn on Lovable Cloud (no cost to start).
- Add a "Sign in" entry in Settings and a small account badge in the header; nothing else changes. The app keeps working without an account ("Local mode"); signed-in shows "Cloud account".
- New sign-in screen: country picker defaulting to +91, number check, 6-digit code screen with resend countdown, clear messages for wrong code, expired code, too many tries and SMS service down.
- Codes are created, expired and rate-limited by Cloud's sign-in system; the app never stores them.
- Until you connect and approve an SMS provider, sign-in runs in a clearly labelled **test mode** using fixed test numbers set in Cloud — no SMS is claimed to be sent.
- Settings > Account: sign out, add optional recovery email (verified by link), change phone number (code sent to the new number), delete account.
- A profile record and a separate roles table are created with access rules so each person sees only their own data.
- All new text in English, Hindi and Telugu. SOS and help numbers stay usable signed out and offline.
- After Stage 1 I report changes, tests actually run, remaining setup and limits, then wait for approval of Stage 2.

## Services, costs and credentials needed
| Need | Service | Cost | Your action |
|---|---|---|---|
| Accounts, storage, scheduled checks | Lovable Cloud | Included usage, then pay-as-you-go | Approve turning it on |
| SMS login codes (OTP) | Twilio Verify (or MessageBird/Vonage) | ~₹0.5–5 per SMS in India; India needs DLT registration for sender IDs | Create account, approve before any real SMS |
| Alert SMS to contacts | Same provider | Per message | Explicit go-ahead before live sending |
| Maps and walking routes | Google Maps Platform (Maps JS, Routes, Places) | Free monthly credit, then per request; billing account required | Create Google Cloud project, set budget alert |
| CCTV locations | Official open-data portals only | Free | None; shown as "unavailable" where no verified data |

## Stages (each approved separately)
1. **Cloud + phone login** — turn on Lovable Cloud; +91 phone input, SMS code sign-in, resend cooldown, expiry, rate limits, sign-out, optional email recovery, phone change with re-verification. Works in test mode until the SMS provider is connected.
2. **Profile and safety circle** — name/photo; invite contacts by secure expiring link; they must sign in and accept; per-contact choice of walk status / alerts / location; revoke anytime. Move existing on-device contacts into the account.
3. **Quick Walk on the server** — walks and check-ins saved to the account; "I'm safe" confirmed only after save; extend, change destination, stop sharing, end with confirmation; safe retries.
4. **Missed check-in escalation** — a server check runs every minute and escalates overdue walks even when the app is closed; one alert per missed check-in; stays simulated until you approve live SMS.
5. **Guardian dashboard** — accepted contacts see only what was shared: walk status, last check-in, overdue state, location with age/accuracy; acknowledge alerts.
6. **Google Maps routes** — destination search, walking routes, distance/time, open in Google Maps.
7. **CCTV and public facilities** — import layer for approved datasets with source, licence and date; hospitals/police stations; nothing invented.
8. **Privacy, offline, SOS polish** — network indicator, never show unsaved check-ins as done, location minimisation and retention, 112 wording reviewed.
9. **Android** — only after the Capacitor project is present here; foreground location first, background only if you opt in.

## Risks and honest limits
- A website cannot track location or run timers once closed; the server escalation in stage 4 covers missed check-ins, but live location stops.
- AEGIS cannot send location to 112; it only opens the dialer.
- Recycled phone numbers: mitigated by re-verification and alerting the old email if set.
- India SMS needs DLT registration, which can take days.

## Technical notes
- Tables with row-level security: profiles, contacts/invitations (hashed tokens), walks, check_ins, alerts, alert_recipients, location_points, user_roles.
- Scheduled server route under /api/public/cron with a shared secret for escalation.
- Phone OTP via Cloud phone auth with the chosen SMS provider; no codes stored by the app.
- Existing store actions keep their shape so screens change minimally.
