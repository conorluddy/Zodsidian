export { applyFixes, type FixOptions, type FixResult } from "./fix-engine.js";
export { sortKeys } from "./key-order.js";
export {
  normalizeTags,
  sortKeysBySchema,
  removeUnknownKeys,
  populateMissingFields,
  type FixStrategy,
} from "./strategies.js";
