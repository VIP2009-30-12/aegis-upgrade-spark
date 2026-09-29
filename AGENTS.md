<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## AEGIS decisions
- Phase 1 data lives in `src/lib/store.ts` (typed localStorage store + actions); screens call only its actions so Phase 2 can swap to Lovable Cloud.
- All UI strings go through `src/lib/i18n.ts` (en/hi/te dictionaries typed against English keys) so no language can miss a string.
- Help numbers live in `src/data/help.ts` as data, to move into Cloud for no-rebuild edits.
- Accounts are optional: session via `useSession` in `src/lib/auth.ts`; only `/account` sits under `_authenticated/`, so SOS/help never require login.
- Profiles are created client-side on first sign-in (upsert own row under RLS), not via triggers on auth tables.
- Account deletion runs in `src/lib/account.functions.ts` with the verified session user id only.
- Cloud mirroring of walks/check-ins lives in `src/lib/cloud.ts` (store emits events via `onSessionEvent`; client uuids make retries idempotent) so local mode stays untouched.
- Guardians read only through security-definer RPCs (`guardian_overview`, `ack_alert`, `accept_invite`, `leave_circle`), never direct table access, so permissions are enforced server-side.
- Missed check-ins are escalated by the SQL function `escalate_overdue()` on a 1-minute schedule; unique (walk, due, member) prevents duplicates.
- Facility/CCTV data only from `src/data/facilities.ts` verified datasets; empty means "unavailable", never sample points.
