import type { ZodObject, ZodRawShape } from "zod";

export type SchemaDefinition = ZodObject<ZodRawShape>;

export interface SchemaEntry {
  type: string;
  schema: SchemaDefinition;
  referenceFields?: string[];
  keyOrder?: string[];
}
