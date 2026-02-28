import {
  loadSchemas,
  parseFrontmatter,
  validateFrontmatter,
  buildVaultIndex,
  validateVault,
  IssueCode,
} from "@zodsidian/core";
import { walkMarkdownFiles, filterByType } from "../utils/walk.js";
import { loadConfigForVault } from "../utils/config-loader.js";
import { printIssue, printSummary } from "../output/console-formatter.js";
import {
  EXIT_SUCCESS,
  EXIT_VALIDATION_ERROR,
  EXIT_RUNTIME_ERROR,
} from "../utils/exit-codes.js";

interface ValidateCommandOptions {
  type?: string;
  config?: string;
}

export async function validateCommand(
  dir: string,
  options: ValidateCommandOptions,
): Promise<void> {
  try {
    loadSchemas();
    const config = await loadConfigForVault(dir, options.config);
    let files = await walkMarkdownFiles(dir, config.excludeGlobs);
    if (options.type) {
      files = filterByType(files, options.type);
    }
    const contentByPath = new Map(files.map((f) => [f.filePath, f.content]));
    const index = buildVaultIndex(files, config);
    const vaultResult = validateVault(index);

    let hasErrors = index.stats.errorCount > 0;

    for (const [filePath, node] of index.files) {
      if (!node.isValid) {
        const content = contentByPath.get(filePath);
        if (content === undefined) continue;
        if (content === "") {
          printIssue(filePath, {
            severity: "error",
            code: IssueCode.FM_MISSING,
            message: "No frontmatter found",
          });
          continue;
        }
        const parsed = parseFrontmatter(content);
        const issues = parsed.data
          ? [
              ...parsed.issues,
              ...validateFrontmatter(parsed.data as Record<string, unknown>, config),
            ]
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
  } catch (err) {
    console.error(
      `Validation failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(EXIT_RUNTIME_ERROR);
  }
}
