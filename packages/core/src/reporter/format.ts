import type { ValidationIssue, VaultStats } from "../types/index.js";

export function formatIssue(filePath: string, issue: ValidationIssue): string {
  const prefix = issue.severity === "error" ? "ERROR" : "WARN";
  const path = issue.path ? ` (${issue.path.join(".")})` : "";
  const suggestion = issue.suggestion ? `\n  → ${issue.suggestion}` : "";
  return `[${prefix}] ${filePath}${path}: ${issue.message}${suggestion}`;
}

export function buildSummary(stats: VaultStats): string {
  const lines = [
    `Files scanned: ${stats.totalFiles}`,
    `Valid: ${stats.validFiles}`,
    `Errors: ${stats.errorCount}`,
    `Warnings: ${stats.warningCount}`,
  ];
  return lines.join("\n");
}
