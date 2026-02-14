import type { SchemaDefinition } from "../types/index.js";

const registry = new Map<string, SchemaDefinition>();

export function registerSchema(type: string, schema: SchemaDefinition): void {
  registry.set(type, schema);
}

export function getSchema(type: string): SchemaDefinition | undefined {
  return registry.get(type);
}

export function getRegisteredTypes(): string[] {
  return [...registry.keys()];
}

export function clearRegistry(): void {
  registry.clear();
}
