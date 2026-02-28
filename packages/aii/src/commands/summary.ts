import { loadSchemas, buildVaultIndex, VaultGraph } from "@zodsidian/core";
import { walkMarkdownFiles } from "../utils/walk.js";
import { EXIT_RUNTIME_ERROR } from "../utils/exit-codes.js";

export async function summaryCommand(dir: string): Promise<void> {
  try {
    loadSchemas();
    const files = await walkMarkdownFiles(dir);
    const index = buildVaultIndex(files);
    const graph = new VaultGraph(index);

    const nodes = graph.nodes();
    const typeDistribution: Record<string, number> = {};
    for (const node of nodes) {
      const key = node.type ?? "untyped";
      typeDistribution[key] = (typeDistribution[key] ?? 0) + 1;
    }

    const brokenRefs = index.edges
      .filter((e) => !index.idIndex.has(e.targetId))
      .map((e) => ({ sourceFile: e.sourceFile, targetId: e.targetId, field: e.field }));

    console.log(
      JSON.stringify({
        totalNodes: nodes.length,
        validNodes: index.stats.validFiles,
        totalEdges: index.edges.length,
        brokenRefs,
        typeDistribution,
      }),
    );
  } catch (err) {
    console.error(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
    );
    process.exit(EXIT_RUNTIME_ERROR);
  }
}
