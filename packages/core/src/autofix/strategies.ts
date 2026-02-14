import { sortKeys } from "./key-order.js";

export type FixStrategy = (data: Record<string, unknown>) => Record<string, unknown>;

export const normalizeTags: FixStrategy = (data) => {
  if ("tags" in data && typeof data.tags === "string") {
    return { ...data, tags: [data.tags] };
  }
  return data;
};

export const sortKeysStrategy: FixStrategy = (data) => {
  return sortKeys(data);
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
