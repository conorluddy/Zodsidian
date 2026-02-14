import { describe, it, expect, beforeEach } from "vitest";
import { validateFrontmatter } from "../validator/index.js";
import { loadSchemas, clearRegistry } from "../schema/index.js";
import { IssueCode } from "../types/index.js";

describe("validateFrontmatter", () => {
  beforeEach(() => {
    clearRegistry();
    loadSchemas();
  });

  it("validates a correct project", () => {
    const issues = validateFrontmatter({
      type: "project",
      id: "proj-1",
      title: "My Project",
      status: "active",
    });
    expect(issues).toHaveLength(0);
  });

  it("reports missing type field", () => {
    const issues = validateFrontmatter({ id: "proj-1", title: "No Type" });
    expect(issues.some((i) => i.code === IssueCode.FM_MISSING_TYPE)).toBe(true);
  });

  it("reports unknown type", () => {
    const issues = validateFrontmatter({ type: "nonexistent", id: "x" });
    expect(issues.some((i) => i.code === IssueCode.FM_UNKNOWN_TYPE)).toBe(true);
  });

  it("reports schema validation errors", () => {
    const issues = validateFrontmatter({ type: "project", id: "proj-1" });
    expect(issues.some((i) => i.code === IssueCode.FM_SCHEMA_INVALID)).toBe(true);
  });

  it("rejects unknown keys with strict schema", () => {
    const issues = validateFrontmatter({
      type: "project",
      id: "proj-1",
      title: "Strict",
      status: "active",
      extraField: "oops",
    });
    expect(issues.length).toBeGreaterThan(0);
  });

  it("validates a correct decision", () => {
    const issues = validateFrontmatter({
      type: "decision",
      id: "dec-1",
      title: "Use Zod",
      projectId: "proj-1",
      decisionDate: "2026-01-15",
      outcome: "Approved",
    });
    expect(issues).toHaveLength(0);
  });
});
