import esbuild from "esbuild";

esbuild
  .build({
    entryPoints: ["src/main.ts"],
    bundle: true,
    external: ["obsidian"],
    format: "cjs",
    target: "es2022",
    outfile: "main.js",
    platform: "node",
    sourcemap: "inline",
  })
  .catch(() => process.exit(1));
