import { z } from "zod";
import { baseFields } from "./base.js";

export const specSchema = z
  .object({
    type: z.literal("spec").describe("Document type discriminator"),
    id: z.string().min(1).describe("Unique spec identifier (e.g. spec-1)"),
    title: z.string().min(1).describe("Feature or product area name"),
    status: z
      .enum(["draft", "ready", "building", "shipped"])
      .describe("Current spec state"),
    scope: z.string().optional().describe("What is and isn't included in this spec"),
    ...baseFields,
  })
  .strict()
  .describe(
    "A feature specification — captures what to build and why before implementation",
  );

export type Spec = z.infer<typeof specSchema>;
