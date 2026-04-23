# AGENTS.md

## Product Map
- The operational product is the protected dashboard in `app/dashboard`; `/` currently renders the UI showcase in `components/component-example.tsx`, so most feature work belongs in dashboard routes, not the home page.
- `components/ui/sidebar/app-sidebar.tsx` is the fastest map of business domains: Packages, Customers, Driver Shifts, Fleet, Service, and Settings.
- This workspace also has sibling repos: `../schema` for the canonical SQL/bootstrap scripts and `../whendan-docs` for the Docusaurus docs site.

## Auth And Data Flow
- Auth is Supabase SSR. `proxy.ts` calls `lib/middleware.ts`, which refreshes cookies and redirects anonymous users to `/auth/login`; `app/dashboard/layout.tsx` then re-checks claims with `getSupabaseServerClaims()`.
- In server components/pages, prefer `lib/supabase/server.ts` and `lib/supabase/db-server.ts`; they create a fresh request-scoped client. In client components, use `lib/supabase/client.ts`.
- There are older Supabase helpers at `lib/client.ts` and `lib/server.ts` using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; most current code uses `lib/supabase/*` with `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`. Prefer the `lib/supabase/*` path for new work.
- Data access is split by purpose: table CRUD/selects in `lib/supabase/db.ts`, Postgres RPC wrappers in `lib/supabase/supabase-rpc.ts` and `lib/supabase/team-rpc.ts`, storage helpers in `lib/supabase/storage.ts`, and small server actions in `lib/actions/*`.

## Feature Patterns
- Package intake is a client-side `@stepperize/react` flow in `app/dashboard/packages/add/stepper-form.tsx`; state moves through `stepper.metadata`, and `overview-step.tsx` submits the package row, dimensions, delivery window, timeline RPC, and storage uploads together.
- Fleet vehicle forms are client components using React Hook Form + Zod and call the VIN-decoding server action in `lib/actions/vin.ts`; `tests/e2e/fleet-vehicles.spec.ts` is already marked TODO/flaky around this autofill flow.
- Driver-shift detail pages combine Supabase route-step data from `lib/supabase/db-server.ts:getRouteSteps()` with OpenRouteService geometry from `lib/maps/openrouteservice.ts`, then render MapLibre client maps in `app/dashboard/driver-shifts/[id]/route-map.tsx`.
- Live driver tracking uses Supabase realtime channels through `subscribeToDriverLocationUpdates()` in `lib/supabase/db.ts` and `hooks/useDriverLocationUpdates.ts`.
- Storage bucket usage is feature-specific and not fully uniform: packages use `packages`, vehicle images use `vehicles`, and avatar code references both `avatars` and `avatar`; verify the bucket name before changing upload paths.
- Team settings are not fully wired end to end: `app/dashboard/settings/team/team-member-dialog.tsx` calls `addTeamMember`, but `lib/supabase/team-rpc.ts` still has the RPC implementation commented out.

## UI Conventions
- Default to server components for pages/layouts, then drop to `"use client"` for forms, tables, maps, and browser-auth flows. Example: `app/dashboard/page.tsx` is server-rendered while `app/dashboard/fleet/vehicles/components/vehicle-form.tsx` owns client-side form state.
- Lists usually layer `components/data-table.tsx` over `components/table-layout.tsx`; row click navigation comes from an `actions(row)` callback, and bulk selection only appears when `rowSelection` props are passed.
- UI primitives live in `components/ui` using the shadcn `base-vega` setup from `components.json`; imports use the `@/*` alias from `tsconfig.json`.
- Some dynamic pages already follow the Next 16 async-params pattern, for example `app/dashboard/driver-shifts/[id]/page.tsx` receives `params: Promise<{ id: string }>`.

## Commands And Environment
- Main app commands are `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test:e2e`, `pnpm test:e2e:headed`, and `pnpm test:e2e:ui`.
- There is no root `pnpm test` script even though some nested README snippets mention it; the checked-in automated coverage here is Playwright.
- `.env.example` documents the main runtime keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`, `NEXT_PUBLIC_ORS_SERVER`, `NEXT_PUBLIC_OSM_TILE_URL`, and Playwright auth cookie vars.
- `lib/maps/snap-to-roads.ts` also expects `NEXT_PUBLIC_MAP_KEY`, but that key is not listed in `.env.example`.
- Playwright runs the Chrome project only, starts `pnpm dev` itself, and can bootstrap authenticated tests from `PLAYWRIGHT_SB_AUTH_COOKIE` plus the optional `PLAYWRIGHT_SB_AUTH_COOKIE_NAME`.
- `app/dashboard/settings/mobile/page.tsx` is `force-dynamic` because it builds a QR payload from live Supabase env values for the mobile app handshake.

## Adjacent Repos And Generated Files
- If you change SQL or RPC expectations, inspect `../schema/schema.sql`, `../schema/roles.sql`, and `../schema/default_data.sql`; that folder is the canonical database bootstrap order.
- Keep `lib/supabase/supabase.ts` aligned with schema/RPC changes; it is the generated Database type layer consumed throughout the app.
- `lib/api.ts` is generated by swagger-typescript-api, so regenerate it instead of hand-editing unless you are making a tiny emergency fix.
- If you need deeper framework guidance after reading this file, the repo vendors it under `.agents/skills/*` for React performance, composition, and Supabase/Postgres topics.