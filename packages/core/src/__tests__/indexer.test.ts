import { describe, it, expect, beforeEach } from "vitest";
import { buildVaultIndex } from "../indexer/index.js";
import { validateVault } from "../validator/index.js";
import { loadSchemas, clearRegistry } from "../schema/index.js";
import { IssueCode } from "../types/index.js";

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
projectId: proj-alpha
decisionDate: "2026-01-15"
outcome: Approved
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
      field: "projectId",
    });
    expect(index.stats.validFiles).toBe(2);
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
    expect(allIssues.some((i) => i.code === IssueCode.VAULT_DUPLICATE_ID)).toBe(
      true,
    );
  });

  it("detects missing references", () => {
    const files = [
      {
        filePath: "dec.md",
        content: `---
type: decision
id: dec-1
title: Orphan Decision
projectId: nonexistent
decisionDate: "2026-01-01"
outcome: Rejected
---`,
      },
    ];

    const index = buildVaultIndex(files);
    const result = validateVault(index);
    const allIssues = [...result.issues.values()].flat();
    expect(
      allIssues.some((i) => i.code === IssueCode.VAULT_MISSING_REFERENCE),
    ).toBe(true);
  });
});
