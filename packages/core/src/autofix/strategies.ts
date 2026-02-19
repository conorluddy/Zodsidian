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

/**
 * Infers the id field from `${type}-${slug(filename)}` when the id field is
 * still missing or empty after `inferIdFromTitle` has run. Accepts the file's
 * full path and strips the directory + extension to get the bare filename slug.
 *
 * Usage: `inferIdFromPath("/path/to/Grapla.md")` → strategy that sets `id`
 * to `"project-grapla"` when `type: project` and id is blank.
 */
export function inferIdFromPath(filePath: string): FixStrategy {
  return (data) => {
    const typeName = typeof data.type === "string" ? data.type : undefined;
    const entry = typeName ? getSchemaEntry(typeName) : undefined;
    if (!entry) return data;

    const idField = entry.idField ?? "id";
    const currentId = data[idField];

    // Only run if id is still missing or empty (inferIdFromTitle already set it otherwise)
    if (typeof currentId === "string" && currentId.length > 0) return data;

    const filename =
      filePath
        .split("/")
        .pop()
        ?.replace(/\.[^.]+$/, "") ?? "";
    if (!filename) return data;

    return { ...data, [idField]: `${typeName}-${slugify(filename)}` };
  };
}

/**
 * Infers the title field from the filename when title is missing or empty.
 * Strips the extension, replaces hyphens/underscores with spaces, and
 * applies sentence case (capitalise first character, lowercase the rest).
 *
 * Usage: `inferTitleFromPath("/vault/Grapla/Grapla.md")` → sets `title`
 * to `"Grapla"` when title is blank.
 */
export function inferTitleFromPath(filePath: string): FixStrategy {
  return (data) => {
    const typeName = typeof data.type === "string" ? data.type : undefined;
    const entry = typeName ? getSchemaEntry(typeName) : undefined;
    if (!entry || !("title" in entry.schema.shape)) return data;

    const currentTitle = data.title;
    if (typeof currentTitle === "string" && currentTitle.length > 0) return data;

    const stem =
      filePath
        .split("/")
        .pop()
        ?.replace(/\.[^.]+$/, "") ?? "";
    if (!stem) return data;

    const title = toSentenceCase(stem.replace(/[-_]+/g, " "));
    return { ...data, title };
  };
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toSentenceCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
