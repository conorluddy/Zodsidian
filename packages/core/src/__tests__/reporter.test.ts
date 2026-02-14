import { describe, it, expect } from "vitest";
import { formatIssue, buildSummary } from "../reporter/index.js";
import { IssueCode } from "../types/index.js";

describe("formatIssue", () => {
  it("formats an error with file path", () => {
    const result = formatIssue("test.md", {
      severity: "error",
      code: IssueCode.FM_MISSING_TYPE,
      message: "Missing type",
      suggestion: "Add a type field",
    });
    expect(result).toContain("[ERROR]");
    expect(result).toContain("test.md");
    expect(result).toContain("Add a type field");
  });

  it("formats a warning with path", () => {
    const result = formatIssue("test.md", {
      severity: "warning",
      code: IssueCode.FM_TAGS_NOT_ARRAY,
      message: "Tags should be an array",
      path: ["tags"],
    });
    expect(result).toContain("[WARN]");
    expect(result).toContain("(tags)");
  });
});

describe("buildSummary", () => {
  it("produces summary text", () => {
    const result = buildSummary({
      totalFiles: 10,
      validFiles: 8,
      errorCount: 3,
      warningCount: 1,
    });
    expect(result).toContain("10");
    expect(result).toContain("8");
    expect(result).toContain("3");
    expect(result).toContain("1");
  });
});
