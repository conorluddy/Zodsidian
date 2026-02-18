import { z } from "zod";
import { baseFields } from "./base.js";

export const taskSchema = z
  .object({
    type: z.literal("task").describe("Document type discriminator"),
    id: z.string().min(1).describe("Unique task identifier (e.g. task-1)"),
    title: z.string().min(1).describe("What needs to be done"),
    status: z
      .enum(["todo", "in-progress", "done", "cancelled"])
      .describe("Current work state"),
    priority: z
      .enum(["low", "medium", "high", "critical"])
      .optional()
      .describe("Task priority level"),
    kind: z
      .enum(["feature", "bug", "chore", "spike"])
      .optional()
      .describe("Category of work"),
    agent: z.string().optional().describe("AI agent name or ID that worked on this task"),
    branch: z.string().optional().describe("Git branch associated with this task"),
    pr: z.string().optional().describe("PR number or URL"),
    ...baseFields,
  })
  .strict()
  .describe("A unit of planned work — also tracks AI agent execution metadata");

export type Task = z.infer<typeof taskSchema>;
