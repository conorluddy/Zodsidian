import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { schemaCommand } from "../commands/schema.js";

describe("aii schema", () => {
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

  it("lists all registered types when called with no argument", async () => {
    await schemaCommand(undefined);
    expect(Array.isArray(output)).toBe(true);
    expect(output as string[]).toContain("project");
  });

  it("returns schema descriptor for a known type", async () => {
    await schemaCommand("project");
    expect(output).toMatchObject({
      type: "project",
      idField: "id",
      referenceFields: expect.arrayContaining(["projects"]),
      fields: expect.any(Array),
    });
  });

  it("exits with error for unknown type", async () => {
    const exitSpy = vi.spyOn(process, "exit");
    await schemaCommand("unicorn");
    expect(exitSpy).toHaveBeenCalledWith(2);
  });
});
