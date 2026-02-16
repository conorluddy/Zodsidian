import type { SchemaDefinition, SchemaEntry } from "../types/index.js";

const registry = new Map<string, SchemaEntry>();

export function registerSchema(
  type: string,
  schema: SchemaDefinition,
  options?: { referenceFields?: string[]; keyOrder?: string[] },
): void {
  registry.set(type, {
    type,
    schema,
    referenceFields: options?.referenceFields,
    keyOrder: options?.keyOrder ?? Object.keys(schema.shape),
  });
}

export function getSchema(type: string): SchemaDefinition | undefined {
  return registry.get(type)?.schema;
}

export function getSchemaEntry(type: string): SchemaEntry | undefined {
  return registry.get(type);
}

export function getRegisteredTypes(): string[] {
  return [...registry.keys()];
}

export function clearRegistry(): void {
  registry.clear();
}
