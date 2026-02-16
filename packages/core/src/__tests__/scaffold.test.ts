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

  it("generates valid project frontmatter with overrides", () => {
    const result = scaffold("project", {
      overrides: { id: "proj-new", title: "New Project" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe("project");
    expect(result.value.content).toContain("type: project");
    expect(result.value.content).toContain("id: proj-new");
    expect(result.value.content).toContain("title: New Project");
  });

  it("scaffolded project with overrides validates without errors", () => {
    const result = scaffold("project", {
      overrides: { id: "proj-rt", title: "Round Trip" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const parsed = parseFrontmatter(result.value.content);
    expect(parsed.isValid).toBe(true);

    const issues = validateFrontmatter(parsed.data as Record<string, unknown>);
    expect(issues).toHaveLength(0);
  });

  it("scaffolded decision with overrides validates without errors", () => {
    const result = scaffold("decision", {
      overrides: {
        id: "dec-rt",
        title: "Test Decision",
        projects: ["proj-1"],
        decisionDate: "2026-02-15",
        outcome: "Approved",
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const parsed = parseFrontmatter(result.value.content);
    const issues = validateFrontmatter(parsed.data as Record<string, unknown>);
    expect(issues).toHaveLength(0);
  });

  it("scaffolded idea with minimal overrides validates without errors", () => {
    const result = scaffold("idea", {
      overrides: { id: "idea-rt", title: "Test Idea" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const parsed = parseFrontmatter(result.value.content);
    const issues = validateFrontmatter(parsed.data as Record<string, unknown>);
    expect(issues).toHaveLength(0);
  });

  it("returns error for unknown schema type", () => {
    const result = scaffold("nonexistent");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("UNKNOWN_TYPE");
    expect(result.error.message).toContain("nonexistent");
  });

  it("orders keys according to schema definition", () => {
    const result = scaffold("project", {
      overrides: { id: "proj-ord", title: "Ordered" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const parsed = parseFrontmatter(result.value.content);
    const keys = Object.keys(parsed.data as Record<string, unknown>);
    expect(keys[0]).toBe("type");
    expect(keys[1]).toBe("id");
    expect(keys[2]).toBe("title");
    expect(keys[3]).toBe("status");
  });
});
