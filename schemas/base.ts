import { z } from "zod";

export const baseFields = {
  summary: z
    .string()
    .min(80)
    .max(280)
    .describe(
      "Concise document summary (80–280 chars). Used for progressive disclosure — exposed before full content is loaded. Keep it current with the document.",
    ),
  projects: z
    .array(z.string())
    .default([])
    .describe("Parent project IDs this document belongs to"),
  tags: z.array(z.string()).default([]).describe("Freeform classification tags"),
  created: z.string().date().describe("ISO date when document was created"),
  updated: z.string().date().describe("ISO date of last update"),
  summarisedAt: z
    .string()
    .date()
    .describe(
      "ISO date the summary was last written or regenerated. If older than updated, the summary may be stale.",
    ),
};
