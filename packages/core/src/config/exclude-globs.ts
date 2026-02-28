import micromatch from "micromatch";

/**
 * Returns true if the given file path (relative to vault root) matches
 * any of the provided glob patterns and should be excluded from scanning.
 */
export function shouldExcludeFile(relativePath: string, excludeGlobs: string[]): boolean {
  if (excludeGlobs.length === 0) return false;
  return micromatch.isMatch(relativePath, excludeGlobs);
}
