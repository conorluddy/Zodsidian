import { loadSchemas, buildVaultIndex, buildSummary } from "@zodsidian/core";
import { walkMarkdownFiles } from "../utils/walk.js";
import { EXIT_RUNTIME_ERROR } from "../utils/exit-codes.js";

export async function reportCommand(dir: string): Promise<void> {
  try {
    loadSchemas();
    const files = await walkMarkdownFiles(dir);
    const index = buildVaultIndex(files);
    console.log(buildSummary(index.stats));
  } catch (err) {
    console.error(`Report failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(EXIT_RUNTIME_ERROR);
  }
}
