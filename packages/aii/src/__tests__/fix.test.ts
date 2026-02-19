import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { fixCommand } from "../commands/fix.js";

const FIXTURES = new URL("../../../../tests/fixtures/vault", import.meta.url).pathname;

describe("aii fix", () => {
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

  it("outputs structured result with changed/unchanged/written/dryRun", async () => {
    await fixCommand(FIXTURES, {});
    expect(output).toMatchObject({
      changed: expect.any(Array),
      unchanged: expect.any(Array),
      totalChanged: expect.any(Number),
      totalUnchanged: expect.any(Number),
      written: false,
      dryRun: false,
    });
  });

  it("sets written: false when --write is not passed", async () => {
    await fixCommand(FIXTURES, {});
    expect((output as { written: boolean }).written).toBe(false);
  });

  it("sets dryRun: true when --dry-run is passed", async () => {
    await fixCommand(FIXTURES, { dryRun: true });
    expect((output as { dryRun: boolean }).dryRun).toBe(true);
  });

  it("accepts renameField pairs without error", async () => {
    await fixCommand(FIXTURES, { renameField: ["project=projects"] });
    expect(output).toMatchObject({ changed: expect.any(Array) });
  });

  it("reports fixable files in changed array", async () => {
    await fixCommand(FIXTURES, {});
    const result = output as {
      changed: Array<{ filePath: string }>;
      totalChanged: number;
    };
    expect(result.changed.length).toBe(result.totalChanged);
    if (result.changed.length > 0) {
      expect(result.changed[0]).toHaveProperty("filePath");
    }
  });
});
