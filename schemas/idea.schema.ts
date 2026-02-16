import { z } from "zod";
import { baseFields } from "./base.js";

export const ideaSchema = z
  .object({
    type: z.literal("idea").describe("Document type discriminator"),
    id: z.string().min(1).describe("Unique idea identifier (e.g. idea-1)"),
    title: z.string().min(1).describe("Short summary of the idea"),
    status: z
      .enum(["draft", "proposed", "accepted", "rejected", "deferred"])
      .describe("Current evaluation state"),
    ...baseFields,
  })
  .strict()
  .describe("A captured idea — may evolve into a decision or project");

export type Idea = z.infer<typeof ideaSchema>;
