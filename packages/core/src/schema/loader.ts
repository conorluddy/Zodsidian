import {
  projectSchema,
  decisionSchema,
  brainstormSchema,
  planSchema,
  spikeSchema,
  taskSchema,
  specSchema,
  bugSchema,
  releaseSchema,
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
  registerSchema("brainstorm", brainstormSchema, {
    idField: "id",
    referenceFields: ["projects"],
    keyOrder: ["type", "id", "title", "status", "projects", "tags", "created", "updated"],
  });
  registerSchema("plan", planSchema, {
    idField: "id",
    referenceFields: ["projects"],
    keyOrder: ["type", "id", "title", "status", "projects", "tags", "created", "updated"],
  });
  registerSchema("spike", spikeSchema, {
    idField: "id",
    referenceFields: ["projects"],
    keyOrder: [
      "type",
      "id",
      "title",
      "status",
      "timebox",
      "findings",
      "projects",
      "tags",
      "created",
      "updated",
    ],
  });
  registerSchema("task", taskSchema, {
    idField: "id",
    referenceFields: ["projects"],
    keyOrder: [
      "type",
      "id",
      "title",
      "status",
      "priority",
      "kind",
      "agent",
      "branch",
      "pr",
      "projects",
      "tags",
      "created",
      "updated",
    ],
  });
  registerSchema("spec", specSchema, {
    idField: "id",
    referenceFields: ["projects"],
    keyOrder: [
      "type",
      "id",
      "title",
      "status",
      "scope",
      "projects",
      "tags",
      "created",
      "updated",
    ],
  });
  registerSchema("bug", bugSchema, {
    idField: "id",
    referenceFields: ["projects"],
    keyOrder: [
      "type",
      "id",
      "title",
      "status",
      "severity",
      "environment",
      "steps_to_reproduce",
      "projects",
      "tags",
      "created",
      "updated",
    ],
  });
  registerSchema("release", releaseSchema, {
    idField: "id",
    referenceFields: ["projects"],
    keyOrder: [
      "type",
      "id",
      "title",
      "version",
      "status",
      "projects",
      "tags",
      "created",
      "updated",
    ],
  });
}
