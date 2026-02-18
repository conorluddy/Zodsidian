import { z } from "zod";
import { baseFields } from "./base.js";

export const releaseSchema = z
  .object({
    type: z.literal("release").describe("Document type discriminator"),
    id: z.string().min(1).describe("Unique release identifier (e.g. rel-1)"),
    title: z.string().min(1).describe("Release name or description"),
    version: z.string().min(1).describe("Version string (e.g. 1.2.0, v2024.01)"),
    status: z
      .enum(["planned", "in-progress", "shipped"])
      .describe("Current release state"),
    ...baseFields,
  })
  .strict()
  .describe("A version milestone — groups tasks and decisions under a version number");

export type Release = z.infer<typeof releaseSchema>;
