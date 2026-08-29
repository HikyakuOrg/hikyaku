/**
 * Public entry point for hikyaku-api models: `import { ... } from "@/lib/api"`.
 *
 * - `./generated.ts` is produced by `pnpm gen:api` from the sibling
 *   `../hikyaku-api/openapi.json` checkout (that spec is ahead of what is
 *   deployed) and is overwritten on every run. `pnpm gen:api:remote` reads the
 *   live https://api.hikyaku.org/api-docs-json instead; switch the default back
 *   to it once the spec has shipped.
 * - `./manual.ts` holds the few shapes the spec does not describe.
 *
 * The typed fetch helpers (`./services`, `./routing`, `./payments`) are imported
 * from their own paths and are deliberately not re-exported here, so importing a
 * type never pulls a server-side fetch module into a client bundle.
 */

export * from "./generated"
export * from "./manual"
