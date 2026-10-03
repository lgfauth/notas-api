import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import type { Task } from "../domain/task.js";
import type { TaskStore } from "../store/task-store.js";
import { TaskService } from "../service/task-service.js";
import { createTaskServer } from "./server.js";

class InMemoryTaskStore implements TaskStore {
  private tasks: Task[] = [];

  async readAll(): Promise<Task[]> {
    return structuredClone(this.tasks);
  }

  async update(
    updateTasks: (tasks: readonly Task[]) => readonly Task[],
  ): Promise<Task[]> {
    this.tasks = structuredClone([...updateTasks(structuredClone(this.tasks))]);
    return structuredClone(this.tasks);
  }
}

async function withApi(
  operation: (request: typeof fetch, baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createTaskServer(new TaskService(new InMemoryTaskStore()));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await operation(fetch, baseUrl);
  } finally {
    server.close();
    await once(server, "close");
  }
}

async function responseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("POST /tasks creates a task with status 201", async () => {
  await withApi(async (request, baseUrl) => {
    const response = await request(`${baseUrl}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "  File report  " }),
    });

    assert.equal(response.status, 201);
    assert.match(response.headers.get("content-type") ?? "", /application\/json/);
    const task = await responseJson<Task>(response);
    assert.match(task.id, /^[0-9a-f-]{36}$/i);
    assert.equal(task.title, "File report");
    assert.equal(task.status, "open");
  });
});

test("POST /tasks rejects missing, blank, malformed, and unexpected input", async () => {
  await withApi(async (request, baseUrl) => {
    const missingTitle = await request(`${baseUrl}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const blankTitle = await request(`${baseUrl}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "   " }),
    });
    const malformedJson = await request(`${baseUrl}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    const unexpectedField = await request(`${baseUrl}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Valid", extra: true }),
    });

    for (const response of [
      missingTitle,
      blankTitle,
      malformedJson,
      unexpectedField,
    ]) {
      assert.equal(response.status, 400);
      assert.ok(await responseJson<{ error: { message: string } }>(response));
    }
  });
});

test("GET /tasks lists all tasks by default and supports accepted filters", async () => {
  await withApi(async (request, baseUrl) => {
    const createdOpen = await request(`${baseUrl}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Open task" }),
    });
    const openTask = await responseJson<Task>(createdOpen);

    const createdDone = await request(`${baseUrl}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Done task" }),
    });
    const doneTask = await responseJson<Task>(createdDone);
    await request(`${baseUrl}/tasks/${doneTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });

    const all = await request(`${baseUrl}/tasks`);
    const allExplicit = await request(`${baseUrl}/tasks?filter=all`);
    const open = await request(`${baseUrl}/tasks?filter=open`);
    const done = await request(`${baseUrl}/tasks?filter=done`);

    assert.equal(all.status, 200);
    assert.deepEqual(await responseJson<Task[]>(all), [
      openTask,
      { ...doneTask, status: "done" },
    ]);
    assert.deepEqual(await responseJson<Task[]>(allExplicit), [
      openTask,
      { ...doneTask, status: "done" },
    ]);
    assert.deepEqual(await responseJson<Task[]>(open), [openTask]);
    assert.deepEqual(await responseJson<Task[]>(done), [
      { ...doneTask, status: "done" },
    ]);
  });
});

test("GET /tasks rejects invalid, duplicate, and unknown query parameters", async () => {
  await withApi(async (request, baseUrl) => {
    for (const query of [
      "?filter=closed",
      "?filter=open&filter=done",
      "?other=value",
    ]) {
      const response = await request(`${baseUrl}/tasks${query}`);
      assert.equal(response.status, 400);
      assert.ok(await responseJson<{ error: { message: string } }>(response));
    }
  });
});

test("PATCH /tasks/:id completes a task idempotently and validates input", async () => {
  await withApi(async (request, baseUrl) => {
    const created = await request(`${baseUrl}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Complete task" }),
    });
    const task = await responseJson<Task>(created);

    const completed = await request(`${baseUrl}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    const completedAgain = await request(`${baseUrl}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    const invalidBody = await request(`${baseUrl}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "open" }),
    });

    assert.equal(completed.status, 200);
    assert.deepEqual(await responseJson(completed), { ...task, status: "done" });
    assert.deepEqual(await responseJson(completedAgain), {
      ...task,
      status: "done",
    });
    assert.equal(invalidBody.status, 400);
  });
});

test("PATCH and DELETE return 404 for unknown task IDs", async () => {
  await withApi(async (request, baseUrl) => {
    const unknownId = randomUUID();
    const completed = await request(`${baseUrl}/tasks/${unknownId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    const removed = await request(`${baseUrl}/tasks/${unknownId}`, {
      method: "DELETE",
    });

    assert.equal(completed.status, 404);
    assert.equal(removed.status, 404);
  });
});

test("DELETE removes open tasks and refuses completed tasks", async () => {
  await withApi(async (request, baseUrl) => {
    const createdOpen = await request(`${baseUrl}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Remove open task" }),
    });
    const openTask = await responseJson<Task>(createdOpen);
    const createdDone = await request(`${baseUrl}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Keep done task" }),
    });
    const doneTask = await responseJson<Task>(createdDone);
    await request(`${baseUrl}/tasks/${doneTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });

    const removedOpen = await request(`${baseUrl}/tasks/${openTask.id}`, {
      method: "DELETE",
    });
    const removedDone = await request(`${baseUrl}/tasks/${doneTask.id}`, {
      method: "DELETE",
    });
    const listed = await request(`${baseUrl}/tasks`);

    assert.equal(removedOpen.status, 204);
    assert.equal(removedDone.status, 409);
    assert.deepEqual(await responseJson<Task[]>(listed), [
      { ...doneTask, status: "done" },
    ]);
  });
});
