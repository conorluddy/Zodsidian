import { describe, it, expect, beforeEach } from "vitest";
import { applyFixes, sortKeys } from "../autofix/index.js";
import { loadSchemas, clearRegistry } from "../schema/index.js";

describe("sortKeys", () => {
  it("sorts keys by provided order", () => {
    const data = {
      tags: ["a"],
      id: "1",
      type: "project",
      title: "Test",
      status: "active",
    };
    const sorted = sortKeys(data, ["type", "id", "title", "status", "tags"]);
    expect(Object.keys(sorted)).toEqual(["type", "id", "title", "status", "tags"]);
  });

  it("falls back to alphabetical when no order provided", () => {
    const data = { zebra: 1, alpha: 2, middle: 3 };
    const sorted = sortKeys(data);
    expect(Object.keys(sorted)).toEqual(["alpha", "middle", "zebra"]);
  });

  it("appends unknown keys at the end", () => {
    const data = { custom: "x", type: "project", id: "1" };
    const sorted = sortKeys(data, ["type", "id"]);
    expect(Object.keys(sorted)).toEqual(["type", "id", "custom"]);
  });
});

describe("applyFixes", () => {
  beforeEach(() => {
    clearRegistry();
    loadSchemas();
  });

  it("normalizes string tags to array", () => {
    const content = `---
type: project
id: proj-1
title: Test
status: active
tags: single-tag
---

Body text`;

    const result = applyFixes(content);
    expect(result.content).toContain("- single-tag");
    expect(result.content).toContain("Body text");
    expect(result.changed).toBe(true);
  });

  it("sorts keys using schema-derived order", () => {
    const content = `---
tags: []
id: proj-1
type: project
title: Test
status: active
---

Body`;

    const result = applyFixes(content);
    const fmMatch = result.content.match(/---\n([\s\S]*?)\n---/);
    const lines = fmMatch![1].split("\n").map((l: string) => l.split(":")[0].trim());
    expect(lines[0]).toBe("type");
    expect(lines[1]).toBe("id");
    expect(lines[2]).toBe("title");
  });

  it("preserves body exactly", () => {
    const body = "\n# Heading\n\nParagraph with **bold** and `code`.\n";
    const content = `---\ntype: project\nid: p\ntitle: T\nstatus: active\n---${body}`;
    const result = applyFixes(content);
    expect(result.content.endsWith(body)).toBe(true);
  });

  it("returns unchanged when no frontmatter", () => {
    const content = "Just plain text";
    const result = applyFixes(content);
    expect(result.changed).toBe(false);
    expect(result.content).toBe(content);
  });

  it("removes unknown keys when unsafe is true", () => {
    const content = `---
type: project
id: proj-1
title: Test
status: active
extraField: should-be-removed
anotherExtra: also-gone
---

Body`;

    const result = applyFixes(content, { unsafe: true });
    expect(result.changed).toBe(true);
    expect(result.content).not.toContain("extraField");
    expect(result.content).not.toContain("anotherExtra");
    expect(result.content).toContain("type: project");
    expect(result.content).toContain("title: Test");
  });

  it("keeps unknown keys when unsafe is false", () => {
    const content = `---
type: project
id: proj-1
title: Test
status: active
extraField: should-remain
---

Body`;

    const result = applyFixes(content);
    expect(result.content).toContain("extraField");
  });
});
