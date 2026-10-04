import tsparser from "@typescript-eslint/parser";
import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

// Mirrors the rule set the Obsidian plugin review bot runs, so submission
// feedback shows up here first. Run with `npm run lint`.
export default defineConfig([
  // Build output plus Node-side build/release scripts: never bundled into the
  // plugin, so the plugin-runtime rules (no-console and friends) don't apply.
  // design-preview/ holds the UI review harness, including a copy of Obsidian's
  // own minified renderer bundle, which is third-party input rather than source.
  // .qoder-credits/ is tool scratch that reappears between sessions.
  globalIgnores([
    "main.js",
    "node_modules/",
    "esbuild.config.mjs",
    "version-bump.mjs",
    "eslint.config.mjs",
    "design-preview/",
    ".qoder-credits/",
  ]),
  ...obsidianmd.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
    },
  },
]);
