import type { Task } from "../domain/task.js";

export interface TaskStore {
  readAll(): Promise<Task[]>;
  update(
    updateTasks: (tasks: readonly Task[]) => readonly Task[],
  ): Promise<Task[]>;
}
