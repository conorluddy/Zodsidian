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
    await searchCommand(FIXTURES, { q: "proj" });
    expect(Array.isArray(output)).toBe(true);
  });

  it("matches on id field", async () => {
    await searchCommand(FIXTURES, { q: "proj-1" });
    const nodes = output as Array<{ id: string | null }>;
    expect(nodes.some((n) => n.id === "proj-1")).toBe(true);
  });

  it("excludes non-matching nodes", async () => {
    await searchCommand(FIXTURES, { q: "zzz-no-match-xyz" });
    expect((output as unknown[]).length).toBe(0);
  });

  it("is case-insensitive", async () => {
    await searchCommand(FIXTURES, { q: "PROJ" });
    const lower = (output as Array<{ id: string | null }>).map((n) => n.id);
    await searchCommand(FIXTURES, { q: "proj" });
    const lower2 = (output as Array<{ id: string | null }>).map((n) => n.id);
    expect(lower).toEqual(lower2);
  });

  it("--type filter narrows results to that type only", async () => {
    await searchCommand(FIXTURES, { q: "proj", type: "project" });
    const nodes = output as Array<{ type: string | null }>;
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.every((n) => n.type === "project")).toBe(true);
  });
});
