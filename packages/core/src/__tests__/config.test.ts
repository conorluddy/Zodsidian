import { describe, it, expect } from "vitest";
import { parseConfig, resolveType, defaultConfig } from "../config/index.js";
import type { ZodsidianConfig } from "../config/index.js";

describe("Config", () => {
  describe("parseConfig", () => {
    it("parses valid config JSON", () => {
      const json = JSON.stringify({
        version: "1.0",
        typeMappings: {
          "project-index": "project",
          "decision-log": "decision",
        },
        validation: {
          warnOnMappedTypes: true,
        },
      });

      const config = parseConfig(json);

      expect(config.version).toBe("1.0");
      expect(config.typeMappings).toEqual({
        "project-index": "project",
        "decision-log": "decision",
      });
      expect(config.validation?.warnOnMappedTypes).toBe(true);
    });

    it("merges with defaults for missing optional fields", () => {
      const json = JSON.stringify({
        version: "1.0",
      });

      const config = parseConfig(json);

      expect(config.typeMappings).toEqual({});
      expect(config.validation?.warnOnMappedTypes).toBe(false);
    });

    it("throws on invalid JSON", () => {
      expect(() => parseConfig("not json")).toThrow("Failed to parse config JSON");
    });

    it("throws on invalid schema", () => {
      const json = JSON.stringify({
        version: 123, // Should be string
      });

      expect(() => parseConfig(json)).toThrow("Invalid config schema");
    });
  });

  describe("resolveType", () => {
    it("returns canonical type when mapping exists", () => {
      const config: ZodsidianConfig = {
        version: "1.0",
        typeMappings: {
          "project-index": "project",
          "decision-log": "decision",
        },
      };

      expect(resolveType("project-index", config)).toBe("project");
      expect(resolveType("decision-log", config)).toBe("decision");
    });

    it("returns original type when no mapping exists", () => {
      const config: ZodsidianConfig = {
        version: "1.0",
        typeMappings: {
          "project-index": "project",
        },
      };

      expect(resolveType("decision", config)).toBe("decision");
      expect(resolveType("idea", config)).toBe("idea");
    });

    it("returns original type when config is undefined", () => {
      expect(resolveType("project-index")).toBe("project-index");
      expect(resolveType("decision")).toBe("decision");
    });

    it("returns original type when typeMappings is undefined", () => {
      const config: ZodsidianConfig = {
        version: "1.0",
      };

      expect(resolveType("project-index", config)).toBe("project-index");
    });
  });

  describe("defaultConfig", () => {
    it("has correct default values", () => {
      expect(defaultConfig.version).toBe("1.0");
      expect(defaultConfig.typeMappings).toEqual({});
      expect(defaultConfig.validation?.warnOnMappedTypes).toBe(false);
    });
  });
});
