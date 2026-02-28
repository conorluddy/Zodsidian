import { describe, it, expect, beforeEach } from "vitest";
import { scaffold } from "../scaffold/index.js";
import { parseFrontmatter } from "../parser/index.js";
import { validateFrontmatter } from "../validator/index.js";
import { loadSchemas, clearRegistry } from "../schema/index.js";

// Required base fields for round-trip validation tests
const BASE_OVERRIDES = {
  summary:
    "A test document created for validation purposes with all required fields present to ensure schema passes cleanly.",
  created: "2026-01-01",
  updated: "2026-01-15",
  summarisedAt: "2026-01-15",
};

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
      overrides: { id: "proj-rt", title: "Round Trip", ...BASE_OVERRIDES },
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
        ...BASE_OVERRIDES,
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
      overrides: { id: "idea-rt", title: "Test Idea", ...BASE_OVERRIDES },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const parsed = parseFrontmatter(result.value.content);
    const issues = validateFrontmatter(parsed.data as Record<string, unknown>);
    expect(issues).toHaveLength(0);
  });

  it("scaffolded plan with overrides validates without errors", () => {
    const result = scaffold("plan", {
      overrides: { id: "plan-rt", title: "Test Plan", ...BASE_OVERRIDES },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const parsed = parseFrontmatter(result.value.content);
    const issues = validateFrontmatter(parsed.data as Record<string, unknown>);
    expect(issues).toHaveLength(0);
  });

  it("scaffolded documentation with overrides validates without errors", () => {
    const result = scaffold("documentation", {
      overrides: { id: "doc-rt", title: "Getting Started", ...BASE_OVERRIDES },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const parsed = parseFrontmatter(result.value.content);
    const issues = validateFrontmatter(parsed.data as Record<string, unknown>);
    expect(issues).toHaveLength(0);
  });

  it("wraps project overrides in [[wiki-links]] and re-parses to plain IDs", () => {
    const result = scaffold("decision", {
      overrides: {
        id: "dec-wl",
        title: "Wiki Link Test",
        projects: ["proj-1", "proj-2"],
        decisionDate: "2026-02-20",
        outcome: "Approved",
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.content).toContain("[[proj-1]]");
    expect(result.value.content).toContain("[[proj-2]]");

    // Re-parse should strip back to plain IDs
    const parsed = parseFrontmatter(result.value.content);
    const data = parsed.data as Record<string, unknown>;
    expect(data["projects"]).toEqual(["proj-1", "proj-2"]);
  });

  it("orders plan keys according to schema definition", () => {
    const result = scaffold("plan", {
      overrides: { id: "plan-ord", title: "Ordered Plan" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const parsed = parseFrontmatter(result.value.content);
    const keys = Object.keys(parsed.data as Record<string, unknown>);
    expect(keys[0]).toBe("type");
    expect(keys[1]).toBe("id");
    expect(keys[2]).toBe("title");
    expect(keys[3]).toBe("summary");
    expect(keys[4]).toBe("status");
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
    expect(keys[3]).toBe("summary");
    expect(keys[4]).toBe("status");
  });
});
