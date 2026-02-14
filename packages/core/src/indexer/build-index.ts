import type {
  FileNode,
  ReferenceEdge,
  VaultIndex,
  ValidationIssue,
} from "../types/index.js";
import { parseFrontmatter } from "../parser/index.js";
import { validateFrontmatter } from "../validator/index.js";

const REFERENCE_FIELDS = ["projectId"];

interface FileEntry {
  filePath: string;
  content: string;
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

      for (const field of REFERENCE_FIELDS) {
        if (typeof data[field] === "string") {
          edges.push({ sourceFile: filePath, targetId: data[field], field });
        }
      }

      const id = typeof data.id === "string" ? data.id : null;
      if (id) {
        idIndex.set(id, filePath);
      }

      const errors = allIssues.filter((i) => i.severity === "error").length;
      const warnings = allIssues.filter((i) => i.severity === "warning").length;
      totalErrors += errors;
      totalWarnings += warnings;
      const isValid = errors === 0;
      if (isValid) validFiles++;

      fileNodes.set(filePath, {
        filePath,
        type: typeof data.type === "string" ? data.type : null,
        id,
        title: typeof data.title === "string" ? data.title : null,
        isValid,
        errorCount: errors,
        warningCount: warnings,
      });
    } else {
      const errors = allIssues.filter((i) => i.severity === "error").length;
      const warnings = allIssues.filter((i) => i.severity === "warning").length;
      totalErrors += errors;
      totalWarnings += warnings;

      fileNodes.set(filePath, {
        filePath,
        type: null,
        id: null,
        title: null,
        isValid: false,
        errorCount: errors,
        warningCount: warnings,
      });
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
