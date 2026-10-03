export class TaskNotFoundError extends Error {
  constructor(readonly taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = "TaskNotFoundError";
  }
}

export class CompletedTaskRemovalError extends Error {
  constructor(readonly taskId: string) {
    super(`Cannot remove completed task: ${taskId}`);
    this.name = "CompletedTaskRemovalError";
  }
}
