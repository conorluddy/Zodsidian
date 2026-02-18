import { z } from "zod";
import { baseFields } from "./base.js";

export const spikeSchema = z
  .object({
    type: z.literal("spike").describe("Document type discriminator"),
    id: z.string().min(1).describe("Unique spike identifier (e.g. spike-1)"),
    title: z.string().min(1).describe("What is being investigated"),
    status: z.enum(["open", "done", "abandoned"]).describe("Current investigation state"),
    timebox: z
      .string()
      .optional()
      .describe("Time limit for this investigation (e.g. 2h, 1d)"),
    findings: z
      .string()
      .optional()
      .describe("Outcome and learnings from the investigation"),
    ...baseFields,
  })
  .strict()
  .describe("A time-boxed technical investigation with a clear outcome");

export type Spike = z.infer<typeof spikeSchema>;
