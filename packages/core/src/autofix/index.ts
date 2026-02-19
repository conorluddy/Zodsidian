export { applyFixes, type FixOptions, type FixResult } from "./fix-engine.js";
export { sortKeys } from "./key-order.js";
export {
  normalizeArrayFields,
  sortKeysBySchema,
  removeUnknownKeys,
  populateMissingFields,
  inferIdFromTitle,
  inferIdFromPath,
  inferTitleFromPath,
  renameFields,
  type FixStrategy,
} from "./strategies.js";
export { stringifyFrontmatter } from "./yaml-util.js";
