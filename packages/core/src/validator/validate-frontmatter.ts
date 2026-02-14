import type { ZodError, ZodIssue } from "zod";
import { IssueCode } from "../types/index.js";
import type { ValidationIssue } from "../types/index.js";
import { getSchema } from "../schema/index.js";

function mapZodIssue(issue: ZodIssue): ValidationIssue {
  const path = issue.path.map(String);

  if (issue.code === "unrecognized_keys") {
    return {
      severity: "error",
      code: IssueCode.FM_UNKNOWN_KEY,
      message: `Unknown key(s): ${issue.keys.join(", ")}`,
      path,
      suggestion: `Remove unknown keys: ${issue.keys.join(", ")}`,
    };
  }

  return {
    severity: "error",
    code: IssueCode.FM_SCHEMA_INVALID,
    message: issue.message,
    path: path.length > 0 ? path : undefined,
  };
}

export function validateFrontmatter(data: Record<string, unknown>): ValidationIssue[] {
  const type = data.type;

  if (typeof type !== "string" || type.length === 0) {
    return [
      {
        severity: "error",
        code: IssueCode.FM_MISSING_TYPE,
        message: 'Frontmatter missing required "type" field',
        suggestion: 'Add a "type" field to frontmatter',
      },
    ];
  }

  const schema = getSchema(type);
  if (!schema) {
    return [
      {
        severity: "warning",
        code: IssueCode.FM_UNKNOWN_TYPE,
        message: `Unknown frontmatter type: "${type}"`,
        suggestion: `Register a schema for type "${type}"`,
      },
    ];
  }

  const result = schema.safeParse(data);
  if (result.success) {
    return [];
  }

  return (result.error as ZodError).issues.map(mapZodIssue);
}
