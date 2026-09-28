// Ambient global: no imports or exports, so `Customer` works without an import.
// The inline import() aliases the generated DTO. ESLint cannot see the uses.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Customer = import("@/lib/api").CustomerDto
