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
      // Dismissable overlays use a real <button> backdrop (alongside Esc + a
      // focus trap) and every clickable surface is a genuine button, so these
      // rules now pass cleanly and are enforced as errors to keep the
      // interactive surface keyboard-accessible going forward.
      "jsx-a11y/click-events-have-key-events": "error",
      "jsx-a11y/no-static-element-interactions": "error",
      "jsx-a11y/no-noninteractive-element-interactions": "error",
      // The kit's Input/Select are valid form controls, so wrapping them in a
      // <label>/<Field> is a correct (implicit) association.
      "jsx-a11y/label-has-associated-control": ["error", { controlComponents: ["Input", "Select"] }],
    },
  },
  prettier,
);
