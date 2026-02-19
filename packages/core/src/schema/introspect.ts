import { getRegisteredTypes, getSchemaEntry } from "./registry.js";

export interface FieldDescriptor {
  name: string;
  /** Zod type name of the innermost (unwrapped) type, e.g. "ZodString", "ZodEnum". */
  zodType: string;
  /** True when the field has no ZodOptional or ZodDefault outer wrapper. */
  required: boolean;
  /** From `.describe()` — present on every field in well-formed schemas. */
  description?: string;
  /** ZodLiteral only: the literal value. */
  literal?: unknown;
  /** ZodEnum only: allowed values. */
  values?: string[];
  /** ZodArray only: zodType of the array element. */
  items?: string;
}

export interface SchemaDescriptor {
  type: string;
  description?: string;
  idField?: string;
  referenceFields?: string[];
  fields: FieldDescriptor[];
}

export function introspectAllTypes(): string[] {
  return getRegisteredTypes().sort();
}

export function introspectSchema(typeName: string): SchemaDescriptor | undefined {
  const entry = getSchemaEntry(typeName);
  if (!entry) return undefined;

  const schemaDef = (entry.schema as unknown as { _def: Record<string, unknown> })._def;
  const description = schemaDef.description as string | undefined;

  const fields: FieldDescriptor[] = Object.entries(entry.schema.shape).map(
    ([name, fieldDef]) => describeField(name, fieldDef),
  );

  return {
    type: typeName,
    description,
    idField: entry.idField,
    referenceFields: entry.referenceFields,
    fields,
  };
}

// ========================================
// HELPERS
// ========================================

function describeField(name: string, fieldDef: unknown): FieldDescriptor {
  const outerDef = (fieldDef as { _def: Record<string, unknown> })._def;
  const outerType = outerDef.typeName as string;

  const required = outerType !== "ZodOptional" && outerType !== "ZodDefault";

  const inner = resolveInnerType(fieldDef);
  const innerDef = inner._def;
  const zodType = innerDef.typeName as string;

  // .describe() is called after wrappers (.optional(), .default()), so description lives on
  // outerDef. Fall back to innerDef for reversed chains (.describe().optional()).
  const description = (outerDef.description ?? innerDef.description) as
    | string
    | undefined;

  const descriptor: FieldDescriptor = { name, zodType, required, description };

  if (zodType === "ZodLiteral") {
    descriptor.literal = innerDef.value;
  } else if (zodType === "ZodEnum") {
    descriptor.values = innerDef.values as string[];
  } else if (zodType === "ZodArray") {
    const element = innerDef.type as { _def: Record<string, unknown> };
    descriptor.items = element._def.typeName as string;
  }

  return descriptor;
}

/** Unwrap ZodDefault/ZodOptional wrappers to find the leaf Zod type. */
function resolveInnerType(fieldDef: unknown): { _def: Record<string, unknown> } {
  const def = (fieldDef as { _def: Record<string, unknown> })._def;
  const typeName = def.typeName as string;

  if (typeName === "ZodDefault" || typeName === "ZodOptional") {
    return resolveInnerType(def.innerType);
  }
  return fieldDef as { _def: Record<string, unknown> };
}
