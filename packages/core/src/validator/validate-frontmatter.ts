import type { ZodError, ZodIssue } from "zod";
import { IssueCode } from "../types/index.js";
import type { ValidationIssue } from "../types/index.js";
import type { ZodsidianConfig } from "../config/index.js";
import { resolveType } from "../config/index.js";
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

export function validateFrontmatter(
  data: Record<string, unknown>,
  config?: ZodsidianConfig,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const userType = data.type;

  if (typeof userType !== "string" || userType.length === 0) {
    return [
      {
        severity: "error",
        code: IssueCode.FM_MISSING_TYPE,
        message: 'Frontmatter missing required "type" field',
        suggestion: 'Add a "type" field to frontmatter',
      },
    ];
  }

  // Resolve type using config mappings
  const canonicalType = resolveType(userType, config);

  // Emit warning if type was mapped and warnings are enabled
  if (canonicalType !== userType && config?.validation?.warnOnMappedTypes) {
    issues.push({
      severity: "warning",
      code: IssueCode.FM_MAPPED_TYPE,
      message: `Type "${userType}" is mapped to "${canonicalType}"`,
      suggestion: `Consider migrating: zodsidian migrate --from "${userType}" --to "${canonicalType}"`,
      path: ["type"],
    });
  }

  const schema = getSchema(canonicalType);
  if (!schema) {
    issues.push({
      severity: "warning",
      code: IssueCode.FM_UNKNOWN_TYPE,
      message: `Unknown frontmatter type: "${canonicalType}"`,
      suggestion: `Register a schema for type "${canonicalType}"`,
    });
    return issues;
  }

  // If type was mapped, create a copy of the data with the canonical type for schema validation
  const dataForValidation =
    canonicalType !== userType ? { ...data, type: canonicalType } : data;

  const result = schema.safeParse(dataForValidation);
  if (result.success) {
    const updated = typeof data.updated === "string" ? data.updated : null;
    const summarisedAt = typeof data.summarisedAt === "string" ? data.summarisedAt : null;
    if (updated && summarisedAt && summarisedAt < updated) {
      issues.push({
        severity: "warning",
        code: IssueCode.FM_STALE_SUMMARY,
        message: `Summary not updated since last edit (summarisedAt: ${summarisedAt}, updated: ${updated})`,
        path: ["summarisedAt"],
        suggestion: "Regenerate the summary to reflect recent changes",
      });
    }
    return issues;
  }

  const schemaIssues = (result.error as ZodError).issues.map(mapZodIssue);
  return [...issues, ...schemaIssues];
}
