import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { searchCommand } from "../commands/search.js";

const FIXTURES = new URL("../../../../tests/fixtures/vault", import.meta.url).pathname;

describe("aii search", () => {
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

  it("returns an array of matching nodes", async () => {
    await searchCommand(FIXTURES, { query: "proj" });
    expect(Array.isArray(output)).toBe(true);
  });

  it("matches on id field", async () => {
    await searchCommand(FIXTURES, { query: "proj-1" });
    const nodes = output as Array<{ id: string | null }>;
    expect(nodes.some((n) => n.id === "proj-1")).toBe(true);
  });

  it("excludes non-matching nodes", async () => {
    await searchCommand(FIXTURES, { query: "zzz-no-match-xyz" });
    expect((output as unknown[]).length).toBe(0);
  });

  it("is case-insensitive", async () => {
    await searchCommand(FIXTURES, { query: "PROJ" });
    const lower = (output as Array<{ id: string | null }>).map((n) => n.id);
    await searchCommand(FIXTURES, { query: "proj" });
    const lower2 = (output as Array<{ id: string | null }>).map((n) => n.id);
    expect(lower).toEqual(lower2);
  });

  it("--type filter narrows results to that type only", async () => {
    await searchCommand(FIXTURES, { query: "proj", type: "project" });
    const nodes = output as Array<{ type: string | null }>;
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.every((n) => n.type === "project")).toBe(true);
  });

  it("--limit caps the number of results returned", async () => {
    await searchCommand(FIXTURES, { query: "proj", limit: 1 });
    expect((output as unknown[]).length).toBe(1);
  });

  it("results include created and updated fields", async () => {
    await searchCommand(FIXTURES, { query: "plan-1" });
    const nodes = output as Array<{
      id: string | null;
      created: string | null;
      updated: string | null;
    }>;
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes[0]).toHaveProperty("created");
    expect(nodes[0]).toHaveProperty("updated");
    // plan-1 fixture has known dates
    expect(nodes[0].created).toBe("2026-02-15");
    expect(nodes[0].updated).toBe("2026-02-15");
  });

  it("--limit larger than result set returns all matches", async () => {
    await searchCommand(FIXTURES, { query: "proj" });
    const total = (output as unknown[]).length;
    await searchCommand(FIXTURES, { query: "proj", limit: total + 100 });
    expect((output as unknown[]).length).toBe(total);
  });
});
