import { loadSchemas, buildVaultIndex, buildSummary } from "@zodsidian/core";
import { walkMarkdownFiles } from "../utils/walk.js";

export async function reportCommand(dir: string): Promise<void> {
  loadSchemas();
  const files = await walkMarkdownFiles(dir);
  const index = buildVaultIndex(files);
  console.log(buildSummary(index.stats));
}
