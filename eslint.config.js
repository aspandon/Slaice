import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier";

// Flat config. Scoped to the migrated TypeScript surface (`.ts`/`.tsx`); legacy
// `.jsx` files are ignored until they are converted, so lint output stays
// focused on code that has opted into the new toolchain.
export default tseslint.config(
  { ignores: ["dist", "node_modules", "**/*.jsx"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      // These three false-positive heavily on intentional, keyboard-accessible
      // patterns in this UI (dialog overlays that close via Esc + a focus trap,
      // clickable cards that usually wrap a real button). Kept as visible
      // warnings rather than CI-blocking errors; the genuinely-important a11y
      // rules (alt text, ARIA props, labels, roles) stay as errors.
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
    },
  },
  prettier,
);
