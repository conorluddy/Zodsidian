import { describe, it, expect } from "vitest";
import { parseFrontmatter } from "../parser/index.js";
import { IssueCode } from "../types/index.js";

describe("parseFrontmatter", () => {
  it("parses valid frontmatter", () => {
    const content = `---
type: project
id: proj-1
title: Test Project
status: active
---

Some markdown body`;

    const result = parseFrontmatter(content);
    expect(result.isValid).toBe(true);
    expect(result.data).toEqual({
      type: "project",
      id: "proj-1",
      title: "Test Project",
      status: "active",
    });
    expect(result.body).toContain("Some markdown body");
    expect(result.issues).toHaveLength(0);
  });

  it("returns error for missing frontmatter", () => {
    const result = parseFrontmatter("Just some text");
    expect(result.isValid).toBe(false);
    expect(result.data).toBeNull();
    expect(result.issues[0].code).toBe(IssueCode.FM_MISSING);
  });

  it("returns error for invalid YAML", () => {
    const content = `---
: broken: yaml: [
---`;
    const result = parseFrontmatter(content);
    expect(result.isValid).toBe(false);
  });

  it("preserves body content exactly", () => {
    const body = "\n# Heading\n\nParagraph with **bold**.\n";
    const content = `---\ntitle: Test\n---${body}`;
    const result = parseFrontmatter(content);
    expect(result.body).toBe(body);
  });
});
