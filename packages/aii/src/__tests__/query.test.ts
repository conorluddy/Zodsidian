import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { queryCommand } from "../commands/query.js";

const FIXTURES = new URL("../../../../tests/fixtures/vault", import.meta.url).pathname;

describe("aii query", () => {
  let output: unknown;

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation((msg: string) => {
      output = JSON.parse(msg);
    });
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns all nodes with frontmatter included", async () => {
    await queryCommand(FIXTURES, {});
    const nodes = output as Array<{ frontmatter?: Record<string, unknown> }>;
    const typedNodes = nodes.filter((n) => n.frontmatter !== undefined);
    expect(typedNodes.length).toBeGreaterThan(0);
    expect(typedNodes[0].frontmatter).toHaveProperty("type");
  });

  it("filters by type", async () => {
    await queryCommand(FIXTURES, { type: "project" });
    const nodes = output as Array<{ type: string }>;
    expect(nodes.every((n) => n.type === "project")).toBe(true);
  });

  it("returns a single node with --id", async () => {
    await queryCommand(FIXTURES, { id: "proj-1" });
    const result = output as {
      node: { id: string };
      incoming: unknown[];
      outgoing: unknown[];
    };
    expect(result.node.id).toBe("proj-1");
    expect(Array.isArray(result.incoming)).toBe(true);
    expect(Array.isArray(result.outgoing)).toBe(true);
  });

  it("includes frontmatter on single-node lookup", async () => {
    await queryCommand(FIXTURES, { id: "proj-1" });
    const result = output as { node: { frontmatter?: Record<string, unknown> } };
    expect(result.node.frontmatter).toBeDefined();
    expect(result.node.frontmatter?.id).toBe("proj-1");
  });

  it("--depth returns subgraph shape instead of node+refs", async () => {
    await queryCommand(FIXTURES, { id: "proj-1", depth: 1 });
    const result = output as {
      root: string;
      depth: number;
      nodes: unknown[];
      edges: unknown[];
    };
    expect(result.root).toBe("proj-1");
    expect(result.depth).toBe(1);
    expect(Array.isArray(result.nodes)).toBe(true);
    expect(Array.isArray(result.edges)).toBe(true);
  });

  it("--depth subgraph includes the root node", async () => {
    await queryCommand(FIXTURES, { id: "proj-1", depth: 1 });
    const result = output as { nodes: Array<{ id: string | null }> };
    expect(result.nodes.some((n) => n.id === "proj-1")).toBe(true);
  });

  it("--depth 2 includes nodes reachable in 2 hops", async () => {
    await queryCommand(FIXTURES, { id: "proj-1", depth: 2 });
    const result = output as { nodes: Array<{ id: string | null }>; depth: number };
    expect(result.depth).toBe(2);
    expect(result.nodes.length).toBeGreaterThanOrEqual(1);
  });

  it("--depth 0 returns only the root node", async () => {
    await queryCommand(FIXTURES, { id: "proj-1", depth: 0 });
    const result = output as { nodes: Array<{ id: string | null }> };
    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0].id).toBe("proj-1");
  });

  it("omitting --depth preserves existing node+refs output (no breaking change)", async () => {
    await queryCommand(FIXTURES, { id: "proj-1" });
    const result = output as Record<string, unknown>;
    expect(result).toHaveProperty("node");
    expect(result).toHaveProperty("incoming");
    expect(result).toHaveProperty("outgoing");
    expect(result).not.toHaveProperty("root");
  });
});
