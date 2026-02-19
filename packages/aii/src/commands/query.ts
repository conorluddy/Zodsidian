import { loadSchemas, buildVaultIndex, VaultGraph } from "@zodsidian/core";
import { walkMarkdownFiles, filterByType } from "../utils/walk.js";
import { EXIT_RUNTIME_ERROR } from "../utils/exit-codes.js";

interface QueryCommandOptions {
  type?: string;
  id?: string;
}

export async function queryCommand(
  dir: string,
  options: QueryCommandOptions,
): Promise<void> {
  try {
    loadSchemas();
    const files = await walkMarkdownFiles(dir);
    const index = buildVaultIndex(files);
    const graph = new VaultGraph(index);

    if (options.id) {
      const node = graph.nodeById(options.id);
      if (!node) {
        console.error(JSON.stringify({ error: `No node found with id: ${options.id}` }));
        process.exit(EXIT_RUNTIME_ERROR);
      }
      const incoming = graph.referencesTo(options.id);
      const outgoing = graph.referencesFrom(node.filePath);
      console.log(JSON.stringify({ node, incoming, outgoing }));
    } else if (options.type) {
      console.log(JSON.stringify(graph.nodesByType(options.type)));
    } else {
      console.log(JSON.stringify(graph.nodes()));
    }
  } catch (err) {
    console.error(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
    );
    process.exit(EXIT_RUNTIME_ERROR);
  }
}
