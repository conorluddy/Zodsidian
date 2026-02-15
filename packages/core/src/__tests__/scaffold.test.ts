import { describe, it, expect, beforeEach } from "vitest";
import { scaffold } from "../scaffold/index.js";
import { parseFrontmatter } from "../parser/index.js";
import { validateFrontmatter } from "../validator/index.js";
import { loadSchemas, clearRegistry } from "../schema/index.js";

describe("scaffold", () => {
  beforeEach(() => {
    clearRegistry();
    loadSchemas();
  });

  it("generates valid project frontmatter", () => {
    const result = scaffold("project", {
      overrides: { id: "proj-new", title: "New Project" },
    });
    expect(result.type).toBe("project");
    expect(result.content).toContain("type: project");
    expect(result.content).toContain("id: proj-new");
    expect(result.content).toContain("title: New Project");
  });

  it("round-trips: scaffold -> parse -> validate -> zero issues", () => {
    const result = scaffold("project", {
      overrides: { id: "proj-rt", title: "Round Trip" },
    });
    const parsed = parseFrontmatter(result.content);
    expect(parsed.isValid).toBe(true);
    expect(parsed.data).toBeTruthy();

    const issues = validateFrontmatter(parsed.data as Record<string, unknown>);
    expect(issues).toHaveLength(0);
  });

  it("round-trips decision with overrides", () => {
    const result = scaffold("decision", {
      overrides: {
        id: "dec-rt",
        title: "Test Decision",
        projectId: "proj-1",
        decisionDate: "2026-02-15",
        outcome: "Approved",
      },
    });
    const parsed = parseFrontmatter(result.content);
    const issues = validateFrontmatter(parsed.data as Record<string, unknown>);
    expect(issues).toHaveLength(0);
  });

  it("round-trips idea with minimal overrides", () => {
    const result = scaffold("idea", {
      overrides: { id: "idea-rt", title: "Test Idea" },
    });
    const parsed = parseFrontmatter(result.content);
    const issues = validateFrontmatter(parsed.data as Record<string, unknown>);
    expect(issues).toHaveLength(0);
  });

  it("throws for unknown schema type", () => {
    expect(() => scaffold("nonexistent")).toThrow('Unknown schema type: "nonexistent"');
  });

  it("uses schema key order", () => {
    const result = scaffold("project", {
      overrides: { id: "proj-ord", title: "Ordered" },
    });
    const fmMatch = result.content.match(/---\n([\s\S]*?)\n---/);
    const lines = fmMatch![1].split("\n").map((l) => l.split(":")[0].trim());
    expect(lines[0]).toBe("type");
    expect(lines[1]).toBe("id");
    expect(lines[2]).toBe("title");
    expect(lines[3]).toBe("status");
  });
});
