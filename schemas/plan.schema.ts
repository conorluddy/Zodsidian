import { z } from "zod";
import { baseFields } from "./base.js";

export const planSchema = z
  .object({
    type: z.literal("plan").describe("Document type discriminator"),
    id: z.string().min(1).describe("Unique plan identifier (e.g. plan-1)"),
    title: z.string().min(1).describe("Human-readable plan title"),
    status: z
      .enum(["draft", "approved", "done"])
      .default("draft")
      .describe("Plan lifecycle: draft → approved → done"),
    ...baseFields,
  })
  .strict()
  .describe("A plan — captures implementation strategy for a feature or task");

export type Plan = z.infer<typeof planSchema>;
