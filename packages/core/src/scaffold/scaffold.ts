import { getSchemaEntry } from "../schema/index.js";
import { stringifyFrontmatter } from "../autofix/yaml-util.js";
import type { SchemaEntry } from "../types/index.js";

export interface ScaffoldOptions {
  overrides?: Record<string, unknown>;
}

export interface ScaffoldResult {
  content: string;
  type: string;
}

function unwrapField(fieldDef: unknown): { _def: Record<string, unknown> } {
  const def = (fieldDef as { _def: Record<string, unknown> })._def;
  const typeName = def.typeName as string;

  if (typeName === "ZodDefault" || typeName === "ZodOptional") {
    return unwrapField(def.innerType);
  }
  return fieldDef as { _def: Record<string, unknown> };
}

function extractDefaultsDeep(entry: SchemaEntry): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  const shape = entry.schema.shape;

  for (const [key, fieldDef] of Object.entries(shape)) {
    const outerDef = (fieldDef as { _def: Record<string, unknown> })._def;
    const outerType = outerDef.typeName as string;

    // Skip optional fields (user fills them in)
    if (outerType === "ZodOptional") continue;

    const inner = unwrapField(fieldDef);
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

export function scaffold(
  typeName: string,
  options: ScaffoldOptions = {},
): ScaffoldResult {
  const entry = getSchemaEntry(typeName);
  if (!entry) {
    throw new Error(`Unknown schema type: "${typeName}"`);
  }

  const defaults = extractDefaultsDeep(entry);
  const data = { ...defaults, ...options.overrides };

  // Order keys according to schema key order
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

  return { content, type: typeName };
}
