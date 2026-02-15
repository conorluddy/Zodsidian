import type { FileNode, ReferenceEdge, VaultIndex } from "../types/index.js";

export class VaultGraph {
  private readonly index: VaultIndex;
  private readonly reverseEdges: Map<string, ReferenceEdge[]>;

  constructor(index: VaultIndex) {
    this.index = index;
    this.reverseEdges = new Map();

    for (const edge of index.edges) {
      const existing = this.reverseEdges.get(edge.targetId) ?? [];
      existing.push(edge);
      this.reverseEdges.set(edge.targetId, existing);
    }
  }

  nodes(): FileNode[] {
    return [...this.index.files.values()];
  }

  nodesByType(type: string): FileNode[] {
    return this.nodes().filter((n) => n.type === type);
  }

  nodeById(id: string): FileNode | undefined {
    const filePath = this.index.idIndex.get(id);
    if (!filePath) return undefined;
    return this.index.files.get(filePath);
  }

  referencesFrom(filePath: string): ReferenceEdge[] {
    return this.index.edges.filter((e) => e.sourceFile === filePath);
  }

  referencesTo(id: string): ReferenceEdge[] {
    return this.reverseEdges.get(id) ?? [];
  }
}
