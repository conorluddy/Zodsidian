import { z } from "zod";
import { baseFields } from "./base.js";

/**
 * Hub is intentionally an open schema — no `.strict()`, no `id`, optional `title`.
 * It acts as a navigation/index page, not a knowledge document, so contributors
 * may add arbitrary frontmatter fields. This is by design, not an oversight.
 */
export const hubSchema = z
  .object({
    type: z.literal("hub").describe("Document type discriminator"),
    title: z.string().optional().describe("Optional hub title"),
    ...baseFields,
  })
  .describe("A navigation/index hub page — not a knowledge document");

export type Hub = z.infer<typeof hubSchema>;
