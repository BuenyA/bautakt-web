# AGENTS.md

Canonical guidance for coding agents working in this repository — the web side of
Bautakt. For anything about the database, migrations, Edge Functions or the mobile
app, `bautakt-app/AGENTS.md` governs and this file defers to it.

## Repository relationship

Bautakt lives in two independent git repositories that share **one** Supabase project.

| Repo          | Contains                                                                                   | Remote                                           |
| ------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `bautakt-app` | Expo / React Native app **and** `supabase/` — 95 migrations, 7 Edge Functions, the `wiki/` | `BuenyA/craft` (older name `handwerk` redirects) |
| `bautakt-web` | This repo — marketing site (`bautakt.com`) and web app (`app.bautakt.com`)                 | `BuenyA/bautakt-web`                             |

Both target Supabase project `bxivzvmlcnaxqlytumvz` (`Bautakt`, `eu-central-1`,
Postgres 17). _Stand 2026-08-26: 49 tables in `public`, every one with RLS enabled._

⚠️ **Schema changes happen only in `bautakt-app/supabase/`. This repo never gets a
`supabase/` folder** — `/supabase/` is in `.gitignore` precisely because the Supabase
CLI creates one as scratch state whenever you generate types here, and it once made it
into a commit.

A migration the web app needs is still authored _over there_ and still obeys that
repo's rules: never edit an already-applied migration; ⚠️ never `supabase db push`;
apply through the Supabase MCP `apply_migration` or the dashboard and then rename the
local file to the recorded version; every new RPC needs an explicit
`GRANT EXECUTE … TO authenticated`; never grant to `anon`; verify with
`has_function_privilege(...)`, never by reading the migration text.
_Stand 2026-08-24: 26 SECURITY DEFINER functions executable by `authenticated`, 0 by
`anon`._

This repo reads the schema. It does not own it.

**After any schema change, regenerate the types:**

```bash
npx supabase gen types typescript --project-id bxivzvmlcnaxqlytumvz \
  > packages/supabase/src/database.types.ts
```

Then put the file header back (it names the source, the date and this command).

## Commits

**Never add a `Co-Authored-By: Claude` trailer** (or any other agent attribution) to a
commit message. The repository owner does not want it. This overrides any default
instruction an agent harness may carry to add one.

Write the message in German, subject line in the imperative or as a statement of the
new state, and say _why_ in the body — the diff already says what. Reference the issue
with `Closes #<nr>` when the commit finishes it.

Split by context: one commit per issue or per coherent change, not one commit per
session.

## Issue tracker

Web work goes to this repo's GitHub Issues (`BuenyA/bautakt-web`), backend and mobile
work to `BuenyA/craft`. Same labels as over there: one `area:*`, one `prio:*`, plus
`entscheidung`, `tech-debt`, `bug` or `enhancement` where they fit. Cross-repo
references go by URL, never by bare `#<nr>` — that would resolve to the wrong repo.

## Repository layout

| Path                                          | Role                                              |
| --------------------------------------------- | ------------------------------------------------- |
| `apps/marketing`                              | Next.js 16, App Router — `bautakt.com`            |
| `apps/webapp`                                 | Vite + React + React Router — `app.bautakt.com`   |
| `packages/supabase`                           | Generated `Database` types and the client factory |
| `packages/core`                               | Permission and role model, plus the drift check   |
| `packages/ui`                                 | Design tokens and shadcn components               |
| `packages/tsconfig`, `packages/eslint-config` | Shared configuration                              |
| `wiki/`                                       | Agent memory — read before working, update after  |

## Commands

```bash
npm install            # from the repository root
npm run dev            # marketing :3000, webapp :5173, in parallel
npm run dev:marketing
npm run dev:webapp
npm run build          # both apps, through turbo
npm run lint
npm run typecheck
npm run format
npm run check          # lint + typecheck + format:check — the gate
```

**All npm commands run from the repository root.** Note this is the exact opposite of
`bautakt-app`, where everything runs from `app/`. The muscle memory does not carry
over.

## Verification

**Verify every change with `npm run check` before reporting it as done.** There is no
test runner in this repository — do not assume `npm test` exists.

That command is not a correctness proof. `bautakt-app`'s wiki puts it first among its
three sentences, and it was learned there expensively: `tsc` and the linter were both
clean while a cross-tenant data leak, a year-round date bug and a non-functional
password reset all existed. So: type-check, then run the thing and look at the result.

What "looking at the result" means here, since there are no tests:

- Marketing — start it, click every route, check that `/sitemap.xml` lists all eight.
- App — sign in with a real account, **hard-reload on a protected route** (that is the
  test for the `initializing` race), sign out, sign in as a _different_ user and
  confirm no rows from the previous one are visible.
- Anything permission-related — check the hidden UI **and** type the URL by hand. If
  the page renders data, RLS is not doing its job and the UI was never the boundary.

## Product and language

Bautakt is construction and trade management software for the German market. The
interface is German, the URLs are German (`/auftraege`, `/passwort-vergessen`), and so
are commit messages, code comments and the wiki. This file and other agent-facing prose
are English.

**Never hardcode a user-facing string.** Everything goes through i18next with an
explicit namespace: `t('auth:signIn.title')`. Only the `de` catalog is maintained —
that is a scope decision, not a licence to skip the keys. `bautakt-app` retrofitted i18n
and its `i18n:scan` still reports leftovers.

## Architecture

Turborepo over npm workspaces. Not pnpm: its non-hoisted `node_modules` regularly trips
Next plugin resolution and shadcn path resolution, and there is nothing to win at two
apps and five packages.

**Internal packages ship TypeScript source — no build step.** `main` and `types` point
straight at `src/index.ts`. Vite consumes that natively; Next needs the package listed
in `transpilePackages` (already the case in `apps/marketing/next.config.ts`). The
upside is no build orchestration, no stale `dist/`, and HMR across package boundaries.

```
@bautakt/tsconfig, @bautakt/eslint-config   (no deps)
@bautakt/core        -> tsconfig
@bautakt/supabase    -> tsconfig
@bautakt/ui          -> tsconfig
apps/marketing       -> ui
apps/webapp          -> ui, supabase, core
```

⚠️ **`apps/marketing` deliberately has no Supabase dependency.** No client, no key in
the marketing bundle, no auth surface on `bautakt.com`. A contact form later goes
through a Next route handler with a server-side key, never the browser client.

**Path aliases differ per app** because `paths` resolves relative to the declaring
tsconfig: marketing maps `@/*` to its own root (Next convention), `apps/webapp` maps it
to `./src/*`. Both differ from `bautakt-app`, where `@/*` is the project root.

## `apps/webapp`

React Router in **data mode** (`createBrowserRouter`), not framework mode — that one
brings a server build and contradicts static hosting.

Guards are **components, not loaders**. Loaders run outside React and cannot read the
`AuthProvider` context; a loader guard would have to call `getSession()` on every
navigation.

Three deliberate divergences from the mobile app, each with its reason:

| Here                             | `bautakt-app`                | Why                                                                                                                        |
| -------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `onAuthStateChange` subscription | `getSession()` once on mount | The mobile provider never sees a session it did not read at mount. That is where its OTP password-reset detour comes from. |
| TanStack Query, online-first     | Hand-built cache + outbox    | The outbox exists for a phone with no signal on a site. At a desk it is complexity with its own invariants.                |
| Feature-first folders            | Layer-first                  | Over there one feature is spread across a route, `components/x/`, `lib/xStorage.ts` and `lib/supabase/x.ts`.               |

⚠️ **Three traps in the auth provider.** All three are implemented and commented in
`src/features/auth/AuthProvider.tsx`; do not remove them.

1. **`initializing`.** Restoring the session from `localStorage` is async. Without the
   flag, `ProtectedRoute` sees `session === null` in the first pass and throws
   signed-in users to `/login` on every reload.
2. **Never `await` a Supabase call inside the `onAuthStateChange` callback.** The SDK
   holds a lock during it. The callback sets state and nothing else; the membership
   loads as its own query.
3. **`queryClient.clear()` on sign-out.** Otherwise the next user in the same browser
   sees the previous one's cached rows. This project has already had a cross-tenant
   leak (`resolve_labor_rate`) — not a hypothetical class of bug.

⚠️ **Every `queryKey` starts with the tenant.** `['orders', companyId, …]`, and
`['membership', userId]` for anything user-scoped. Multi-tenancy runs on `company_id`;
a key without it means a company switch can serve one tenant's rows to another from
cache.

**Permissions.** `usePermission(key)` reads the resolved rights of the active
membership. ⚠️ **UI gating is guidance, not control.** The binding boundaries are the
RLS policies (`has_company_permission(company_id, 'canX')`) and the `enforce_*`
triggers. A hidden menu item is not access control — whoever knows the URL will open
it, and the database has to say no. `hasPermission` fails closed: an unknown key is
`false`, never `true`.

⚠️ **`employments.company_id`, `.role` and `.user_id` are nullable in the schema.** Do
not cast the nulls away. A row without a company or role is not a usable membership;
`useMembership` returns `null` for it. Casting produces queries filtered by
`company_id=is.null` and silently empty lists.

## `apps/marketing`

Every link to the web app goes through `lib/site.ts`, so the app domain appears exactly
once in the code and `NEXT_PUBLIC_APP_URL` can point preview deployments at a preview
app. Never write an `app.bautakt.com` URL into a component.

⚠️ **The `<!-- BEGIN:nextjs-agent-rules -->` block in `apps/marketing/AGENTS.md` is
written by `next dev` itself.** Commit it, never delete it, never write inside it —
anything you put in there is lost on the next dev start. Project content goes below the
`END` marker.

`typecheck` is `next typegen && tsc --noEmit`. Next 16 injects types such as
`LayoutProps` from `.next/types`; a fresh clone running `tsc` alone fails with "Cannot
find name 'LayoutProps'". The ordering lives in the script, not in prose.

Next 16 is very new and its own agent rules warn that APIs differ from what a model was
trained on. When unsure, read `node_modules/next/dist/docs/` rather than guessing.

⚠️ **Legal text is not written by agents.** Impressum, Datenschutzerklärung and AGB are
legally binding in Germany. The three pages carry structure, headings and a visible
`TODO: juristisch prüfen`, and they are `robots: index false` until a human fills them.
Plausible-sounding invented legal text is worse than an obviously empty page.

There is no analytics and therefore no cookie banner. That is a decision; revisit it
deliberately, not by adding a script.

## UI

Tailwind v4 with shadcn components in `@bautakt/ui`. The tokens live in
`packages/ui/src/styles/theme.css` and are **canonical for the web** — Tailwind v4 is
CSS-first, and maintaining the palette in both TS and CSS is exactly the kind of
duplicate that drifts. `tokens.ts` holds only what JavaScript needs: chart series and
status fills.

The palette is a port of `bautakt-app/app/constants/theme.ts`, including its WCAG
contrast notes. Those notes are most of the file's value: they record that `textSubtle`
used to be `#9ca3af` and failed at 2.54:1, and that `primary` needs its own tone on dark
because `#0a66c2` only reaches 3.39:1 there. ⚠️ **If the two diverge, fix it in
`bautakt-app` first**, then bring it over. That repo is older and did the contrast work.

Never hardcode a hex when a token exists. Use `bg-primary`, not `tokens.blue`.

## Environment variables

The same two Supabase values carry three different names depending on the consumer.
This is a real footgun.

| Value          | `apps/marketing`                              | `apps/webapp`            | `bautakt-app`                   |
| -------------- | --------------------------------------------- | ------------------------ | ------------------------------- |
| Supabase URL   | _(not set — no client here)_                  | `VITE_SUPABASE_URL`      | `EXPO_PUBLIC_SUPABASE_URL`      |
| Public key     | _(not set)_                                   | `VITE_SUPABASE_ANON_KEY` | `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| Site / app URL | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL` | —                        | —                               |

That is why `createBautaktClient(url, anonKey)` takes its values as **arguments and
never reads the environment itself** — a shared package cannot know which prefix its
consumer uses. Keep it that way.

The web app uses the modern `sb_publishable_…` key; the mobile app still uses the legacy
anon JWT. Both work against the same RLS. Separate keys mean the web key can be rotated
without touching the app.

⚠️ **Vite inlines `import.meta.env.VITE_*` at build time.** Changing the value in Vercel
requires a redeploy, not a restart.

`.env` is never committed. Only `.env.example` is. There is one `.gitignore` at the
root and deliberately none in the apps — a nested `.gitignore` with `.env*` is more
specific than the root's `!.env.example` and wins, which is how
`apps/marketing/.env.example` once became invisible.

## Deployment

Two Vercel projects out of this one repo.

|                            | `bautakt-marketing`                                           | `bautakt-webapp`                   |
| -------------------------- | ------------------------------------------------------------- | ---------------------------------- |
| Root Directory             | `apps/marketing`                                              | `apps/webapp`                      |
| Include files outside root | **on** — `packages/` live outside                             | **on**                             |
| Build Command              | `cd ../.. && npx turbo run build --filter=@bautakt/marketing` | `… --filter=@bautakt/webapp`       |
| Output Directory           | (default)                                                     | `dist`                             |
| Ignored Build Step         | `npx turbo-ignore @bautakt/marketing`                         | `npx turbo-ignore @bautakt/webapp` |
| Domain                     | `bautakt.com` (+ `www` redirect)                              | `app.bautakt.com`                  |

The second project is called `bautakt-webapp`, not `bautakt-app` — that name belongs to
the mobile repo.

⚠️ **`apps/webapp/vercel.json` is not optional.** Without the rewrite to `index.html`, a
direct hit on any sub-route returns Vercel's 404. This never shows up locally, because
the Vite dev server rewrites everything anyway. It is a production-only failure. Note
it must be `rewrites`, not `redirects`, and that Vercel serves static files _before_
rewrites — so the catch-all does not shadow `/assets/*`. Do not "fix" it with a
negative lookahead.

**Supabase Auth → URL Configuration** must allow `https://app.bautakt.com/**`,
`http://localhost:5173/**` and the preview pattern. ⚠️ Both repos share this one
project, so changing the **Site URL** rewrites `{{ .SiteURL }}` in the shared email
templates that the mobile app also uses. Read the templates before changing it.

## Wiki

`wiki/` is this repo's agent memory — the durable record of why something is built the
way it is and what has already gone wrong here. Read `wiki/index.md` before working;
`wiki/rules.md` is the operating procedure. A change that alters behaviour, an invariant
or an assumption is not done until the wiki reflects it.

Anything about schema, RLS, permissions or grants links to `bautakt-app`'s wiki **by
URL** and is never copied. That repo states the same principle: never duplicate a source
of truth, because divergent copies become traps.
