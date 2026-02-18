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
    platforms: z
      .array(z.string())
      .optional()
      .describe("Target platforms (e.g. ios, web, cli)"),
    ios_repo: z.string().optional().describe("Path or URL to the iOS repository"),
    web_repo: z.string().optional().describe("Path or URL to the web repository"),
    ...baseFields,
  })
  .strict()
  .describe("A project — the top-level organizational unit in the vault");

export type Project = z.infer<typeof projectSchema>;
