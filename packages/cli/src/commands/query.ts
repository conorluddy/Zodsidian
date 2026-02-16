import { loadSchemas, buildVaultIndex, VaultGraph } from "@zodsidian/core";
import { walkMarkdownFiles } from "../utils/walk.js";
import { printJson } from "../output/console-formatter.js";
import { EXIT_RUNTIME_ERROR } from "../utils/exit-codes.js";

interface QueryCommandOptions {
  type?: string;
  id?: string;
  refs?: boolean;
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
        console.error(`No node found with id: ${options.id}`);
        process.exit(EXIT_RUNTIME_ERROR);
      }
      if (options.refs) {
        const incoming = graph.referencesTo(options.id);
        const outgoing = graph.referencesFrom(node.filePath);
        printJson({ node, incoming, outgoing });
      } else {
        printJson(node);
      }
    } else if (options.type) {
      const nodes = graph.nodesByType(options.type);
      printJson(nodes);
    } else {
      printJson(graph.nodes());
    }
  } catch (err) {
    console.error(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(EXIT_RUNTIME_ERROR);
  }
}
