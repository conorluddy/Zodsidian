import { projectSchema, decisionSchema, ideaSchema } from "@zodsidian/schemas";
import { registerSchema } from "./registry.js";

export function loadSchemas(): void {
  registerSchema("project", projectSchema);
  registerSchema("decision", decisionSchema, {
    referenceFields: ["projectId"],
  });
  registerSchema("idea", ideaSchema, {
    referenceFields: ["projectId"],
  });
}
