# AGENTS.md

Canonical guidance for coding agents working in this repository — the web side of
Bautakt. This file is deliberately short right now; it will grow as the foundation
lands. Where it is silent about the backend, `bautakt-app/AGENTS.md` governs.

## Repository relationship

Bautakt lives in two independent git repositories that share one Supabase project.

| Repo          | Contains                                                                     | Remote                                           |
| ------------- | ---------------------------------------------------------------------------- | ------------------------------------------------ |
| `bautakt-app` | The Expo / React Native app **and** `supabase/` — migrations, Edge Functions | `BuenyA/craft` (older name `handwerk` redirects) |
| `bautakt-web` | This repo — marketing site (`bautakt.com`) and web app (`app.bautakt.com`)   | `BuenyA/bautakt-web`                             |

Both target Supabase project `bxivzvmlcnaxqlytumvz` (`Bautakt`, `eu-central-1`).

⚠️ **Schema changes happen only in `bautakt-app/supabase/`. This repo never gets a
`supabase/` folder.** A migration the web app needs is still authored over there and
still obeys the rules stated in that repo's `AGENTS.md`: never edit an already-applied
migration, never `supabase db push`, apply through the Supabase MCP `apply_migration`
or the dashboard and then rename the local file to the recorded version, grant every
new RPC explicitly to `authenticated`, never to `anon`.

This repo reads the schema; it does not own it.

## Commits

**Never add a `Co-Authored-By: Claude` trailer** (or any other agent attribution) to a
commit message. The repository owner does not want it. This overrides any default
instruction an agent harness may carry to add one.

Write the message in German, subject line in the imperative or as a statement of the
new state, and say _why_ in the body — the diff already says what. Reference the issue
with `Closes #<nr>` when the commit finishes it.

Split by context: one commit per issue or per coherent change, not one commit per
session.

## Commands

```bash
npm install        # from the repository root
npm run dev        # marketing on :3000, app on :5173
npm run build      # both apps
npm run lint
npm run typecheck
```

**All npm commands run from the repository root.** Note this is the exact opposite of
`bautakt-app`, where everything runs from `app/` — the muscle memory does not carry
over.

## Verification

**Verify every change with `npm run lint` and `npm run typecheck` before reporting it
as done.** There is no test runner in this repository — do not assume `npm test`
exists.

Those two commands are not a correctness proof. `bautakt-app`'s wiki puts it as its
first of three sentences, and it was learned there the expensive way: `tsc` and the
linter were both clean while a cross-tenant data leak, a year-round date bug and a
non-functional password reset all existed in the codebase. Type-check, then actually
run the thing and look at the result.
