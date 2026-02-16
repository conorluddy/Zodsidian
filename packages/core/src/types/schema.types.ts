import type { ZodObject, ZodRawShape } from "zod";

export type SchemaDefinition = ZodObject<ZodRawShape>;

export interface SchemaEntry {
  type: string;
  schema: SchemaDefinition;
  /** Field name that holds this entity's unique identity. Defaults to "id". */
  idField?: string;
  /** Field names whose values reference other entities by ID (e.g. ["projects"]) */
  referenceFields?: string[];
  /** Desired key order in serialized YAML output. Defaults to schema shape key order. */
  keyOrder?: string[];
}
