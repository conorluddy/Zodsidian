import { describe, it, expect, beforeEach } from "vitest";
import { introspectAllTypes, introspectSchema } from "../schema/introspect.js";
import { clearRegistry, loadSchemas } from "../schema/index.js";

describe("introspectAllTypes", () => {
  beforeEach(() => {
    clearRegistry();
    loadSchemas();
  });

  it("returns all registered type names", () => {
    const types = introspectAllTypes();
    expect(types).toContain("project");
    expect(types).toContain("decision");
    expect(types).toContain("idea");
    expect(types).toContain("plan");
  });

  it("returns an alphabetically sorted array", () => {
    const types = introspectAllTypes();
    expect(types).toEqual([...types].sort());
  });
});

describe("introspectSchema", () => {
  beforeEach(() => {
    clearRegistry();
    loadSchemas();
  });

  it("returns undefined for unknown type", () => {
    expect(introspectSchema("unicorn")).toBeUndefined();
  });

  it("returns type-level metadata", () => {
    const d = introspectSchema("project")!;
    expect(d.type).toBe("project");
    expect(d.idField).toBe("id");
    expect(d.referenceFields).toContain("projects");
  });

  it("marks required fields correctly", () => {
    const d = introspectSchema("project")!;
    const required = d.fields.filter((f) => f.required).map((f) => f.name);
    expect(required).toContain("type");
    expect(required).toContain("id");
    expect(required).toContain("title");
    expect(required).toContain("status");
    expect(required).toContain("summary");
    expect(required).toContain("created");
    expect(required).toContain("updated");
    expect(required).toContain("summarisedAt");
  });

  it("marks optional fields correctly", () => {
    const d = introspectSchema("project")!;
    const optional = d.fields.filter((f) => !f.required).map((f) => f.name);
    expect(optional).toContain("platforms");
    expect(optional).toContain("ios_repo");
    expect(optional).toContain("tags");
  });

  it("extracts enum values for enum fields", () => {
    const d = introspectSchema("project")!;
    const status = d.fields.find((f) => f.name === "status")!;
    expect(status.zodType).toBe("ZodEnum");
    expect(status.values).toEqual(["active", "paused", "completed", "archived"]);
  });

  it("identifies literal fields with their value", () => {
    const d = introspectSchema("project")!;
    const typeField = d.fields.find((f) => f.name === "type")!;
    expect(typeField.zodType).toBe("ZodLiteral");
    expect(typeField.literal).toBe("project");
  });

  it("identifies array fields with item type", () => {
    const d = introspectSchema("project")!;
    const tags = d.fields.find((f) => f.name === "tags")!;
    expect(tags.zodType).toBe("ZodArray");
    expect(tags.items).toBe("ZodString");
  });

  it("includes .describe() descriptions on fields", () => {
    const d = introspectSchema("project")!;
    for (const field of d.fields) {
      expect(typeof field.description).toBe("string");
      expect(field.description!.length).toBeGreaterThan(0);
    }
  });

  it("works for decision type (different required fields)", () => {
    const d = introspectSchema("decision")!;
    const required = d.fields.filter((f) => f.required).map((f) => f.name);
    expect(required).toContain("decisionDate");
    expect(required).toContain("outcome");
  });
});
