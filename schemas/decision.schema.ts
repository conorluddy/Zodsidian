import { z } from "zod";

export const decisionSchema = z
  .object({
    type: z.literal("decision"),
    id: z.string().min(1),
    title: z.string().min(1),
    projectId: z.string().min(1),
    decisionDate: z.string().date(),
    outcome: z.string().min(1),
    tags: z.array(z.string()).default([]),
  })
  .strict();

export type Decision = z.infer<typeof decisionSchema>;
