import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { Task } from "../domain/task.js";
import {
  CompletedTaskRemovalError,
  TaskNotFoundError,
} from "../domain/task-errors.js";
import type { TaskStore } from "../store/task-store.js";
import { TaskService } from "./task-service.js";

class InMemoryTaskStore implements TaskStore {
  private tasks: Task[] = [];

  async readAll(): Promise<Task[]> {
    return structuredClone(this.tasks);
  }

  async update(
    updateTasks: (tasks: readonly Task[]) => readonly Task[],
  ): Promise<Task[]> {
    const updated = updateTasks(structuredClone(this.tasks));
    this.tasks = structuredClone([...updated]);
    return structuredClone(this.tasks);
  }
}

test("creates tasks with unique IDs, trimmed titles, and open status", async () => {
  const store = new InMemoryTaskStore();
  const service = new TaskService(store);

  const first = await service.create("  Write tests  ");
  const second = await service.create("Review code");

  assert.notEqual(first.id, second.id);
  assert.match(first.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.equal(first.title, "Write tests");
  assert.equal(first.status, "open");
  assert.equal(second.status, "open");
});

test("retries an ID already used by an existing task", async () => {
  const store = new InMemoryTaskStore();
  const firstId = randomUUID();
  const secondId = randomUUID();
  const ids = [firstId, firstId, secondId];
  const service = new TaskService(store, () => {
    const id = ids.shift();
    if (!id) {
      throw new Error("No test IDs remaining");
    }
    return id;
  });

  assert.equal((await service.create("First task")).id, firstId);
  assert.equal((await service.create("Second task")).id, secondId);
});

test("lists all tasks by default and filters open and done tasks", async () => {
  const service = new TaskService(new InMemoryTaskStore());
  const openTask = await service.create("Open");
  const doneTask = await service.create("Done");
  await service.complete(doneTask.id);

  assert.deepEqual(
    (await service.list()).map((task) => task.id),
    [openTask.id, doneTask.id],
  );
  assert.deepEqual(
    (await service.list("open")).map((task) => task.id),
    [openTask.id],
  );
  assert.deepEqual(
    (await service.list("done")).map((task) => task.id),
    [doneTask.id],
  );
  assert.deepEqual(await service.list("all"), await service.list());
});

test("completes an open task and keeps repeated completion idempotent", async () => {
  const service = new TaskService(new InMemoryTaskStore());
  const task = await service.create("Finish");

  const completed = await service.complete(task.id);
  const completedAgain = await service.complete(task.id);

  assert.deepEqual(completed, { ...task, status: "done" });
  assert.deepEqual(completedAgain, completed);
});

test("completion and removal report missing task IDs", async () => {
  const service = new TaskService(new InMemoryTaskStore());

  await assert.rejects(service.complete("missing"), TaskNotFoundError);
  await assert.rejects(service.remove("missing"), TaskNotFoundError);
});

test("removes open tasks and refuses to remove completed tasks", async () => {
  const service = new TaskService(new InMemoryTaskStore());
  const openTask = await service.create("Open task");
  const doneTask = await service.create("Done task");
  await service.complete(doneTask.id);

  await service.remove(openTask.id);
  await assert.rejects(
    service.remove(doneTask.id),
    CompletedTaskRemovalError,
  );

  assert.deepEqual(await service.list(), [{ ...doneTask, status: "done" }]);
});

test("rejects blank task titles", async () => {
  const service = new TaskService(new InMemoryTaskStore());

  await assert.rejects(service.create("   "));
  assert.deepEqual(await service.list(), []);
});
