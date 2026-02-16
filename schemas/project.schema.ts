import { z } from "zod";
import { baseFields } from "./base.js";

export const projectSchema = z
  .object({
    type: z.literal("project").describe("Document type discriminator"),
    id: z.string().min(1).describe("Unique project identifier (e.g. proj-1)"),
    title: z.string().min(1).describe("Human-readable project name"),
    status: z
      .enum(["active", "paused", "completed", "archived"])
      .describe("Current lifecycle state"),
    ...baseFields,
  })
  .strict()
  .describe("A project — the top-level organizational unit in the vault");

export type Project = z.infer<typeof projectSchema>;
