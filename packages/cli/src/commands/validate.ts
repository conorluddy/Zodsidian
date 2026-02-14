import {
  loadSchemas,
  parseFrontmatter,
  validateFrontmatter,
  buildVaultIndex,
  validateVault,
} from "@zodsidian/core";
import { walkMarkdownFiles } from "../utils/walk.js";
import { printIssue, printSummary } from "../output/console-formatter.js";
import { EXIT_SUCCESS, EXIT_VALIDATION_ERROR } from "../utils/exit-codes.js";

export async function validateCommand(dir: string): Promise<void> {
  loadSchemas();
  const files = await walkMarkdownFiles(dir);
  const index = buildVaultIndex(files);
  const vaultResult = validateVault(index);

  let hasErrors = index.stats.errorCount > 0;

  for (const [filePath, node] of index.files) {
    if (!node.isValid) {
      const parsed = parseFrontmatter(
        files.find((f) => f.filePath === filePath)!.content,
      );
      const issues = parsed.data
        ? [...parsed.issues, ...validateFrontmatter(parsed.data as Record<string, unknown>)]
        : parsed.issues;
      for (const issue of issues) {
        printIssue(filePath, issue);
      }
    }
  }

  for (const [filePath, issues] of vaultResult.issues) {
    for (const issue of issues) {
      printIssue(filePath, issue);
      if (issue.severity === "error") hasErrors = true;
    }
  }

  printSummary(index.stats);
  process.exit(hasErrors ? EXIT_VALIDATION_ERROR : EXIT_SUCCESS);
}
