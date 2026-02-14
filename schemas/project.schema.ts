import { z } from "zod";

export const projectSchema = z
  .object({
    type: z.literal("project"),
    id: z.string().min(1),
    title: z.string().min(1),
    status: z.enum(["active", "paused", "completed", "archived"]),
    tags: z.array(z.string()).default([]),
    created: z.string().date().optional(),
    updated: z.string().date().optional(),
  })
  .strict();

export type Project = z.infer<typeof projectSchema>;
