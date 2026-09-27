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
