// Ambient global: this file has no top-level imports/exports, so `Customer` is
// available project-wide without an import. The inline `import(...)` type below
// pulls in the generated DTO without turning this file into a module, so the
// shape now tracks the OpenAPI spec instead of being maintained by hand.
// ESLint cannot see those cross-file uses.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Customer = import("@/lib/api").CustomerDto
