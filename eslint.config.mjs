// ESLint flat config — deliberately light. The repo's hard gates are
// `pnpm check` (tsc --noEmit, incl. noUnusedLocals/noUnusedParameters) and
// the vitest suite; this config adds what tsc cannot see: React Hooks rules,
// unsafe patterns in non-TS-checked spots, and a second unused-var check.
// Prettier owns formatting (see `prettier --check` in the lint script);
// eslint-config-prettier disables every ESLint rule that would fight it.
//
// `@typescript-eslint/no-explicit-any` is a warning, not an error: 5
// deliberate `any`s remain in non-test code (Login, expenses, vite.config).
// New code should still avoid `any`.
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Generated / vendored / archived — never lint these.
    ignores: [
      "node_modules/**",
      "dist/**",
      "api/index.js",
      "coverage/**",
      ".manus-logs/**",
      "docs/archive/**",
      "drizzle/**",
      "patches/**",
      // Vendored skill assets and static public scripts — not repo source.
      ".agents/**",
      "client/public/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    // Shared language options for all source files.
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Server code logs deliberately (see server/_core/config.ts);
      // client code should not ship stray console calls.
      "no-console": "off",
    },
  },
  {
    // Browser code: React SPA under client/.
    files: ["client/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2020 },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-console": "warn",
    },
  },
  {
    // Node code: server, shared (imported by both sides), scripts, configs.
    files: [
      "server/**/*.{ts,tsx}",
      "shared/**/*.{ts,tsx}",
      "scripts/**/*.{ts,mts,mjs,js}",
      "*.{ts,mts,mjs,js}",
    ],
    languageOptions: {
      globals: { ...globals.node, ...globals.es2020 },
    },
  },
  {
    // Test files: jsdom client tests also touch browser globals; server
    // tests import everything they use from "vitest" explicitly.
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.es2020 },
    },
    rules: {
      // Test fixtures intentionally use `any` for dynamic rows/mocks.
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  }
);
