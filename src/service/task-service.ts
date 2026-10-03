import { randomUUID } from "node:crypto";
import {
  INITIAL_TASK_STATUS,
  taskSchema,
  taskTitleSchema,
  type Task,
  type TaskFilter,
} from "../domain/task.js";
import {
  CompletedTaskRemovalError,
  TaskNotFoundError,
} from "../domain/task-errors.js";
import type { TaskStore } from "../store/task-store.js";

export class TaskService {
  constructor(
    private readonly store: TaskStore,
    private readonly createId: () => string = randomUUID,
  ) {}

  async create(title: string): Promise<Task> {
    const normalizedTitle = taskTitleSchema.parse(title);
    let createdTask: Task | undefined;

    await this.store.update((tasks) => {
      let id = this.createId();
      while (tasks.some((task) => task.id === id)) {
        id = this.createId();
      }

      createdTask = taskSchema.parse({
        id,
        title: normalizedTitle,
        status: INITIAL_TASK_STATUS,
      });
      return [...tasks, createdTask];
    });

    if (!createdTask) {
      throw new Error("Task store update did not create a task");
    }
    return createdTask;
  }

  async list(filter: TaskFilter = "all"): Promise<Task[]> {
    const tasks = await this.store.readAll();
    if (filter === "all") {
      return tasks;
    }
    return tasks.filter((task) => task.status === filter);
  }

  async complete(taskId: string): Promise<Task> {
    let completedTask: Task | undefined;

    await this.store.update((tasks) => {
      const task = tasks.find((candidate) => candidate.id === taskId);
      if (!task) {
        throw new TaskNotFoundError(taskId);
      }

      if (task.status === "done") {
        completedTask = task;
        return tasks;
      }

      const updatedTask: Task = { ...task, status: "done" };
      completedTask = updatedTask;
      return tasks.map((candidate) =>
        candidate.id === taskId ? updatedTask : candidate,
      );
    });

    if (!completedTask) {
      throw new Error("Task store update did not complete a task");
    }
    return completedTask;
  }

  async remove(taskId: string): Promise<void> {
    await this.store.update((tasks) => {
      const task = tasks.find((candidate) => candidate.id === taskId);
      if (!task) {
        throw new TaskNotFoundError(taskId);
      }
      if (task.status === "done") {
        throw new CompletedTaskRemovalError(taskId);
      }

      return tasks.filter((candidate) => candidate.id !== taskId);
    });
  }
}
