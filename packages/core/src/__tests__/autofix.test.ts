import { describe, it, expect, beforeEach } from "vitest";
import {
  applyFixes,
  sortKeys,
  populateMissingFields,
  renameFields,
  inferIdFromTitle,
  inferIdFromPath,
  inferTitleFromPath,
} from "../autofix/index.js";
import { parseFrontmatter } from "../parser/index.js";
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

  it("normalizes scalar projects to array", () => {
    const content = `---
type: decision
id: dec-1
title: Test
status: accepted
projects: proj-1
---

Body`;

    const result = applyFixes(content);
    expect(result.content).toContain("- proj-1");
    expect(result.changed).toBe(true);
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

describe("renameFields", () => {
  it("renames an old key to a new key", () => {
    const data = { type: "plan", project: "Zodsidian", date: "2026-01-01" };
    const result = renameFields({ project: "projects", date: "created" })(data);
    expect(result).toHaveProperty("projects", "Zodsidian");
    expect(result).toHaveProperty("created", "2026-01-01");
    expect(result).not.toHaveProperty("project");
    expect(result).not.toHaveProperty("date");
  });

  it("does not overwrite an existing target key", () => {
    const data = { type: "plan", date: "2026-01-01", created: "2025-12-01" };
    const result = renameFields({ date: "created" })(data);
    expect(result.created).toBe("2025-12-01");
    expect(result).toHaveProperty("date"); // old key preserved, not removed
  });

  it("renames then normalizeArrayFields coerces to array via preStrategies", () => {
    const content = `---
type: plan
title: My Plan
status: draft
project: Zodsidian
tags: []
date: "2026-01-15"
---

Body`;
    const result = applyFixes(content, {
      preStrategies: [renameFields({ project: "projects", date: "created" })],
    });
    expect(result.changed).toBe(true);
    expect(result.content).toContain("- Zodsidian");
    expect(result.content).toContain('created: "2026-01-15"');
    expect(result.content).not.toContain("project:");
    expect(result.content).not.toContain("date:");
  });
});

describe("inferIdFromTitle", () => {
  beforeEach(() => {
    clearRegistry();
    loadSchemas();
  });

  it("infers id from type + title when id is missing", () => {
    const data = { type: "project", title: "My Great App", status: "active" };
    const result = inferIdFromTitle(data);
    expect(result.id).toBe("project-my-great-app");
  });

  it("infers id from type + title when id is empty string", () => {
    const data = { type: "project", id: "", title: "Grapla", status: "active" };
    const result = inferIdFromTitle(data);
    expect(result.id).toBe("project-grapla");
  });

  it("does not overwrite a non-empty id", () => {
    const data = {
      type: "project",
      id: "proj-existing",
      title: "Something",
      status: "active",
    };
    const result = inferIdFromTitle(data);
    expect(result.id).toBe("proj-existing");
  });

  it("skips if no title available", () => {
    const data = { type: "project", status: "active" };
    const result = inferIdFromTitle(data);
    expect(result.id).toBeUndefined();
  });

  it("skips if type is not registered", () => {
    const data = { type: "unknown-type", title: "Test" };
    const result = inferIdFromTitle(data);
    expect(result.id).toBeUndefined();
  });

  it("slugifies special characters and spaces", () => {
    const data = {
      type: "plan",
      title: "Validation panel — right leaf showing issues",
      status: "draft",
    };
    const result = inferIdFromTitle(data);
    expect(result.id).toBe("plan-validation-panel-right-leaf-showing-issues");
  });

  it("integrates with applyFixes + populateMissingFields via extraStrategies", () => {
    const content = `---\ntype: plan\ntitle: My Plan\nstatus: draft\n---\n\nBody`;
    const result = applyFixes(content, {
      extraStrategies: [inferIdFromTitle, populateMissingFields],
    });
    const parsed = parseFrontmatter(result.content);
    const data = parsed.data as Record<string, unknown>;
    expect(data.id).toBe("plan-my-plan");
  });
});

describe("inferIdFromPath", () => {
  beforeEach(() => {
    clearRegistry();
    loadSchemas();
  });

  it("infers id from filename when id is missing", () => {
    const data = { type: "project", title: "", status: "active" };
    const result = inferIdFromPath("/vault/IOS Apps/Grapla/Grapla.md")(data);
    expect(result.id).toBe("project-grapla");
  });

  it("infers id from filename when id is empty string", () => {
    const data = { type: "project", id: "", title: "", status: "active" };
    const result = inferIdFromPath("/vault/IOS Apps/Grapla/Grapla.md")(data);
    expect(result.id).toBe("project-grapla");
  });

  it("slugifies the filename", () => {
    const data = { type: "plan", status: "draft" };
    const result = inferIdFromPath("/Plans/My Great Plan 2026.md")(data);
    expect(result.id).toBe("plan-my-great-plan-2026");
  });

  it("does not overwrite an id set by inferIdFromTitle", () => {
    const data = { type: "plan", title: "Real Title", status: "draft" };
    const afterTitle = inferIdFromTitle(data);
    expect(afterTitle.id).toBe("plan-real-title");
    const afterPath = inferIdFromPath("/Plans/random-filename.md")(afterTitle);
    expect(afterPath.id).toBe("plan-real-title"); // title wins
  });

  it("falls back to filename when title is empty", () => {
    const data = { type: "project", id: "", title: "", status: "active" };
    const afterTitle = inferIdFromTitle(data); // no-op: title empty
    expect(afterTitle.id).toBe("");
    const afterPath = inferIdFromPath("/IOS Apps/Grapla/Grapla.md")(afterTitle);
    expect(afterPath.id).toBe("project-grapla");
  });
});

describe("inferTitleFromPath", () => {
  beforeEach(() => {
    clearRegistry();
    loadSchemas();
  });

  it("infers title from filename in sentence case", () => {
    const data = { type: "project", id: "", title: "", status: "active" };
    const result = inferTitleFromPath("/vault/IOS Apps/Grapla/Grapla.md")(data);
    expect(result.title).toBe("Grapla");
  });

  it("converts hyphens to spaces and applies sentence case", () => {
    const data = { type: "plan", status: "draft" };
    const result = inferTitleFromPath("/Plans/my-great-plan.md")(data);
    expect(result.title).toBe("My great plan");
  });

  it("does not overwrite a non-empty title", () => {
    const data = { type: "plan", title: "Keep This Title", status: "draft" };
    const result = inferTitleFromPath("/Plans/random-filename.md")(data);
    expect(result.title).toBe("Keep This Title");
  });

  it("skips if type is not registered", () => {
    const data = { type: "unknown-type", title: "" };
    const result = inferTitleFromPath("/vault/something.md")(data);
    expect(result.title).toBe("");
  });

  it("works end-to-end: inferTitleFromPath then inferIdFromTitle", () => {
    const data = { type: "project", id: "", title: "", status: "active" };
    const afterTitle = inferTitleFromPath("/vault/Grapla/Grapla.md")(data);
    expect(afterTitle.title).toBe("Grapla");
    const afterId = inferIdFromTitle(afterTitle);
    expect(afterId.id).toBe("project-grapla");
  });
});

describe("populateMissingFields", () => {
  beforeEach(() => {
    clearRegistry();
    loadSchemas();
  });

  it("populates missing status and tags from schema defaults", () => {
    const content = `---
type: project
id: proj-1
title: Minimal Project
---

Body`;

    const result = applyFixes(content, {
      extraStrategies: [populateMissingFields],
    });
    expect(result.changed).toBe(true);

    const parsed = parseFrontmatter(result.content);
    const data = parsed.data as Record<string, unknown>;
    expect(data.status).toBe("active");
    expect(data.tags).toEqual([]);
    expect(data.projects).toEqual([]);
  });

  it("does not overwrite existing values", () => {
    const content = `---
type: project
id: proj-1
title: Existing Status
status: paused
tags:
  - important
---

Body`;

    const result = applyFixes(content, {
      extraStrategies: [populateMissingFields],
    });

    const parsed = parseFrontmatter(result.content);
    const data = parsed.data as Record<string, unknown>;
    expect(data.status).toBe("paused");
    expect(data.tags).toEqual(["important"]);
  });
});
