import { describe, it, expect, beforeEach } from "vitest";
import { buildVaultIndex } from "../indexer/index.js";
import { validateVault } from "../validator/index.js";
import { loadSchemas, clearRegistry, registerSchema } from "../schema/index.js";
import { IssueCode } from "../types/index.js";
import { z } from "zod";

describe("buildVaultIndex", () => {
  beforeEach(() => {
    clearRegistry();
    loadSchemas();
  });

  it("builds index from valid files", () => {
    const files = [
      {
        filePath: "projects/alpha.md",
        content: `---
type: project
id: proj-alpha
title: Alpha
status: active
---`,
      },
      {
        filePath: "decisions/use-zod.md",
        content: `---
type: decision
id: dec-1
title: Use Zod
decisionDate: "2026-01-15"
outcome: Approved
projects:
  - proj-alpha
---`,
      },
    ];

    const index = buildVaultIndex(files);
    expect(index.files.size).toBe(2);
    expect(index.idIndex.get("proj-alpha")).toBe("projects/alpha.md");
    expect(index.edges).toHaveLength(1);
    expect(index.edges[0]).toEqual({
      sourceFile: "decisions/use-zod.md",
      targetId: "proj-alpha",
      field: "projects",
    });
    expect(index.stats.validFiles).toBe(2);
  });

  it("indexes idea reference edges via schema metadata", () => {
    const files = [
      {
        filePath: "projects/alpha.md",
        content: `---
type: project
id: proj-alpha
title: Alpha
status: active
---`,
      },
      {
        filePath: "ideas/dark-mode.md",
        content: `---
type: brainstorm
id: brain-1
title: Dark mode
status: draft
projects:
  - proj-alpha
---`,
      },
    ];

    const index = buildVaultIndex(files);
    expect(index.edges).toHaveLength(1);
    expect(index.edges[0]).toEqual({
      sourceFile: "ideas/dark-mode.md",
      targetId: "proj-alpha",
      field: "projects",
    });
  });

  it("indexes custom reference fields from schema metadata", () => {
    const taskSchema = z
      .object({
        type: z.literal("custom-task"),
        id: z.string().min(1),
        title: z.string().min(1),
        assigneeId: z.string().min(1),
      })
      .strict();

    registerSchema("custom-task", taskSchema, {
      referenceFields: ["assigneeId"],
    });

    const files = [
      {
        filePath: "tasks/t1.md",
        content: `---
type: custom-task
id: task-1
title: Do stuff
assigneeId: user-42
---`,
      },
    ];

    const index = buildVaultIndex(files);
    expect(index.edges).toHaveLength(1);
    expect(index.edges[0]).toEqual({
      sourceFile: "tasks/t1.md",
      targetId: "user-42",
      field: "assigneeId",
    });
  });

  it("uses custom idField from schema metadata", () => {
    const personSchema = z
      .object({
        type: z.literal("person"),
        slug: z.string().min(1),
        name: z.string().min(1),
      })
      .strict();

    registerSchema("person", personSchema, {
      idField: "slug",
    });

    const files = [
      {
        filePath: "people/jane.md",
        content: `---
type: person
slug: jane-doe
name: Jane Doe
---`,
      },
    ];

    const index = buildVaultIndex(files);
    expect(index.idIndex.get("jane-doe")).toBe("people/jane.md");
    expect(index.files.get("people/jane.md")?.id).toBe("jane-doe");
  });

  it("creates multiple edges from array reference field", () => {
    const files = [
      {
        filePath: "projects/alpha.md",
        content: `---
type: project
id: proj-alpha
title: Alpha
status: active
---`,
      },
      {
        filePath: "projects/beta.md",
        content: `---
type: project
id: proj-beta
title: Beta
status: active
---`,
      },
      {
        filePath: "ideas/cross-project.md",
        content: `---
type: brainstorm
id: brain-cross
title: Cross-project idea
status: draft
projects:
  - proj-alpha
  - proj-beta
---`,
      },
    ];

    const index = buildVaultIndex(files);
    const ideaEdges = index.edges.filter(
      (e) => e.sourceFile === "ideas/cross-project.md",
    );
    expect(ideaEdges).toHaveLength(2);
    expect(ideaEdges.map((e) => e.targetId).sort()).toEqual(["proj-alpha", "proj-beta"]);
  });
});

describe("validateVault", () => {
  beforeEach(() => {
    clearRegistry();
    loadSchemas();
  });

  it("detects duplicate IDs", () => {
    const files = [
      {
        filePath: "a.md",
        content: `---\ntype: project\nid: dup\ntitle: A\nstatus: active\n---`,
      },
      {
        filePath: "b.md",
        content: `---\ntype: project\nid: dup\ntitle: B\nstatus: active\n---`,
      },
    ];

    const index = buildVaultIndex(files);
    const result = validateVault(index);
    const allIssues = [...result.issues.values()].flat();
    expect(allIssues.some((i) => i.code === IssueCode.VAULT_DUPLICATE_ID)).toBe(true);
  });

  it("detects missing references", () => {
    const files = [
      {
        filePath: "dec.md",
        content: `---
type: decision
id: dec-1
title: Orphan Decision
decisionDate: "2026-01-01"
outcome: Rejected
projects:
  - nonexistent
---`,
      },
    ];

    const index = buildVaultIndex(files);
    const result = validateVault(index);
    const allIssues = [...result.issues.values()].flat();
    expect(allIssues.some((i) => i.code === IssueCode.VAULT_MISSING_REFERENCE)).toBe(
      true,
    );
  });
});
