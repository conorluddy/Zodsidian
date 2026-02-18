import { describe, it, expect, beforeEach } from "vitest";
import {
  parseFrontmatter,
  extractSchemaDefaults,
  getSchemaEntry,
  loadSchemas,
  clearRegistry,
  stringifyFrontmatter,
} from "../index.js";

/**
 * Tests the core logic used by IngestService.convertFile:
 *   1. Parse existing content with parseFrontmatter
 *   2. Extract schema defaults with extractSchemaDefaults
 *   3. Merge: defaults < existing frontmatter < stamped type
 *   4. Reassemble with stringifyFrontmatter
 */
describe("ingest merge logic", () => {
  beforeEach(() => {
    clearRegistry();
    loadSchemas();
  });

  it("file with no frontmatter: body preserved, schema defaults stamped", () => {
    const content = "Just a plain note with no frontmatter.";
    const parsed = parseFrontmatter(content);

    const entry = getSchemaEntry("project")!;
    expect(entry).toBeDefined();

    const defaults = extractSchemaDefaults(entry);
    const existing =
      parsed.isValid && parsed.data ? (parsed.data as Record<string, unknown>) : {};

    const merged = { ...defaults, ...existing, type: "project" };

    expect(merged.type).toBe("project");
    expect(merged).toHaveProperty("id");
    expect(merged).toHaveProperty("title");
    expect(merged).toHaveProperty("status");

    // Body should be the full original content (no frontmatter was stripped)
    const body = parsed.isValid ? parsed.body : `\n\n${content}`;
    const yaml = stringifyFrontmatter(merged);
    const output = `---\n${yaml}\n---${body}`;

    expect(output).toContain("type: project");
    expect(output).toContain("Just a plain note with no frontmatter.");
  });

  it("file with partial frontmatter: existing fields preserved, missing filled from defaults", () => {
    const content = [
      "---",
      "title: My Existing Title",
      "tags:",
      "  - important",
      "---",
      "",
      "Some body content.",
    ].join("\n");

    const parsed = parseFrontmatter(content);
    expect(parsed.isValid).toBe(true);

    const entry = getSchemaEntry("project")!;
    const defaults = extractSchemaDefaults(entry);
    const existing = parsed.data as Record<string, unknown>;

    const merged: Record<string, unknown> = { ...defaults, ...existing, type: "project" };

    // Existing fields preserved
    expect(merged.title).toBe("My Existing Title");
    expect(merged.tags).toEqual(["important"]);
    // Missing fields filled from defaults
    expect(merged).toHaveProperty("id");
    expect(merged).toHaveProperty("status");
    // Type stamped
    expect(merged.type).toBe("project");

    const yaml = stringifyFrontmatter(merged);
    const output = `---\n${yaml}\n---${parsed.body}`;
    expect(output).toContain("title: My Existing Title");
    expect(output).toContain("Some body content.");
  });

  it("file with extra fields: extra fields preserved through merge", () => {
    const content = [
      "---",
      "title: Has Extras",
      "customField: custom-value",
      "anotherExtra: 42",
      "---",
      "",
      "Body here.",
    ].join("\n");

    const parsed = parseFrontmatter(content);
    expect(parsed.isValid).toBe(true);

    const entry = getSchemaEntry("idea")!;
    const defaults = extractSchemaDefaults(entry);
    const existing = parsed.data as Record<string, unknown>;

    const merged: Record<string, unknown> = { ...defaults, ...existing, type: "idea" };

    // Extra fields are preserved (they'll fail validation but aren't lost)
    expect(merged.customField).toBe("custom-value");
    expect(merged.anotherExtra).toBe(42);
    // Schema fields present
    expect(merged.title).toBe("Has Extras");
    expect(merged.type).toBe("idea");
  });
});
