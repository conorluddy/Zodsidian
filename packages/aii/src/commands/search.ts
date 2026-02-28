import { loadSchemas, buildVaultIndex, VaultGraph } from "@zodsidian/core";
import { walkMarkdownFiles, filterByType } from "../utils/walk.js";
import { EXIT_RUNTIME_ERROR } from "../utils/exit-codes.js";

interface SearchCommandOptions {
  query: string;
  type?: string;
  limit?: number;
}

function nodeMatchesQuery(
  node: ReturnType<VaultGraph["nodes"]>[number],
  q: string,
): boolean {
  const lq = q.toLowerCase();
  if (node.id?.toLowerCase().includes(lq)) return true;
  if (node.title?.toLowerCase().includes(lq)) return true;
  if (node.type?.toLowerCase().includes(lq)) return true;
  if ((node.frontmatter?.status as string | undefined)?.toLowerCase().includes(lq))
    return true;
  if (
    (node.frontmatter?.tags as string[] | undefined)?.join(" ").toLowerCase().includes(lq)
  )
    return true;
  return false;
}

export async function searchCommand(
  dir: string,
  options: SearchCommandOptions,
): Promise<void> {
  try {
    loadSchemas();
    const files = options.type
      ? filterByType(await walkMarkdownFiles(dir), options.type)
      : await walkMarkdownFiles(dir);
    const index = buildVaultIndex(files);
    const graph = new VaultGraph(index);

    const matched = graph.nodes().filter((node) => nodeMatchesQuery(node, options.query));
    const results =
      options.limit !== undefined ? matched.slice(0, options.limit) : matched;
    console.log(JSON.stringify(results));
  } catch (err) {
    console.error(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
    );
    process.exit(EXIT_RUNTIME_ERROR);
  }
}
