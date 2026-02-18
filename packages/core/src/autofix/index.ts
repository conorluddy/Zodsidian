export { applyFixes, type FixOptions, type FixResult } from "./fix-engine.js";
export { sortKeys } from "./key-order.js";
export {
  normalizeArrayFields,
  sortKeysBySchema,
  removeUnknownKeys,
  populateMissingFields,
  type FixStrategy,
} from "./strategies.js";
export { stringifyFrontmatter } from "./yaml-util.js";
