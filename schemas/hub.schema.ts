import { z } from "zod";
import { baseFields } from "./base.js";

export const hubSchema = z
  .object({
    type: z.literal("hub").describe("Document type discriminator"),
    title: z.string().optional().describe("Optional hub title"),
    ...baseFields,
  })
  .describe("A navigation/index hub page — not a knowledge document");

export type Hub = z.infer<typeof hubSchema>;
