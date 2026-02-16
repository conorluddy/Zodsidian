import { z } from "zod";

export const ideaSchema = z
  .object({
    type: z.literal("idea").describe("Document type discriminator"),
    id: z.string().min(1).describe("Unique idea identifier (e.g. idea-1)"),
    title: z.string().min(1).describe("Short summary of the idea"),
    status: z
      .enum(["draft", "proposed", "accepted", "rejected", "deferred"])
      .describe("Current evaluation state"),
    projectId: z
      .string()
      .min(1)
      .optional()
      .describe("ID of the parent project (optional — ideas can be unattached)"),
    tags: z.array(z.string()).default([]).describe("Freeform classification tags"),
    created: z.string().date().optional().describe("ISO date when idea was captured"),
  })
  .strict()
  .describe("A captured idea — may evolve into a decision or project");

export type Idea = z.infer<typeof ideaSchema>;
