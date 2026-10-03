import { randomUUID } from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { taskSchema, type Task } from "../domain/task.js";
import type { TaskStore } from "./task-store.js";

const tasksSchema = z.array(taskSchema).superRefine((tasks, context) => {
  const ids = new Set<string>();

  tasks.forEach((task, index) => {
    if (ids.has(task.id)) {
      context.addIssue({
        code: "custom",
        message: `Duplicate task ID: ${task.id}`,
        path: [index, "id"],
      });
    }
    ids.add(task.id);
  });
});

export class TaskStoreCorruptionError extends Error {
  constructor(filePath: string, cause: unknown) {
    super(`Invalid task data in ${filePath}`, { cause });
    this.name = "TaskStoreCorruptionError";
  }
}

export class TaskStoreLockError extends Error {
  constructor(lockPath: string, cause: unknown) {
    super(`Could not acquire task store lock: ${lockPath}`, { cause });
    this.name = "TaskStoreLockError";
  }
}

export interface JsonTaskStoreOptions {
  lockTimeoutMs?: number;
  lockRetryIntervalMs?: number;
}

export class JsonTaskStore implements TaskStore {
  private readonly filePath: string;
  private readonly lockPath: string;
  private readonly lockTimeoutMs: number;
  private readonly lockRetryIntervalMs: number;

  constructor(
    filePath = resolve(process.cwd(), "data", "tasks.json"),
    options: JsonTaskStoreOptions = {},
  ) {
    this.filePath = resolve(filePath);
    this.lockPath = `${this.filePath}.lock`;
    this.lockTimeoutMs = options.lockTimeoutMs ?? 5_000;
    this.lockRetryIntervalMs = options.lockRetryIntervalMs ?? 20;
  }

  async readAll(): Promise<Task[]> {
    try {
      return await this.readFile();
    } catch (error) {
      if (!hasErrorCode(error, "ENOENT")) {
        throw error;
      }
    }

    return this.withLock(async () => {
      try {
        return await this.readFile();
      } catch (error) {
        if (!hasErrorCode(error, "ENOENT")) {
          throw error;
        }
      }

      await this.writeFile([]);
      return [];
    });
  }

  async update(
    updateTasks: (tasks: readonly Task[]) => readonly Task[],
  ): Promise<Task[]> {
    return this.withLock(async () => {
      const current = await this.readOrInitializeFile();
      const updated = updateTasks(current);
      const validation = tasksSchema.safeParse(updated);

      if (!validation.success) {
        throw validation.error;
      }

      await this.writeFile(validation.data);
      return validation.data;
    });
  }

  private async readOrInitializeFile(): Promise<Task[]> {
    try {
      return await this.readFile();
    } catch (error) {
      if (!hasErrorCode(error, "ENOENT")) {
        throw error;
      }
    }

    await this.writeFile([]);
    return [];
  }

  private async readFile(): Promise<Task[]> {
    let parsed: unknown;

    try {
      parsed = JSON.parse(await readFile(this.filePath, "utf8"));
    } catch (error) {
      if (hasErrorCode(error, "ENOENT")) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        throw new TaskStoreCorruptionError(this.filePath, error);
      }
      throw error;
    }

    const validation = tasksSchema.safeParse(parsed);
    if (!validation.success) {
      throw new TaskStoreCorruptionError(this.filePath, validation.error);
    }

    return validation.data;
  }

  private async writeFile(tasks: readonly Task[]): Promise<void> {
    const temporaryPath = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;

    try {
      await writeFile(temporaryPath, `${JSON.stringify(tasks, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
      });
      await rename(temporaryPath, this.filePath);
    } catch (error) {
      try {
        await unlink(temporaryPath);
      } catch (cleanupError) {
        if (!hasErrorCode(cleanupError, "ENOENT")) {
          throw new AggregateError(
            [error, cleanupError],
            "Task file write and temporary file cleanup both failed",
          );
        }
      }
      throw error;
    }
  }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const lockHandle = await this.acquireLock();
    let operationFailed = false;
    let operationError: unknown;

    try {
      return await operation();
    } catch (error) {
      operationFailed = true;
      operationError = error;
      throw error;
    } finally {
      const releaseErrors = await this.releaseLock(lockHandle);
      if (releaseErrors.length > 0) {
        if (operationFailed) {
          throw new AggregateError(
            [operationError, ...releaseErrors],
            "Task store operation and lock release both failed",
          );
        }
        throw new AggregateError(releaseErrors, "Could not release task store lock");
      }
    }
  }

  private async acquireLock(): Promise<FileHandle> {
    const startedAt = Date.now();

    while (true) {
      try {
        return await open(this.lockPath, "wx");
      } catch (error) {
        if (!hasErrorCode(error, "EEXIST")) {
          throw error;
        }

        const elapsed = Date.now() - startedAt;
        const remaining = this.lockTimeoutMs - elapsed;
        if (remaining <= 0) {
          throw new TaskStoreLockError(this.lockPath, error);
        }

        await delay(Math.min(this.lockRetryIntervalMs, remaining));
      }
    }
  }

  private async releaseLock(lockHandle: FileHandle): Promise<unknown[]> {
    const errors: unknown[] = [];

    try {
      await lockHandle.close();
    } catch (error) {
      errors.push(error);
    }

    try {
      await unlink(this.lockPath);
    } catch (error) {
      if (!hasErrorCode(error, "ENOENT")) {
        errors.push(error);
      }
    }

    return errors;
  }
}

function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
