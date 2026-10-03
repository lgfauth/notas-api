import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import test from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  JsonTaskStore,
  TaskStoreCorruptionError,
  TaskStoreLockError,
} from "./json-task-store.js";

const workerModuleUrl = pathToFileURL(
  join(process.cwd(), "src", "store", "json-task-store.ts"),
).href;

async function withTempDirectory<T>(
  operation: (directory: string) => Promise<T>,
): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "notas-api-task-store-"));
  try {
    return await operation(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function runConcurrentWriter(filePath: string, taskId: string): Promise<void> {
  const workerCode = `
    const { JsonTaskStore } = await import(process.env.TASK_STORE_MODULE);
    const store = new JsonTaskStore(process.env.TASK_STORE_FILE, {
      lockTimeoutMs: 15000,
    });
    await store.update((tasks) => [
      ...tasks,
      {
        id: process.env.TASK_ID,
        title: process.env.TASK_ID,
        status: "open",
      },
    ]);
  `;

  const child = spawn(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", workerCode],
    {
      env: {
        ...process.env,
        TASK_STORE_FILE: filePath,
        TASK_STORE_MODULE: workerModuleUrl,
        TASK_ID: taskId,
      },
      stdio: ["ignore", "ignore", "pipe"],
    },
  );

  return new Promise((resolve, reject) => {
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `Concurrent writer exited with code ${code} and signal ${signal}: ${stderr}`,
        ),
      );
    });
  });
}

test("initializes a missing file and persists updates across store instances", async () => {
  await withTempDirectory(async (directory) => {
    const filePath = join(directory, "nested", "tasks.json");
    const firstStore = new JsonTaskStore(filePath);

    assert.deepEqual(await firstStore.readAll(), []);
    assert.equal(await readFile(filePath, "utf8"), "[]\n");

    const task = {
      id: randomUUID(),
      title: "Persist this task",
      status: "open" as const,
    };
    await firstStore.update((tasks) => [...tasks, task]);

    assert.deepEqual(await new JsonTaskStore(filePath).readAll(), [task]);
  });
});

test("reports corrupt JSON and invalid task data instead of replacing it", async () => {
  await withTempDirectory(async (directory) => {
    const filePath = join(directory, "tasks.json");
    await writeFile(filePath, "{invalid", "utf8");

    await assert.rejects(
      new JsonTaskStore(filePath).readAll(),
      TaskStoreCorruptionError,
    );
    assert.equal(await readFile(filePath, "utf8"), "{invalid");

    await writeFile(filePath, '[{"id":"invalid","title":"No UUID","status":"open"}]', "utf8");
    await assert.rejects(
      new JsonTaskStore(filePath).readAll(),
      TaskStoreCorruptionError,
    );
  });
});

test("surfaces filesystem errors without reporting a successful update", async () => {
  await withTempDirectory(async (directory) => {
    const blockingFile = join(directory, "not-a-directory");
    await writeFile(blockingFile, "blocking");
    const store = new JsonTaskStore(join(blockingFile, "tasks.json"));

    await assert.rejects(
      store.update((tasks) => tasks),
      (error: NodeJS.ErrnoException) =>
        ["EEXIST", "ENOTDIR"].includes(error.code ?? ""),
    );
  });
});

test("fails explicitly when a lock cannot be acquired", async () => {
  await withTempDirectory(async (directory) => {
    const filePath = join(directory, "tasks.json");
    const lockPath = `${filePath}.lock`;
    await writeFile(lockPath, "held");

    await assert.rejects(
      new JsonTaskStore(filePath, {
        lockTimeoutMs: 30,
        lockRetryIntervalMs: 5,
      }).update((tasks) => tasks),
      TaskStoreLockError,
    );

    await rm(lockPath);
  });
});

test("releases the lock when an update callback fails", async () => {
  await withTempDirectory(async (directory) => {
    const store = new JsonTaskStore(join(directory, "tasks.json"));
    const expectedError = new Error("mutation failed");

    await assert.rejects(
      store.update(() => {
        throw expectedError;
      }),
      (error) => error === expectedError,
    );
    assert.deepEqual(await store.update((tasks) => tasks), []);
  });
});

test("serializes updates from concurrent Node processes without losing tasks", async () => {
  await withTempDirectory(async (directory) => {
    const filePath = join(directory, "tasks.json");
    const store = new JsonTaskStore(filePath);
    await store.readAll();

    const taskIds = Array.from({ length: 6 }, () => randomUUID());
    await Promise.all(
      taskIds.map((taskId) => runConcurrentWriter(filePath, taskId)),
    );

    const tasks = await store.readAll();
    assert.equal(tasks.length, taskIds.length);
    assert.deepEqual(
      new Set(tasks.map((task) => task.id)),
      new Set(taskIds),
    );
  });
});
