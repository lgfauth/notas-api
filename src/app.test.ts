import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import test from "node:test";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Task } from "./domain/task.js";
import { runCli } from "./cli.js";
import { createTaskService } from "./composition.js";
import { createTaskServer } from "./http/server.js";
import { DEFAULT_TASKS_FILE } from "./store/json-task-store.js";

async function withTempDirectory<T>(
  operation: (directory: string) => Promise<T>,
): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "notas-api-app-"));
  try {
    return await operation(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function withApiServer<T>(
  service: ReturnType<typeof createTaskService>,
  operation: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const server = createTaskServer(service);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as AddressInfo;

  try {
    return await operation(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("API and CLI share persistent tasks when composed with the same file", async () => {
  await withTempDirectory(async (directory) => {
    const filePath = join(directory, "data", "tasks.json");
    const apiService = createTaskService(filePath);
    const cliService = createTaskService(filePath);
    const cliOutput: { stdout: string[]; stderr: string[] } = {
      stdout: [],
      stderr: [],
    };
    const cliIo = {
      stdout: (message: string) => cliOutput.stdout.push(message),
      stderr: (message: string) => cliOutput.stderr.push(message),
    };

    await withApiServer(apiService, async (baseUrl) => {
      const createdByApiResponse = await fetch(`${baseUrl}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Created through API" }),
      });
      const createdByApi =
        (await createdByApiResponse.json()) as Task;
      assert.equal(createdByApiResponse.status, 201);

      assert.equal(
        await runCli(["list"], { service: cliService, io: cliIo }),
        0,
      );
      assert.deepEqual(JSON.parse(cliOutput.stdout.at(-1) ?? "null"), [
        createdByApi,
      ]);

      assert.equal(
        await runCli(
          ["create", "--title", "Created through CLI"],
          { service: cliService, io: cliIo },
        ),
        0,
      );
      const createdByCli = JSON.parse(
        cliOutput.stdout.at(-1) ?? "null",
      ) as Task;

      const apiListResponse = await fetch(`${baseUrl}/tasks`);
      assert.deepEqual(await apiListResponse.json(), [
        createdByApi,
        createdByCli,
      ]);

      assert.equal(
        await runCli(["complete", createdByApi.id], {
          service: cliService,
          io: cliIo,
        }),
        0,
      );
      const doneResponse = await fetch(
        `${baseUrl}/tasks?filter=done`,
      );
      assert.deepEqual(await doneResponse.json(), [
        { ...createdByApi, status: "done" },
      ]);

      const reconstructedService = createTaskService(filePath);
      assert.deepEqual(await reconstructedService.list(), [
        { ...createdByApi, status: "done" },
        createdByCli,
      ]);
    });
    assert.deepEqual(cliOutput.stderr, []);
  });
});

test("default composition uses data/tasks.json from the project working directory", () => {
  assert.equal(
    DEFAULT_TASKS_FILE,
    resolve(process.cwd(), "data", "tasks.json"),
  );
  assert.ok(createTaskService());
});
