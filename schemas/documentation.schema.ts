import { z } from "zod";
import { baseFields } from "./base.js";

export const documentationSchema = z
  .object({
    type: z.literal("documentation").describe("Document type discriminator"),
    id: z.string().min(1).describe("Unique documentation identifier (e.g. doc-1)"),
    title: z.string().min(1).describe("Human-readable document title"),
    status: z
      .enum(["draft", "review", "published", "deprecated"])
      .describe("Authoring lifecycle: draft → review → published → deprecated"),
    ...baseFields,
  })
  .strict()
  .describe("A documentation document — primary written output child of a project");

export type Documentation = z.infer<typeof documentationSchema>;
