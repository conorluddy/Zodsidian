import { projectSchema, decisionSchema, ideaSchema } from "@zodsidian/schemas";
import { registerSchema } from "./registry.js";

export function loadSchemas(): void {
  registerSchema("project", projectSchema, {
    idField: "id",
    referenceFields: ["projects"],
  });
  registerSchema("decision", decisionSchema, {
    idField: "id",
    referenceFields: ["projects"],
  });
  registerSchema("idea", ideaSchema, {
    idField: "id",
    referenceFields: ["projects"],
  });
}
