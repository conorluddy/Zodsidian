import { IssueCode } from "../types/index.js";
import type { ValidationIssue, VaultIndex } from "../types/index.js";

export interface VaultValidationResult {
  issues: Map<string, ValidationIssue[]>;
}

export function validateVault(index: VaultIndex): VaultValidationResult {
  const issues = new Map<string, ValidationIssue[]>();

  const idOwners = new Map<string, string[]>();
  for (const [filePath, node] of index.files) {
    if (node.id) {
      const owners = idOwners.get(node.id) ?? [];
      owners.push(filePath);
      idOwners.set(node.id, owners);
    }
  }

  for (const [id, owners] of idOwners) {
    if (owners.length > 1) {
      for (const filePath of owners) {
        const fileIssues = issues.get(filePath) ?? [];
        fileIssues.push({
          severity: "error",
          code: IssueCode.VAULT_DUPLICATE_ID,
          message: `Duplicate id "${id}" also found in: ${owners.filter((f) => f !== filePath).join(", ")}`,
        });
        issues.set(filePath, fileIssues);
      }
    }
  }

  for (const edge of index.edges) {
    if (!index.idIndex.has(edge.targetId)) {
      const fileIssues = issues.get(edge.sourceFile) ?? [];
      fileIssues.push({
        severity: "error",
        code: IssueCode.VAULT_MISSING_REFERENCE,
        message: `Reference to unknown id "${edge.targetId}" in field "${edge.field}"`,
        path: [edge.field],
      });
      issues.set(edge.sourceFile, fileIssues);
    }
  }

  return { issues };
}
