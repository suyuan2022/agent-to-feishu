import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { cli: "src/cli.ts" },
    format: ["esm"],
    target: "node20",
    clean: true,
    dts: false,
    sourcemap: false,
    banner: { js: "#!/usr/bin/env node" },
  },
  {
    entry: {
      index: "src/index.ts",
      mcp: "src/mcp.ts",
    },
    format: ["esm"],
    target: "node20",
    splitting: true,
    dts: false,
    sourcemap: false,
  },
]);
