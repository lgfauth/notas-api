import assert from "node:assert/strict";
import test from "node:test";
import {
  CompletedTaskRemovalError,
  TaskNotFoundError,
} from "./task-errors.js";

test("TaskNotFoundError exposes the missing task ID", () => {
  const error = new TaskNotFoundError("missing-id");

  assert.equal(error.name, "TaskNotFoundError");
  assert.equal(error.taskId, "missing-id");
  assert.equal(error.message, "Task not found: missing-id");
  assert.ok(error instanceof Error);
});

test("CompletedTaskRemovalError exposes the task ID and reason", () => {
  const error = new CompletedTaskRemovalError("completed-id");

  assert.equal(error.name, "CompletedTaskRemovalError");
  assert.equal(error.taskId, "completed-id");
  assert.equal(error.message, "Cannot remove completed task: completed-id");
  assert.ok(error instanceof Error);
});
