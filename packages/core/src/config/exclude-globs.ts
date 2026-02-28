import micromatch from "micromatch";

/**
 * Returns true if the given file path (relative to vault root) matches
 * any of the provided glob patterns and should be excluded from scanning.
 *
 * NOTE: Directory-level patterns (e.g. `_templates/**`) match both files inside the
 * directory AND the bare directory path itself (micromatch `**` matches zero or more
 * path segments). In practice this has no effect since the walker only passes `.md` file
 * paths here, not directory names — but be aware when reasoning about pattern coverage.
 */
export function shouldExcludeFile(relativePath: string, excludeGlobs: string[]): boolean {
  if (excludeGlobs.length === 0) return false;
  return micromatch.isMatch(relativePath, excludeGlobs);
}
