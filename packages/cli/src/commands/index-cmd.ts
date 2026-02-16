import { writeFile } from "node:fs/promises";
import { loadSchemas, buildVaultIndex } from "@zodsidian/core";
import { walkMarkdownFiles, filterByType } from "../utils/walk.js";
import { printJson } from "../output/console-formatter.js";
import { EXIT_RUNTIME_ERROR } from "../utils/exit-codes.js";

interface IndexCommandOptions {
  type?: string;
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
  try {
    loadSchemas();
    let files = await walkMarkdownFiles(dir);
    if (options.type) {
      files = filterByType(files, options.type);
    }
    const index = buildVaultIndex(files);
    const serialized = serializeIndex(index);

    if (options.out) {
      await writeFile(options.out, JSON.stringify(serialized, null, 2), "utf-8");
      console.log(`Index written to ${options.out}`);
    } else {
      printJson(serialized);
    }
  } catch (err) {
    console.error(`Index failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(EXIT_RUNTIME_ERROR);
  }
}
