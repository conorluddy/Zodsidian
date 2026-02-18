import {
  projectSchema,
  decisionSchema,
  ideaSchema,
  planSchema,
} from "@zodsidian/schemas";
import { registerSchema } from "./registry.js";

export function loadSchemas(): void {
  registerSchema("project", projectSchema, {
    idField: "id",
    referenceFields: ["projects"],
    keyOrder: [
      "type",
      "id",
      "title",
      "status",
      "platforms",
      "ios_repo",
      "web_repo",
      "projects",
      "tags",
      "created",
      "updated",
    ],
  });
  registerSchema("decision", decisionSchema, {
    idField: "id",
    referenceFields: ["projects"],
  });
  registerSchema("idea", ideaSchema, {
    idField: "id",
    referenceFields: ["projects"],
  });
  registerSchema("plan", planSchema, {
    idField: "id",
    referenceFields: ["projects"],
    keyOrder: ["type", "id", "title", "status", "projects", "tags", "created", "updated"],
  });
}
