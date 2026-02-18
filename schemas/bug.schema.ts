import { z } from "zod";
import { baseFields } from "./base.js";

export const bugSchema = z
  .object({
    type: z.literal("bug").describe("Document type discriminator"),
    id: z.string().min(1).describe("Unique bug identifier (e.g. bug-1)"),
    title: z.string().min(1).describe("Brief description of the defect"),
    status: z
      .enum(["open", "investigating", "fixed", "wontfix"])
      .describe("Current defect state"),
    severity: z
      .enum(["low", "medium", "high", "critical"])
      .optional()
      .describe("Impact level of the bug"),
    environment: z.string().optional().describe("e.g. iOS 17, prod, Safari 17"),
    steps_to_reproduce: z.string().optional().describe("Steps to reproduce the bug"),
    ...baseFields,
  })
  .strict()
  .describe("A defect report with reproduction context");

export type Bug = z.infer<typeof bugSchema>;
