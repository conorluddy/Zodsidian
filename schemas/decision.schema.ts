import { z } from "zod";

export const decisionSchema = z
  .object({
    type: z.literal("decision").describe("Document type discriminator"),
    id: z.string().min(1).describe("Unique decision identifier (e.g. dec-1)"),
    title: z.string().min(1).describe("Short summary of the decision"),
    projectId: z
      .string()
      .min(1)
      .describe("ID of the parent project this decision belongs to"),
    decisionDate: z.string().date().describe("ISO date when the decision was made"),
    outcome: z.string().min(1).describe("What was decided"),
    tags: z.array(z.string()).default([]).describe("Freeform classification tags"),
  })
  .strict()
  .describe("A recorded decision linked to a project");

export type Decision = z.infer<typeof decisionSchema>;
