import { z } from "zod";

export const baseFields = {
  projects: z
    .array(z.string())
    .default([])
    .describe("Parent project IDs this document belongs to"),
  tags: z.array(z.string()).default([]).describe("Freeform classification tags"),
  created: z.string().date().optional().describe("ISO date when document was created"),
  updated: z.string().date().optional().describe("ISO date of last update"),
};
