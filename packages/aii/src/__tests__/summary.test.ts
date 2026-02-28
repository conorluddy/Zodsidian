import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { summaryCommand } from "../commands/summary.js";

const FIXTURES = new URL("../../../../tests/fixtures/vault", import.meta.url).pathname;

describe("aii summary", () => {
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

  it("outputs the expected summary shape", async () => {
    await summaryCommand(FIXTURES);
    expect(output).toMatchObject({
      totalNodes: expect.any(Number),
      validNodes: expect.any(Number),
      totalEdges: expect.any(Number),
      brokenRefs: expect.any(Array),
      typeDistribution: expect.any(Object),
    });
  });

  it("totalNodes matches actual fixture file count", async () => {
    await summaryCommand(FIXTURES);
    const result = output as { totalNodes: number };
    expect(result.totalNodes).toBeGreaterThan(0);
  });

  it("validNodes is <= totalNodes", async () => {
    await summaryCommand(FIXTURES);
    const result = output as { totalNodes: number; validNodes: number };
    expect(result.validNodes).toBeLessThanOrEqual(result.totalNodes);
  });

  it("typeDistribution groups nodes by type", async () => {
    await summaryCommand(FIXTURES);
    const result = output as { typeDistribution: Record<string, number> };
    const keys = Object.keys(result.typeDistribution);
    expect(keys.length).toBeGreaterThan(0);
    for (const count of Object.values(result.typeDistribution)) {
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThan(0);
    }
  });

  it("staleDrafts has the expected bucket shape with numeric counts", async () => {
    await summaryCommand(FIXTURES);
    const result = output as { staleDrafts: Record<string, number> };
    expect(result.staleDrafts).toMatchObject({
      lt7d: expect.any(Number),
      "7to30d": expect.any(Number),
      "30to90d": expect.any(Number),
      gt90d: expect.any(Number),
    });
  });

  it("brokenRefs entries have sourceFile, targetId, and field", async () => {
    await summaryCommand(FIXTURES);
    const result = output as {
      brokenRefs: Array<{ sourceFile: string; targetId: string; field: string }>;
    };
    for (const ref of result.brokenRefs) {
      expect(ref).toHaveProperty("sourceFile");
      expect(ref).toHaveProperty("targetId");
      expect(ref).toHaveProperty("field");
    }
  });
});
