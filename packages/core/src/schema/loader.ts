import {
  projectSchema,
  decisionSchema,
  ideaSchema,
  planSchema,
  documentationSchema,
  sessionSchema,
  backlogSchema,
  hubSchema,
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
      "summary",
      "status",
      "platforms",
      "ios_repo",
      "web_repo",
      "projects",
      "tags",
      "created",
      "updated",
      "summarisedAt",
    ],
  });
  registerSchema("decision", decisionSchema, {
    idField: "id",
    referenceFields: ["projects"],
    keyOrder: [
      "type",
      "id",
      "title",
      "summary",
      "decisionDate",
      "outcome",
      "projects",
      "tags",
      "created",
      "updated",
      "summarisedAt",
    ],
  });
  registerSchema("idea", ideaSchema, {
    idField: "id",
    referenceFields: ["projects"],
    keyOrder: [
      "type",
      "id",
      "title",
      "summary",
      "status",
      "projects",
      "tags",
      "created",
      "updated",
      "summarisedAt",
    ],
  });
  registerSchema("plan", planSchema, {
    idField: "id",
    referenceFields: ["projects"],
    keyOrder: [
      "type",
      "id",
      "title",
      "summary",
      "status",
      "projects",
      "tags",
      "created",
      "updated",
      "summarisedAt",
    ],
  });
  registerSchema("documentation", documentationSchema, {
    idField: "id",
    referenceFields: ["projects"],
    keyOrder: [
      "type",
      "id",
      "title",
      "summary",
      "status",
      "projects",
      "tags",
      "created",
      "updated",
      "summarisedAt",
    ],
  });
  registerSchema("session", sessionSchema, {
    idField: "id",
    referenceFields: ["projects"],
    keyOrder: [
      "type",
      "id",
      "title",
      "summary",
      "date",
      "projects",
      "tags",
      "created",
      "updated",
      "summarisedAt",
    ],
  });
  registerSchema("backlog", backlogSchema, {
    idField: "id",
    referenceFields: ["projects"],
    keyOrder: [
      "type",
      "id",
      "title",
      "summary",
      "status",
      "projects",
      "tags",
      "created",
      "updated",
      "summarisedAt",
    ],
  });
  registerSchema("hub", hubSchema, {
    referenceFields: ["projects"],
    keyOrder: [
      "type",
      "title",
      "summary",
      "projects",
      "tags",
      "created",
      "updated",
      "summarisedAt",
    ],
  });
}
