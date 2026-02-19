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
});
