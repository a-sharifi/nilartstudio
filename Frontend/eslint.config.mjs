import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
export default defineConfig([
  ...tseslint.configs.recommended,
  // Imported design is reviewed through type/build/visual checks; do not rewrite
  // its markup to satisfy framework-specific style opinions during fidelity import.
  globalIgnores(["src/design/**", ".next/**", ".next-demo/**", "test-results/**", "playwright-report/**"]),
]);
