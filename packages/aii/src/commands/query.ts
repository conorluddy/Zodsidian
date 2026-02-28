import {
  loadSchemas,
  buildVaultIndex,
  VaultGraph,
  type FileNode,
  type ReferenceEdge,
  type VaultIndex,
} from "@zodsidian/core";
import { walkMarkdownFiles, filterByType } from "../utils/walk.js";
import { EXIT_RUNTIME_ERROR } from "../utils/exit-codes.js";

interface QueryCommandOptions {
  type?: string;
  id?: string;
  depth?: number;
}

function collectSubgraph(
  rootId: string,
  depth: number,
  graph: VaultGraph,
  index: VaultIndex,
): { nodes: FileNode[]; edges: ReferenceEdge[] } {
  const visited = new Set<string>();
  let frontier: FileNode[] = [];

  const rootNode = graph.nodeById(rootId);
  if (rootNode) {
    frontier.push(rootNode);
    visited.add(rootId);
  }

  for (let hop = 0; hop < depth; hop++) {
    const next: FileNode[] = [];
    for (const node of frontier) {
      if (!node.id) continue;
      for (const edge of graph.referencesFrom(node.filePath)) {
        if (!visited.has(edge.targetId)) {
          const target = graph.nodeById(edge.targetId);
          if (target) {
            visited.add(edge.targetId);
            next.push(target);
          }
        }
      }
      for (const edge of graph.referencesTo(node.id)) {
        const sourceNode = index.files.get(edge.sourceFile);
        if (sourceNode?.id && !visited.has(sourceNode.id)) {
          visited.add(sourceNode.id);
          next.push(sourceNode);
        }
      }
    }
    frontier = next;
  }

  const nodes = [...visited]
    .map((id) => graph.nodeById(id))
    .filter(Boolean) as FileNode[];

  const edges = index.edges.filter((e) => {
    const sourceNode = index.files.get(e.sourceFile);
    return sourceNode?.id && visited.has(sourceNode.id) && visited.has(e.targetId);
  });

  return { nodes, edges };
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
        return;
      }

      if (options.depth !== undefined) {
        const subgraph = collectSubgraph(options.id, options.depth, graph, index);
        console.log(
          JSON.stringify({ root: options.id, depth: options.depth, ...subgraph }),
        );
      } else {
        const incoming = graph.referencesTo(options.id);
        const outgoing = graph.referencesFrom(node.filePath);
        console.log(JSON.stringify({ node, incoming, outgoing }));
      }
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
