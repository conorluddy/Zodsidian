import type {
  FileNode,
  ReferenceEdge,
  VaultIndex,
  ValidationIssue,
} from "../types/index.js";
import { parseFrontmatter } from "../parser/index.js";
import { validateFrontmatter } from "../validator/index.js";
import { getSchemaEntry } from "../schema/index.js";

interface FileEntry {
  filePath: string;
  content: string;
}

function createFileNode(
  filePath: string,
  issues: ValidationIssue[],
  data?: Record<string, unknown>,
): FileNode {
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  return {
    filePath,
    type: data && typeof data.type === "string" ? data.type : null,
    id: data && typeof data.id === "string" ? data.id : null,
    title: data && typeof data.title === "string" ? data.title : null,
    isValid: errors === 0,
    errorCount: errors,
    warningCount: warnings,
  };
}

export function buildVaultIndex(files: FileEntry[]): VaultIndex {
  const fileNodes = new Map<string, FileNode>();
  const idIndex = new Map<string, string>();
  const edges: ReferenceEdge[] = [];
  let totalErrors = 0;
  let totalWarnings = 0;
  let validFiles = 0;

  for (const { filePath, content } of files) {
    const parsed = parseFrontmatter(content);
    let allIssues: ValidationIssue[] = [...parsed.issues];

    if (parsed.data && typeof parsed.data === "object") {
      const data = parsed.data as Record<string, unknown>;
      const schemaIssues = validateFrontmatter(data);
      allIssues = [...allIssues, ...schemaIssues];

      const typeName = typeof data.type === "string" ? data.type : null;
      const entry = typeName ? getSchemaEntry(typeName) : undefined;
      const refFields = entry?.referenceFields ?? [];

      for (const field of refFields) {
        if (typeof data[field] === "string") {
          edges.push({ sourceFile: filePath, targetId: data[field], field });
        }
      }

      const id = typeof data.id === "string" ? data.id : null;
      if (id) {
        idIndex.set(id, filePath);
      }

      const node = createFileNode(filePath, allIssues, data);
      totalErrors += node.errorCount;
      totalWarnings += node.warningCount;
      if (node.isValid) validFiles++;
      fileNodes.set(filePath, node);
    } else {
      const node = createFileNode(filePath, allIssues);
      totalErrors += node.errorCount;
      totalWarnings += node.warningCount;
      fileNodes.set(filePath, node);
    }
  }

  return {
    files: fileNodes,
    idIndex,
    edges,
    stats: {
      totalFiles: files.length,
      validFiles,
      errorCount: totalErrors,
      warningCount: totalWarnings,
    },
  };
}
