import { sortKeys } from "./key-order.js";
import { getSchemaEntry } from "../schema/index.js";
import { extractSchemaDefaults } from "../scaffold/index.js";

export type FixStrategy = (data: Record<string, unknown>) => Record<string, unknown>;

/**
 * Coerces scalar string values to single-element arrays for any field that
 * expects an array. Covers `tags` (always) and `referenceFields` from the
 * schema registry (e.g. `projects`). Handles the case where Obsidian writes
 * a plain string when the user enters a single value in a list property.
 */
export const normalizeArrayFields: FixStrategy = (data) => {
  const typeName = typeof data.type === "string" ? data.type : undefined;
  const entry = typeName ? getSchemaEntry(typeName) : undefined;

  const arrayFields = ["tags", ...(entry?.referenceFields ?? [])];

  const result = { ...data };
  for (const field of arrayFields) {
    if (field in result && typeof result[field] === "string") {
      result[field] = [result[field]];
    }
  }
  return result;
};

export const sortKeysBySchema: FixStrategy = (data) => {
  const typeName = typeof data.type === "string" ? data.type : undefined;
  const entry = typeName ? getSchemaEntry(typeName) : undefined;
  return sortKeys(data, entry?.keyOrder);
};

export const removeUnknownKeys = (allowedKeys: Set<string>): FixStrategy => {
  return (data) => {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (allowedKeys.has(key)) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  };
};

export const populateMissingFields: FixStrategy = (data) => {
  const typeName = typeof data.type === "string" ? data.type : undefined;
  const entry = typeName ? getSchemaEntry(typeName) : undefined;
  if (!entry) return data;

  const defaults = extractSchemaDefaults(entry);
  return { ...defaults, ...data };
};
