import { describe, it, expect, beforeEach } from "vitest";
import { validateFrontmatter } from "../validator/index.js";
import { loadSchemas, clearRegistry } from "../schema/index.js";
import { IssueCode } from "../types/index.js";
import type { ZodsidianConfig } from "../config/index.js";

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

  it("validates a correct brainstorm", () => {
    const issues = validateFrontmatter({
      type: "brainstorm",
      id: "brain-1",
      title: "Dark mode",
      status: "draft",
    });
    expect(issues).toHaveLength(0);
  });

  it("validates brainstorm with projects array", () => {
    const issues = validateFrontmatter({
      type: "brainstorm",
      id: "brain-2",
      title: "Linked idea",
      status: "proposed",
      projects: ["proj-1"],
    });
    expect(issues).toHaveLength(0);
  });

  it("rejects brainstorm with invalid status", () => {
    const issues = validateFrontmatter({
      type: "brainstorm",
      id: "brain-3",
      title: "Bad status",
      status: "invalid-status",
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
    });
    expect(issues).toHaveLength(0);
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
