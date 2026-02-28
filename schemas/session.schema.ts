import { z } from "zod";
import { baseFields } from "./base.js";

export const sessionSchema = z
  .object({
    type: z.literal("session").describe("Document type discriminator"),
    id: z
      .string()
      .min(1)
      .describe("Unique session identifier (e.g. session-proj-auth-refactor)"),
    title: z.string().min(1).describe("Human-readable session title"),
    date: z.string().date().describe("ISO date the session took place"),
    ...baseFields,
  })
  .strict()
  .describe("A work session log — retrospective record of a Claude Code session");

export type Session = z.infer<typeof sessionSchema>;
