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

  it("handles empty frontmatter", () => {
    const content = `---
---

Body after empty frontmatter`;
    const result = parseFrontmatter(content);
    expect(result.isValid).toBe(true);
    expect(result.data).toEqual({});
    expect(result.body).toContain("Body after empty frontmatter");
  });

  it("preserves body content exactly", () => {
    const body = "\n# Heading\n\nParagraph with **bold**.\n";
    const content = `---\ntitle: Test\n---${body}`;
    const result = parseFrontmatter(content);
    expect(result.body).toBe(body);
  });

  it("strips [[wiki-links]] from array values", () => {
    const content = `---
type: decision
id: dec-1
title: Test
projects:
  - "[[proj-1]]"
  - "[[proj-2]]"
---`;
    const result = parseFrontmatter(content);
    expect(result.isValid).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data["projects"]).toEqual(["proj-1", "proj-2"]);
  });

  it("strips [[wiki-links]] from scalar values", () => {
    const content = `---
type: project
id: "[[proj-1]]"
title: Test
status: active
---`;
    const result = parseFrontmatter(content);
    expect(result.isValid).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data["id"]).toBe("proj-1");
  });

  it("leaves partial brackets in titles untouched", () => {
    const content = `---
type: project
id: proj-1
title: "Array notation [example]"
status: active
---`;
    const result = parseFrontmatter(content);
    const data = result.data as Record<string, unknown>;
    expect(data["title"]).toBe("Array notation [example]");
  });

  it("leaves plain strings untouched by wiki-link normalization", () => {
    const content = `---
type: project
id: proj-1
title: Plain Title
status: active
---`;
    const result = parseFrontmatter(content);
    const data = result.data as Record<string, unknown>;
    expect(data["id"]).toBe("proj-1");
    expect(data["title"]).toBe("Plain Title");
  });

  it("normalizes YAML 1.1 Date objects to YYYY-MM-DD strings", () => {
    // gray-matter (YAML 1.1) parses unquoted dates as Date objects.
    // Obsidian writes dates without quotes, so we must coerce them on read.
    const content = `---
type: project
id: proj-1
title: Test
status: active
created: 2026-02-16
updated: 2026-02-18
---`;
    const result = parseFrontmatter(content);
    expect(result.isValid).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data["created"]).toBe("2026-02-16");
    expect(data["updated"]).toBe("2026-02-18");
    expect(typeof data["created"]).toBe("string");
  });
});
