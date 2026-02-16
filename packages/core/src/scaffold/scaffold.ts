import { getSchemaEntry } from "../schema/index.js";
import { stringifyFrontmatter } from "../autofix/yaml-util.js";
import type { Result, SchemaEntry } from "../types/index.js";

export interface ScaffoldOptions {
  overrides?: Record<string, unknown>;
}

export interface ScaffoldResult {
  content: string;
  type: string;
}

export type ScaffoldError = {
  code: "UNKNOWN_TYPE";
  message: string;
};

// ========================================
// PUBLIC API
// ========================================

export function scaffold(
  typeName: string,
  options: ScaffoldOptions = {},
): Result<ScaffoldResult, ScaffoldError> {
  const entry = getSchemaEntry(typeName);
  if (!entry) {
    return {
      ok: false,
      error: {
        code: "UNKNOWN_TYPE",
        message: `Unknown schema type: "${typeName}". Register it via loadSchemas() or registerSchema().`,
      },
    };
  }

  const defaults = extractSchemaDefaults(entry);
  const data = { ...defaults, ...options.overrides };

  const ordered: Record<string, unknown> = {};
  const keyOrder = entry.keyOrder ?? Object.keys(data);
  for (const key of keyOrder) {
    if (key in data) {
      ordered[key] = data[key];
    }
  }
  for (const key of Object.keys(data)) {
    if (!(key in ordered)) {
      ordered[key] = data[key];
    }
  }

  const yaml = stringifyFrontmatter(ordered);
  const content = `---\n${yaml}\n---\n`;

  return { ok: true, value: { content, type: typeName } };
}

// ========================================
// HELPERS
// ========================================

/**
 * Walk a Zod schema's shape and extract sensible defaults for each field.
 *
 * Accesses Zod's internal `_def` structure because there is no public API
 * for introspecting field types and defaults. If Zod's internals change,
 * this function is the single place that needs updating.
 */
function extractSchemaDefaults(entry: SchemaEntry): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  const shape = entry.schema.shape;

  for (const [key, fieldDef] of Object.entries(shape)) {
    const outerDef = (fieldDef as { _def: Record<string, unknown> })._def;
    const outerType = outerDef.typeName as string;

    if (outerType === "ZodOptional") continue;

    const inner = resolveInnerType(fieldDef);
    const innerDef = inner._def;
    const innerType = innerDef.typeName as string;

    if (innerType === "ZodLiteral") {
      defaults[key] = innerDef.value;
    } else if (outerType === "ZodDefault") {
      defaults[key] = (outerDef.defaultValue as () => unknown)();
    } else if (innerType === "ZodEnum") {
      defaults[key] = (innerDef.values as string[])[0];
    } else if (innerType === "ZodArray") {
      defaults[key] = [];
    } else {
      defaults[key] = "";
    }
  }

  return defaults;
}

/** Unwrap ZodDefault/ZodOptional wrappers to find the leaf Zod type. */
function resolveInnerType(fieldDef: unknown): { _def: Record<string, unknown> } {
  const def = (fieldDef as { _def: Record<string, unknown> })._def;
  const typeName = def.typeName as string;

  if (typeName === "ZodDefault" || typeName === "ZodOptional") {
    return resolveInnerType(def.innerType);
  }
  return fieldDef as { _def: Record<string, unknown> };
}
