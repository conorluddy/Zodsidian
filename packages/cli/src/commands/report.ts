import { loadSchemas, buildVaultIndex, buildSummary } from "@zodsidian/core";
import { walkMarkdownFiles, filterByType } from "../utils/walk.js";
import { loadConfigForVault } from "../utils/config-loader.js";
import { EXIT_RUNTIME_ERROR } from "../utils/exit-codes.js";

interface ReportCommandOptions {
  type?: string;
  config?: string;
}

export async function reportCommand(
  dir: string,
  options: ReportCommandOptions,
): Promise<void> {
  try {
    loadSchemas();
    const config = await loadConfigForVault(dir, options.config);
    let files = await walkMarkdownFiles(dir);
    if (options.type) {
      files = filterByType(files, options.type);
    }
    const index = buildVaultIndex(files, config);
    console.log(buildSummary(index.stats));
  } catch (err) {
    console.error(`Report failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(EXIT_RUNTIME_ERROR);
  }
}
