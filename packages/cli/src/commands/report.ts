import { loadSchemas, buildVaultIndex, buildSummary } from "@zodsidian/core";
import { walkMarkdownFiles, filterByType } from "../utils/walk.js";
import { EXIT_RUNTIME_ERROR } from "../utils/exit-codes.js";

interface ReportCommandOptions {
  type?: string;
}

export async function reportCommand(
  dir: string,
  options: ReportCommandOptions,
): Promise<void> {
  try {
    loadSchemas();
    let files = await walkMarkdownFiles(dir);
    if (options.type) {
      files = filterByType(files, options.type);
    }
    const index = buildVaultIndex(files);
    console.log(buildSummary(index.stats));
  } catch (err) {
    console.error(`Report failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(EXIT_RUNTIME_ERROR);
  }
}
