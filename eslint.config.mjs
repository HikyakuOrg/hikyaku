import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // eslint-plugin-react@7.x calls context.getFilename() when version is "detect",
  // which was removed in ESLint 9+. Pin the version to skip that code path.
  { settings: { react: { version: '19' } } },
  // Treat a leading underscore as "deliberately unused". Needed for bindings we
  // cannot drop: fixed callback signatures (Playwright's globalSetup, calendar
  // event getters) and the `const { [key]: _, ...rest }` omit idiom.
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        args: "after-used",
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrors: "all",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
        ignoreRestSiblings: true,
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
