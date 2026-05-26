import { FlatCompat } from "@eslint/eslintrc";
import { defineConfig, globalIgnores } from "eslint/config";

// Next.js 15 still ships its ESLint config as a legacy `extends`-based
// CommonJS module (`eslint-config-next/core-web-vitals.js`). Our project
// uses the modern ESLint 9 flat-config shape, so we bridge the two via
// `FlatCompat` — this is the pattern Next.js 15 docs recommend.
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = defineConfig([
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
