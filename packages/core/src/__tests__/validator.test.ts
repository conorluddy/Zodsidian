import { describe, it, expect, beforeEach } from "vitest";
import { validateFrontmatter } from "../validator/index.js";
import { loadSchemas, clearRegistry } from "../schema/index.js";
import { IssueCode } from "../types/index.js";
import type { ZodsidianConfig } from "../config/index.js";

// Shared required base fields for all "validates correctly" test cases
const BASE = {
  summary:
    "A test document created for validation purposes with all required fields present to ensure schema passes cleanly.",
  created: "2026-01-01",
  updated: "2026-01-15",
  summarisedAt: "2026-01-15",
};

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
      ...BASE,
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
      ...BASE,
    });
    expect(issues.length).toBeGreaterThan(0);
  });

  it("validates a correct idea", () => {
    const issues = validateFrontmatter({
      type: "idea",
      id: "idea-1",
      title: "Dark mode",
      status: "draft",
      ...BASE,
    });
    expect(issues).toHaveLength(0);
  });

  it("validates idea with projects array", () => {
    const issues = validateFrontmatter({
      type: "idea",
      id: "idea-2",
      title: "Linked idea",
      status: "proposed",
      projects: ["proj-1"],
      ...BASE,
    });
    expect(issues).toHaveLength(0);
  });

  it("rejects idea with invalid status", () => {
    const issues = validateFrontmatter({
      type: "idea",
      id: "idea-3",
      title: "Bad status",
      status: "invalid-status",
      ...BASE,
    });
    expect(issues.some((i) => i.code === IssueCode.FM_SCHEMA_INVALID)).toBe(true);
  });

  it("validates a correct documentation", () => {
    const issues = validateFrontmatter({
      type: "documentation",
      id: "doc-1",
      title: "Getting Started",
      status: "published",
      ...BASE,
    });
    expect(issues).toHaveLength(0);
  });

  it("rejects documentation with invalid status", () => {
    const issues = validateFrontmatter({
      type: "documentation",
      id: "doc-2",
      title: "Bad Status",
      status: "unpublished",
      ...BASE,
    });
    expect(issues.some((i) => i.code === IssueCode.FM_SCHEMA_INVALID)).toBe(true);
  });

  it("validates a correct decision", () => {
    const issues = validateFrontmatter({
      type: "decision",
      id: "dec-1",
      title: "Use Zod",
      decisionDate: "2026-01-15",
      outcome: "Approved",
      projects: ["proj-1"],
      ...BASE,
    });
    expect(issues).toHaveLength(0);
  });

  describe("FM_STALE_SUMMARY", () => {
    it("emits warning when summarisedAt is before updated", () => {
      const issues = validateFrontmatter({
        type: "project",
        id: "proj-1",
        title: "My Project",
        status: "active",
        ...BASE,
        updated: "2026-02-01",
        summarisedAt: "2026-01-15", // older than updated
      });
      expect(issues.some((i) => i.code === IssueCode.FM_STALE_SUMMARY)).toBe(true);
      const issue = issues.find((i) => i.code === IssueCode.FM_STALE_SUMMARY);
      expect(issue?.severity).toBe("warning");
      expect(issue?.path).toEqual(["summarisedAt"]);
    });

    it("does not emit warning when summarisedAt equals updated", () => {
      const issues = validateFrontmatter({
        type: "project",
        id: "proj-1",
        title: "My Project",
        status: "active",
        ...BASE,
        updated: "2026-01-15",
        summarisedAt: "2026-01-15",
      });
      expect(issues.some((i) => i.code === IssueCode.FM_STALE_SUMMARY)).toBe(false);
    });

    it("does not emit warning when summarisedAt is after updated", () => {
      const issues = validateFrontmatter({
        type: "project",
        id: "proj-1",
        title: "My Project",
        status: "active",
        ...BASE,
        updated: "2026-01-15",
        summarisedAt: "2026-02-01",
      });
      expect(issues.some((i) => i.code === IssueCode.FM_STALE_SUMMARY)).toBe(false);
    });

    it("does not emit warning when schema validation fails", () => {
      // Missing required fields — schema fails before staleness check runs
      const issues = validateFrontmatter({
        type: "project",
        id: "proj-1",
        updated: "2026-02-01",
        summarisedAt: "2026-01-01",
      });
      expect(issues.some((i) => i.code === IssueCode.FM_STALE_SUMMARY)).toBe(false);
      expect(issues.some((i) => i.code === IssueCode.FM_SCHEMA_INVALID)).toBe(true);
    });
  });

  describe("with type mappings", () => {
    it("resolves mapped type and validates successfully", () => {
      const config: ZodsidianConfig = {
        version: "1.0",
        typeMappings: {
          "project-index": "project",
        },
        validation: {
          warnOnMappedTypes: false,
        },
      };

      const issues = validateFrontmatter(
        {
          type: "project-index",
          id: "proj-1",
          title: "My Project",
          status: "active",
          ...BASE,
        },
        config,
      );

      expect(issues).toHaveLength(0);
    });

    it("emits FM_MAPPED_TYPE warning when warnOnMappedTypes is true", () => {
      const config: ZodsidianConfig = {
        version: "1.0",
        typeMappings: {
          "project-index": "project",
        },
        validation: {
          warnOnMappedTypes: true,
        },
      };

      const issues = validateFrontmatter(
        {
          type: "project-index",
          id: "proj-1",
          title: "My Project",
          status: "active",
          ...BASE,
        },
        config,
      );

      expect(issues.some((i) => i.code === IssueCode.FM_MAPPED_TYPE)).toBe(true);
      const mappedIssue = issues.find((i) => i.code === IssueCode.FM_MAPPED_TYPE);
      expect(mappedIssue?.severity).toBe("warning");
      expect(mappedIssue?.message).toContain("project-index");
      expect(mappedIssue?.message).toContain("project");
    });

    it("does not emit FM_MAPPED_TYPE warning when warnOnMappedTypes is false", () => {
      const config: ZodsidianConfig = {
        version: "1.0",
        typeMappings: {
          "project-index": "project",
        },
        validation: {
          warnOnMappedTypes: false,
        },
      };

      const issues = validateFrontmatter(
        {
          type: "project-index",
          id: "proj-1",
          title: "My Project",
          status: "active",
          ...BASE,
        },
        config,
      );

      expect(issues.some((i) => i.code === IssueCode.FM_MAPPED_TYPE)).toBe(false);
    });

    it("does not emit FM_MAPPED_TYPE warning when type is not mapped", () => {
      const config: ZodsidianConfig = {
        version: "1.0",
        typeMappings: {
          "project-index": "project",
        },
        validation: {
          warnOnMappedTypes: true,
        },
      };

      const issues = validateFrontmatter(
        {
          type: "project",
          id: "proj-1",
          title: "My Project",
          status: "active",
          ...BASE,
        },
        config,
      );

      expect(issues.some((i) => i.code === IssueCode.FM_MAPPED_TYPE)).toBe(false);
    });

    it("returns FM_UNKNOWN_TYPE for unmapped unknown type", () => {
      const config: ZodsidianConfig = {
        version: "1.0",
        typeMappings: {
          "project-index": "project",
        },
      };

      const issues = validateFrontmatter(
        {
          type: "unknown-type",
          id: "x",
        },
        config,
      );

      expect(issues.some((i) => i.code === IssueCode.FM_UNKNOWN_TYPE)).toBe(true);
      expect(issues.some((i) => i.code === IssueCode.FM_MAPPED_TYPE)).toBe(false);
    });
  });
});
