import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { validateCommand } from "../commands/validate.js";

const FIXTURES = new URL("../../../../tests/fixtures/vault", import.meta.url).pathname;

describe("aii validate", () => {
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

  it("outputs valid JSON with stats and issues keys", async () => {
    await validateCommand(FIXTURES, {});
    expect(output).toMatchObject({
      stats: expect.objectContaining({ totalFiles: expect.any(Number) }),
      issues: expect.any(Array),
      isValid: expect.any(Boolean),
    });
  });

  it("surfaces errors for invalid documents", async () => {
    await validateCommand(FIXTURES, {});
    const result = output as { issues: Array<{ severity: string; filePath: string }> };
    const errors = result.issues.filter((i) => i.severity === "error");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatchObject({
      filePath: expect.any(String),
      severity: "error",
      code: expect.any(String),
      message: expect.any(String),
    });
  });

  it("reports isValid: true when no errors", async () => {
    // idea type has one fixture (valid-idea.md) with no schema errors
    await validateCommand(FIXTURES, { type: "idea" });
    const result = output as { isValid: boolean; issues: unknown[] };
    expect(result.isValid).toBe(true);
  });
});
