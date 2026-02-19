export interface FileNode {
  filePath: string;
  type: string | null;
  id: string | null;
  title: string | null;
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  /** Parsed frontmatter data. Present for typed files (has a `type` field), undefined for plain notes. */
  frontmatter?: Record<string, unknown>;
}

export interface ReferenceEdge {
  sourceFile: string;
  targetId: string;
  field: string;
}

export interface VaultIndex {
  files: Map<string, FileNode>;
  idIndex: Map<string, string>;
  edges: ReferenceEdge[];
  stats: VaultStats;
}

export interface VaultStats {
  totalFiles: number;
  validFiles: number;
  errorCount: number;
  warningCount: number;
}
