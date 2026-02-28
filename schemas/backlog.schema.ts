import { z } from "zod";
import { baseFields } from "./base.js";

export const backlogSchema = z
  .object({
    type: z.literal("backlog").describe("Document type discriminator"),
    id: z.string().min(1).describe("Unique backlog identifier (e.g. backlog-zodsidian)"),
    title: z.string().min(1).describe("Human-readable backlog title"),
    status: z
      .enum(["open", "active", "done"])
      .default("open")
      .describe("Backlog lifecycle: open → active → done"),
    ...baseFields,
  })
  .strict()
  .describe("A project backlog — tracks open work items for a project");

export type Backlog = z.infer<typeof backlogSchema>;
