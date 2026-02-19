import {
  loadSchemas,
  parseFrontmatter,
  validateFrontmatter,
  buildVaultIndex,
} from "@zodsidian/core";
import { walkMarkdownFiles, filterByType } from "../utils/walk.js";
import { loadConfigForVault } from "../utils/config-loader.js";
import {
  EXIT_SUCCESS,
  EXIT_VALIDATION_ERROR,
  EXIT_RUNTIME_ERROR,
} from "../utils/exit-codes.js";

interface ValidateCommandOptions {
  type?: string;
  config?: string;
}

interface IssueEntry {
  filePath: string;
  severity: string;
  code: string;
  message: string;
  path?: string[];
  suggestion: string | null;
}

export async function validateCommand(
  dir: string,
  options: ValidateCommandOptions,
): Promise<void> {
  try {
    loadSchemas();
    const config = await loadConfigForVault(dir, options.config);
    let files = await walkMarkdownFiles(dir);
    if (options.type) {
      files = filterByType(files, options.type);
    }

    const index = buildVaultIndex(files, config);
    const contentByPath = new Map(files.map((f) => [f.filePath, f.content]));
    const issues: IssueEntry[] = [];

    for (const [filePath] of index.files) {
      const content = contentByPath.get(filePath);
      if (!content) continue;
      const parsed = parseFrontmatter(content);
      const fileIssues = parsed.data
        ? [
            ...parsed.issues,
            ...validateFrontmatter(parsed.data as Record<string, unknown>, config),
          ]
        : parsed.issues;
      for (const issue of fileIssues) {
        issues.push({
          filePath,
          severity: issue.severity,
          code: issue.code,
          message: issue.message,
          path: issue.path,
          suggestion: issue.suggestion ?? null,
        });
      }
    }

    const hasErrors = issues.some((i) => i.severity === "error");
    console.log(
      JSON.stringify({
        stats: index.stats,
        issues,
        isValid: !hasErrors,
      }),
    );
    process.exit(hasErrors ? EXIT_VALIDATION_ERROR : EXIT_SUCCESS);
  } catch (err) {
    console.error(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
    );
    process.exit(EXIT_RUNTIME_ERROR);
  }
}
