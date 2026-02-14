import chalk from "chalk";
import type { ValidationIssue, VaultStats } from "@zodsidian/core";

export function printIssue(filePath: string, issue: ValidationIssue): void {
  const prefix =
    issue.severity === "error"
      ? chalk.red("ERROR")
      : chalk.yellow("WARN");
  const path = issue.path ? chalk.dim(` (${issue.path.join(".")})`) : "";
  console.log(`  ${prefix} ${filePath}${path}: ${issue.message}`);
  if (issue.suggestion) {
    console.log(chalk.dim(`    → ${issue.suggestion}`));
  }
}

export function printSummary(stats: VaultStats): void {
  console.log();
  console.log(chalk.bold("Summary"));
  console.log(`  Files scanned: ${stats.totalFiles}`);
  console.log(`  Valid: ${chalk.green(stats.validFiles)}`);
  console.log(`  Errors: ${chalk.red(stats.errorCount)}`);
  console.log(`  Warnings: ${chalk.yellow(stats.warningCount)}`);
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}
