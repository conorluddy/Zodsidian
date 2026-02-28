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

    const staleDrafts = { lt7d: 0, "7to30d": 0, "30to90d": 0, gt90d: 0 };
    const nowMs = Date.now();
    for (const node of nodes) {
      if ((node.frontmatter?.status as string | undefined) !== "draft") continue;
      const created = node.frontmatter?.created as string | undefined;
      if (!created) continue;
      const ageMs = nowMs - new Date(created).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays < 7) staleDrafts.lt7d++;
      else if (ageDays < 30) staleDrafts["7to30d"]++;
      else if (ageDays < 90) staleDrafts["30to90d"]++;
      else staleDrafts.gt90d++;
    }

    console.log(
      JSON.stringify({
        totalNodes: nodes.length,
        validNodes: index.stats.validFiles,
        totalEdges: index.edges.length,
        brokenRefs,
        typeDistribution,
        staleDrafts,
      }),
    );
  } catch (err) {
    console.error(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
    );
    process.exit(EXIT_RUNTIME_ERROR);
  }
}
