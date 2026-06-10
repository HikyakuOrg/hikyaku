# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> A detailed companion guide already exists at `AGENTS.md` (product map, auth/data flow, UI conventions). Read it too — this file summarizes and adds the cross-cutting architecture. Deeper framework guidance is vendored under `.agents/skills/*` (React performance, composition, Supabase/Postgres).

## Commands

Package manager is **pnpm**. There is **no `pnpm test`** script — automated coverage is Playwright only.

- `pnpm dev` — start the Next.js dev server (usually already running; don't restart it for tests)
- `pnpm build` / `pnpm start` — production build / serve
- `pnpm lint` — ESLint (`eslint-config-next`)
- `pnpm test:e2e` — Playwright `chrome` project (authenticated specs)
- `pnpm test:e2e:headed` / `pnpm test:e2e:ui` — headed / interactive Playwright
- `pnpm test:e2e:auth` — `chrome-unauthed` project (runs `auth-*` and `org-cross-user-*` specs without stored auth)

Run a single test: `pnpm exec playwright test tests/e2e/<file>.spec.ts --project=chrome` (add `-g "<title>"` to target one case).

## Stack

Next.js 16 (App Router, `cacheComponents: true`), React 19, TypeScript (strict), Tailwind v4, Supabase (SSR auth + Postgres), Stripe Connect, MapLibre GL + Valhalla for routing/maps. Import alias `@/*` maps to the repo root (`tsconfig.json`).

## Architecture

**The product** is the protected dashboard. `components/ui/sidebar/app-sidebar.tsx` is the fastest map of business domains: Packages, Customers, Driver Shifts, Fleet, Service, Settings. There's also a customer-facing **booking** flow and an **onboarding** flow. Shared domain types/model logic live in `app/models/*` (packages, driver-shifts, package-status timeline, route path/point, optimisation).

**Multi-tenancy** (`lib/subdomain.ts` + `lib/middleware.ts`). Tenants are organizations addressed by slug. `NEXT_PUBLIC_ROOT_DOMAIN` is the tenant root (`hikyaku.org` in prod; `127.0.0.1` locally, so no hosts edit and the auth cookie can sit on the parent domain via `cookieDomain()`; see `next.config.ts` `allowedDevOrigins`). The active slug is resolved in middleware with **path-based `/orgs/<slug>/…` taking precedence over the host subdomain**, then exposed downstream via the `x-org-slug` request header. The **dashboard is path-based** at `app/orgs/[slug]/dashboard`; the **booking site is the only thing served on a subdomain** `<slug>.<root>` (any non-booking subdomain traffic is redirected to the apex root). Org-scoped data filtering in the data layer is a known deferred follow-up.

**Auth & request flow.** Auth is Supabase SSR. `proxy.ts` (Next 16's renamed middleware) runs `lib/middleware.ts` `updateSession()`, which refreshes cookies (must call `supabase.auth.getClaims()` with nothing between it and client creation, or sessions break) and redirects anonymous apex traffic hitting `/orgs` or other protected routes to `/auth/login`. Org/dashboard layouts under `app/orgs/[slug]` then re-check claims server-side (`getSupabaseServerClaims()`).

**Supabase clients — pick by context:**
- Server components/pages/actions: `lib/supabase/server.ts` and `lib/supabase/db-server.ts` (fresh request-scoped client).
- Client components: `lib/supabase/client.ts`.
- New code uses `lib/supabase/*` with `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`. Older helpers `lib/client.ts` / `lib/server.ts` (using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) are legacy — prefer `lib/supabase/*`.
- **Never** use `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` in the app; it's for backend scripts only and has full DB permissions.

**Data access is split by purpose:** table CRUD/selects in `lib/supabase/db.ts`; Postgres RPC wrappers in `lib/supabase/supabase-rpc.ts` and `lib/supabase/team-rpc.ts`; storage in `lib/supabase/storage.ts`; small server actions in `lib/actions/*`. `lib/supabase/supabase.ts` is the **generated `Database` type layer** consumed throughout — keep it aligned with schema/RPC changes.

**Stripe Connect.** Card issuing runs on **per-org Connect Custom accounts** (self-funded). Server actions are `lib/actions/connect.ts` (account onboarding) and `lib/actions/issuing.ts` (cards); the frontend uses `@stripe/connect-js` / `@stripe/react-connect-js`. (There is no `lib/stripe` directory.)

**Backend API.** Some server-side calls hit a separate `whendan-api` backend via `WHENDAN_API_URL`, wrapped in `lib/api.ts` and `lib/api/*` (e.g. `payments.ts`, `service-fees.ts`).

## UI conventions

- Default to server components for pages/layouts; drop to `"use client"` only for forms, tables, maps, and browser-auth flows.
- Lists layer `components/data-table.tsx` over `components/table-layout.tsx`; row-click navigation comes from an `actions(row)` callback, and bulk selection appears only when `rowSelection` props are passed.
- UI primitives are shadcn (`base-vega` setup in `components.json`) under `components/ui`.
- Next 16 dynamic routes use async params, e.g. `params: Promise<{ id: string }>`.
- For select/multiselect form fields prefer `components/ui/select` (built-in async options + search); use `Popover` for more custom dropdowns. Display human-friendly values (a driver's name) rather than raw IDs.

## Adjacent repos & generated files

Sibling repos in the workspace:
- `../schema` — canonical SQL/bootstrap. For SQL/RPC changes inspect `schema.sql`, `roles.sql`, `default_data.sql` (that's the bootstrap order).
- `../whendan-docs` — Docusaurus docs site.

When SQL/RPC expectations change, update `lib/supabase/supabase.ts` to match.

## Testing notes

- Playwright config (`playwright.config.ts`) reuses an existing dev server; **don't start or restart `pnpm dev`** for tests.
- `playwright.global-setup.ts` logs in with `PLAYWRIGHT_EMAIL` / `PLAYWRIGHT_PASSWORD`, saves `playwright.storageState.json`, and resolves the org slug by visiting `/orgs` (expects redirect to `/orgs/<slug>/dashboard`). Test env vars load from `.env.test`.
- The `chrome` project ignores `auth-*` / `org-cross-user-*` specs (those run unauthenticated under `chrome-unauthed`).
