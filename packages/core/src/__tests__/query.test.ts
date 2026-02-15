import { describe, it, expect, beforeEach } from "vitest";
import { VaultGraph } from "../query/index.js";
import { buildVaultIndex } from "../indexer/index.js";
import { loadSchemas, clearRegistry } from "../schema/index.js";

function buildTestGraph() {
  const files = [
    {
      filePath: "projects/alpha.md",
      content: `---
type: project
id: proj-alpha
title: Alpha
status: active
---`,
    },
    {
      filePath: "projects/beta.md",
      content: `---
type: project
id: proj-beta
title: Beta
status: paused
---`,
    },
    {
      filePath: "decisions/use-zod.md",
      content: `---
type: decision
id: dec-1
title: Use Zod
projectId: proj-alpha
decisionDate: "2026-01-15"
outcome: Approved
---`,
    },
    {
      filePath: "ideas/dark-mode.md",
      content: `---
type: idea
id: idea-1
title: Dark mode
status: draft
projectId: proj-alpha
---`,
    },
  ];

  const index = buildVaultIndex(files);
  return new VaultGraph(index);
}

describe("VaultGraph", () => {
  beforeEach(() => {
    clearRegistry();
    loadSchemas();
  });

  it("returns all nodes", () => {
    const graph = buildTestGraph();
    expect(graph.nodes()).toHaveLength(4);
  });

  it("filters nodes by type", () => {
    const graph = buildTestGraph();
    expect(graph.nodesByType("project")).toHaveLength(2);
    expect(graph.nodesByType("decision")).toHaveLength(1);
    expect(graph.nodesByType("idea")).toHaveLength(1);
    expect(graph.nodesByType("nonexistent")).toHaveLength(0);
  });

  it("looks up node by id", () => {
    const graph = buildTestGraph();
    const node = graph.nodeById("proj-alpha");
    expect(node).toBeDefined();
    expect(node!.title).toBe("Alpha");
    expect(node!.filePath).toBe("projects/alpha.md");
  });

  it("returns undefined for unknown id", () => {
    const graph = buildTestGraph();
    expect(graph.nodeById("nonexistent")).toBeUndefined();
  });

  it("returns outgoing references from a file", () => {
    const graph = buildTestGraph();
    const refs = graph.referencesFrom("decisions/use-zod.md");
    expect(refs).toHaveLength(1);
    expect(refs[0].targetId).toBe("proj-alpha");
  });

  it("returns incoming references to an id", () => {
    const graph = buildTestGraph();
    const refs = graph.referencesTo("proj-alpha");
    expect(refs).toHaveLength(2);
    expect(refs.map((r) => r.sourceFile).sort()).toEqual([
      "decisions/use-zod.md",
      "ideas/dark-mode.md",
    ]);
  });

  it("returns empty references for unlinked node", () => {
    const graph = buildTestGraph();
    expect(graph.referencesTo("proj-beta")).toHaveLength(0);
    expect(graph.referencesFrom("projects/beta.md")).toHaveLength(0);
  });

  it("handles empty vault", () => {
    const index = buildVaultIndex([]);
    const graph = new VaultGraph(index);
    expect(graph.nodes()).toHaveLength(0);
    expect(graph.nodesByType("project")).toHaveLength(0);
    expect(graph.nodeById("any")).toBeUndefined();
    expect(graph.referencesFrom("any.md")).toHaveLength(0);
    expect(graph.referencesTo("any")).toHaveLength(0);
  });
});
