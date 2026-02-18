import { z } from "zod";
import { baseFields } from "./base.js";

export const brainstormSchema = z
  .object({
    type: z.literal("brainstorm").describe("Document type discriminator"),
    id: z.string().min(1).describe("Unique brainstorm identifier (e.g. brain-1)"),
    title: z.string().min(1).describe("Short summary of the captured thought"),
    status: z
      .enum(["draft", "proposed", "accepted", "rejected", "deferred"])
      .describe("Current evaluation state"),
    ...baseFields,
  })
  .strict()
  .describe("A raw captured thought — may evolve into a decision, spec, or project");

export type Brainstorm = z.infer<typeof brainstormSchema>;
