import { z } from "zod";

export const taskIdSchema = z.uuid();

export const taskTitleSchema = z.string().trim().min(1, {
  message: "Task title must not be empty",
});

export const taskStatusSchema = z.enum(["open", "done"]);

export const INITIAL_TASK_STATUS = "open" satisfies z.infer<
  typeof taskStatusSchema
>;

export const taskFilterSchema = z.enum(["all", "open", "done"]);

export const taskSchema = z.object({
  id: taskIdSchema,
  title: taskTitleSchema,
  status: taskStatusSchema,
});

export type Task = z.infer<typeof taskSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskFilter = z.infer<typeof taskFilterSchema>;
