import type { ZodsidianConfig } from "./config.types.js";

/**
 * Resolve a user-provided type to its canonical schema type using config mappings
 *
 * @param userType - The type string from frontmatter
 * @param config - Optional config with type mappings
 * @returns The canonical type (mapped if found, otherwise original)
 *
 * @example
 * ```ts
 * const config = { typeMappings: { "project-index": "project" } };
 * resolveType("project-index", config); // → "project"
 * resolveType("decision", config);      // → "decision" (no mapping)
 * resolveType("project", undefined);    // → "project" (no config)
 * ```
 */
export function resolveType(userType: string, config?: ZodsidianConfig): string {
  if (!config?.typeMappings) {
    return userType;
  }

  return config.typeMappings[userType] ?? userType;
}
