import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { Task } from "./domain/task.js";
import type { TaskStore } from "./store/task-store.js";
import { TaskService } from "./service/task-service.js";
import { runCli, type CliIO } from "./cli.js";

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

function createCliHarness(): {
  service: TaskService;
  io: CliIO;
  output: { stdout: string[]; stderr: string[] };
} {
  const output = { stdout: [] as string[], stderr: [] as string[] };
  const io: CliIO = {
    stdout: (message) => output.stdout.push(message),
    stderr: (message) => output.stderr.push(message),
  };
  return {
    service: new TaskService(new InMemoryTaskStore()),
    io,
    output,
  };
}

test("create validates arguments and prints the created task", async () => {
  const { service, io, output } = createCliHarness();
  const exitCode = await runCli(
    ["create", "--title", "  Write docs  "],
    { service, io },
  );

  assert.equal(exitCode, 0);
  assert.deepEqual(JSON.parse(output.stdout[0]), {
    id: JSON.parse(output.stdout[0]).id,
    title: "Write docs",
    status: "open",
  });
  assert.match(JSON.parse(output.stdout[0]).id, /^[0-9a-f-]{36}$/i);
  assert.deepEqual(output.stderr, []);
});

test("create rejects malformed arguments and blank titles", async () => {
  const { service, io, output } = createCliHarness();

  assert.equal(
    await runCli(["create", "--title"], { service, io }),
    1,
  );
  assert.equal(
    await runCli(["create", "--title", "   "], { service, io }),
    1,
  );
  assert.equal(await runCli(["create", "Title"], { service, io }), 1);
  assert.deepEqual(await service.list(), []);
  assert.equal(output.stdout.length, 0);
  assert.equal(output.stderr.length, 3);
});

test("list prints all tasks by default and supports filters", async () => {
  const { service, io, output } = createCliHarness();
  const openTask = await service.create("Open");
  const doneTask = await service.create("Done");
  await service.complete(doneTask.id);

  assert.equal(await runCli(["list"], { service, io }), 0);
  assert.deepEqual(JSON.parse(output.stdout.at(-1) ?? "null"), [
    openTask,
    { ...doneTask, status: "done" },
  ]);

  assert.equal(
    await runCli(["list", "--filter", "open"], { service, io }),
    0,
  );
  assert.deepEqual(JSON.parse(output.stdout.at(-1) ?? "null"), [openTask]);

  assert.equal(
    await runCli(["list", "--filter", "done"], { service, io }),
    0,
  );
  assert.deepEqual(JSON.parse(output.stdout.at(-1) ?? "null"), [
    { ...doneTask, status: "done" },
  ]);
});

test("list accepts all and rejects invalid filters and arguments", async () => {
  const { service, io, output } = createCliHarness();

  assert.equal(
    await runCli(["list", "--filter", "all"], { service, io }),
    0,
  );
  assert.deepEqual(JSON.parse(output.stdout[0]), []);
  assert.equal(
    await runCli(["list", "--filter", "closed"], { service, io }),
    1,
  );
  assert.equal(await runCli(["list", "--unknown"], { service, io }), 1);
  assert.equal(output.stderr.length, 2);
});

test("complete validates IDs, prints completion, and accepts repeats", async () => {
  const { service, io, output } = createCliHarness();
  const task = await service.create("Complete me");

  assert.equal(await runCli(["complete", "invalid-id"], { service, io }), 1);
  assert.equal(await runCli(["complete", task.id], { service, io }), 0);
  assert.deepEqual(JSON.parse(output.stdout[0]), { ...task, status: "done" });
  assert.equal(await runCli(["complete", task.id], { service, io }), 0);
  assert.deepEqual(JSON.parse(output.stdout[1]), { ...task, status: "done" });
  assert.equal(output.stderr.length, 1);
});

test("remove removes open tasks and reports domain errors", async () => {
  const { service, io, output } = createCliHarness();
  const openTask = await service.create("Remove me");
  const doneTask = await service.create("Keep me");
  await service.complete(doneTask.id);

  assert.equal(await runCli(["remove", openTask.id], { service, io }), 0);
  assert.equal(output.stdout[0], `Task ${openTask.id} removed.\n`);
  assert.equal(await runCli(["remove", doneTask.id], { service, io }), 1);
  assert.equal(await runCli(["remove", randomUUID()], { service, io }), 1);
  assert.deepEqual(await service.list(), [{ ...doneTask, status: "done" }]);
  assert.equal(output.stderr.length, 2);
});

test("unknown commands report failure through stderr", async () => {
  const { service, io, output } = createCliHarness();

  assert.equal(await runCli([], { service, io }), 1);
  assert.equal(await runCli(["unknown"], { service, io }), 1);
  assert.equal(output.stdout.length, 0);
  assert.ok(output.stderr.every((message) => message.startsWith("Error: ")));
});
