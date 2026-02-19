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

/**
 * Renames frontmatter keys in bulk. Only renames if the old key exists and
 * the new key does not — never overwrites existing data.
 */
export const renameFields = (renames: Record<string, string>): FixStrategy => {
  return (data) => {
    const result = { ...data };
    for (const [oldKey, newKey] of Object.entries(renames)) {
      if (oldKey in result && !(newKey in result)) {
        result[newKey] = result[oldKey];
        delete result[oldKey];
      }
    }
    return result;
  };
};

export const populateMissingFields: FixStrategy = (data) => {
  const typeName = typeof data.type === "string" ? data.type : undefined;
  const entry = typeName ? getSchemaEntry(typeName) : undefined;
  if (!entry) return data;

  const defaults = extractSchemaDefaults(entry);
  return { ...defaults, ...data };
};

/**
 * Infers the id field from `${type}-${slug(title)}` when the id field is
 * missing or empty. Designed to run before `populateMissingFields` so the
 * generated id survives the merge rather than being overwritten by the
 * empty-string default.
 */
export const inferIdFromTitle: FixStrategy = (data) => {
  const typeName = typeof data.type === "string" ? data.type : undefined;
  const entry = typeName ? getSchemaEntry(typeName) : undefined;
  if (!entry) return data;

  const idField = entry.idField ?? "id";
  const currentId = data[idField];

  // Skip if id already has a non-empty value
  if (typeof currentId === "string" && currentId.length > 0) return data;

  const title = typeof data.title === "string" ? data.title : undefined;
  if (!title || title.length === 0) return data;

  return { ...data, [idField]: `${typeName}-${slugify(title)}` };
};

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
