import { projectSchema } from "@zodsidian/schemas";
import { decisionSchema } from "@zodsidian/schemas";
import { registerSchema } from "./registry.js";
import type { SchemaDefinition } from "../types/index.js";

const builtInSchemas: Record<string, SchemaDefinition> = {
  project: projectSchema,
  decision: decisionSchema,
};

export function loadSchemas(): void {
  for (const [type, schema] of Object.entries(builtInSchemas)) {
    registerSchema(type, schema);
  }
}
