# AGENTS.md

## Product Map
- The operational product is the protected dashboard in `app/orgs/[slug]/dashboard`; 
- `components/ui/sidebar/app-sidebar.tsx` is the fastest map of business domains: Packages, Customers, Driver Shifts, Fleet, Service, and Settings.
- This workspace also has sibling repos: `../hikyaku-api` (NestJS backend; `infra/db` holds the canonical SQL/bootstrap scripts) and `../hikyaku-docs` for the Docusaurus docs site. `../hikyaku-docs/docs/architecture.mdx` is the cross-repo architecture map — read it if you need to know what runs where.

## Auth And Data Flow
- Auth is Supabase SSR. `proxy.ts` calls `lib/middleware.ts`, which refreshes cookies and redirects anonymous users to `/auth/login`; `app/orgs/[slug]/dashboard/layout.tsx` then re-checks claims with `getSupabaseServerClaims()`.
- In server components/pages, prefer `lib/supabase/server.ts` and `lib/supabase/db-server.ts`; they create a fresh request-scoped client. In client components, use `lib/supabase/client.ts`.
- There are older Supabase helpers at `lib/client.ts` and `lib/server.ts` using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; most current code uses `lib/supabase/*` with `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`. Prefer the `lib/supabase/*` path for new work. Do not use `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` in this app, it is only for backend scripts and has full database permissions.
- Data access is split by purpose: table CRUD/selects in `lib/supabase/db.ts`, Postgres RPC wrappers in `lib/supabase/supabase-rpc.ts` and `lib/supabase/team-rpc.ts`, storage helpers in `lib/supabase/storage.ts`, and small server actions in `lib/actions/*`.


## UI Conventions
- Default to server components for pages/layouts, then drop to `"use client"` for forms, tables, maps, and browser-auth flows. Example: `app/orgs/[slug]/dashboard/page.tsx` is server-rendered while `app/orgs/[slug]/dashboard/fleet/vehicles/components/vehicle-form.tsx` owns client-side form state.
- Lists usually layer `components/data-table.tsx` over `components/table-layout.tsx`; row click navigation comes from an `actions(row)` callback, and bulk selection only appears when `rowSelection` props are passed.
- UI primitives live in `components/ui` using the shadcn `base-vega` setup from `components.json`; imports use the `@/*` alias from `tsconfig.json`.
- Some dynamic pages already follow the Next 16 async-params pattern, for example `app/orgs/[slug]/dashboard/driver-shifts/[id]/page.tsx` receives `params: Promise<{ id: string }>`.
- When creating a select or multiselect form field, prefer the `Select` component from `components/ui/select`; it has built-in support for async options and search filtering. For more custom dropdowns, `Popover` is a good base. When displaying selected values, prefer a human friendly format over raw IDs; for example, show a driver's name instead of their `driver_id` in the UI.
## Commands And Environment
- Main app commands are `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test:e2e`, `pnpm test:e2e:headed`, and `pnpm test:e2e:ui`.
- There is no root `pnpm test` script even though some nested README snippets mention it; the checked-in automated coverage here is Playwright.
- `.env.example` documents the main runtime keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`, `NEXT_PUBLIC_HIKYAKU_API_URL` (hikyaku-api base URL — routing, services, payments, geocoding), `NEXT_PUBLIC_OSM_TILE_URL`, and Playwright auth cookie vars.
- Playwright runs the Chrome project only, do not start `pnpm dev`(most of the time it has already been started). Bootstrap authenticated tests from `PLAYWRIGHT_EMAIL` and `PLAYWRIGHT_PASSWORD`.
- When running playwright tests, do not restart the dev server
## Tooling
- `typescript-language-server` is installed globally (`npm install -g typescript-language-server typescript`). When writing or editing TypeScript/TSX, prefer it over grep-based guessing for type info, go-to-definition, find-references, and rename/refactor accuracy — especially across the generated `lib/api/generated.ts` DTOs and the Supabase `lib/supabase/supabase.ts` types, where types drift from source and a plain text search can miss usages. Run it over stdio (`typescript-language-server --stdio`) if your environment can speak LSP directly.

## Adjacent Repos And Generated Files
- If you change SQL or RPC expectations, inspect `../hikyaku-api/infra/db/schema.sql`, `../hikyaku-api/infra/db/roles.sql`, and `../hikyaku-api/infra/db/seed.sql`; that folder is the canonical database bootstrap order. The schema is Supabase-owned — the API connects with TypeORM but does not manage it (`synchronize` is off and migrations do not run on boot).
- Keep `lib/supabase/supabase.ts` aligned with schema/RPC changes; it is the generated Database type layer consumed throughout the app.
- If you need deeper framework guidance after reading this file, the repo vendors it under `.agents/skills/*` for React performance, composition, and Supabase/Postgres topics.