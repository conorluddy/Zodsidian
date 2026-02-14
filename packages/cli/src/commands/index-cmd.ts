import { writeFile } from "node:fs/promises";
import { loadSchemas, buildVaultIndex } from "@zodsidian/core";
import { walkMarkdownFiles } from "../utils/walk.js";
import { printJson } from "../output/console-formatter.js";

interface IndexCommandOptions {
  out?: string;
}

function serializeIndex(index: ReturnType<typeof buildVaultIndex>) {
  return {
    files: [...index.files.values()],
    idIndex: Object.fromEntries(index.idIndex),
    edges: index.edges,
    stats: index.stats,
  };
}

export async function indexCommand(
  dir: string,
  options: IndexCommandOptions,
): Promise<void> {
  loadSchemas();
  const files = await walkMarkdownFiles(dir);
  const index = buildVaultIndex(files);
  const serialized = serializeIndex(index);

  if (options.out) {
    await writeFile(options.out, JSON.stringify(serialized, null, 2), "utf-8");
    console.log(`Index written to ${options.out}`);
  } else {
    printJson(serialized);
  }
}
