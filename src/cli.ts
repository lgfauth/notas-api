import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { z } from "zod";
import {
  taskFilterSchema,
  taskIdSchema,
  taskTitleSchema,
} from "./domain/task.js";
import {
  CompletedTaskRemovalError,
  TaskNotFoundError,
} from "./domain/task-errors.js";
import { createTaskService } from "./composition.js";
import { TaskService } from "./service/task-service.js";

const usage =
  "Usage: create --title <text> | list [--filter all|open|done] | complete <id> | remove <id>";

export interface CliIO {
  stdout(message: string): void;
  stderr(message: string): void;
}

export interface CliOptions {
  service?: TaskService;
  io?: CliIO;
}

class CliArgumentsError extends Error {}

export async function runCli(
  args: readonly string[] = process.argv.slice(2),
  options: CliOptions = {},
): Promise<number> {
  const normalizedArgs =
    process.env.npm_lifecycle_event === "cli" &&
    args[0] === "create" &&
    args.length > 1 &&
    !args.includes("--title")
      ? ["create", "--title", args.slice(1).join(" ")]
      : args;
  const service = options.service ?? createTaskService();
  const io = options.io ?? {
    stdout: (message: string) => process.stdout.write(message),
    stderr: (message: string) => process.stderr.write(message),
  };

  try {
    const [command, ...commandArgs] = normalizedArgs;

    if (command === "create") {
      if (
        commandArgs.length !== 2 ||
        commandArgs[0] !== "--title"
      ) {
        throw new CliArgumentsError(`Invalid arguments. ${usage}`);
      }
      const title = taskTitleSchema.parse(commandArgs[1]);
      const task = await service.create(title);
      io.stdout(`${JSON.stringify(task, null, 2)}\n`);
      return 0;
    }

    if (command === "list") {
      let filter = "all";
      if (
        commandArgs.length !== 0 &&
        (commandArgs.length !== 2 || commandArgs[0] !== "--filter")
      ) {
        throw new CliArgumentsError(`Invalid arguments. ${usage}`);
      }
      if (commandArgs.length === 2) {
        filter = taskFilterSchema.parse(commandArgs[1]);
      }
      const tasks = await service.list(taskFilterSchema.parse(filter));
      io.stdout(`${JSON.stringify(tasks, null, 2)}\n`);
      return 0;
    }

    if (command === "complete") {
      if (commandArgs.length !== 1) {
        throw new CliArgumentsError(`Invalid arguments. ${usage}`);
      }
      const taskId = taskIdSchema.parse(commandArgs[0]);
      const task = await service.complete(taskId);
      io.stdout(`${JSON.stringify(task, null, 2)}\n`);
      return 0;
    }

    if (command === "remove") {
      if (commandArgs.length !== 1) {
        throw new CliArgumentsError(`Invalid arguments. ${usage}`);
      }
      const taskId = taskIdSchema.parse(commandArgs[0]);
      await service.remove(taskId);
      io.stdout(`Task ${taskId} removed.\n`);
      return 0;
    }

    throw new CliArgumentsError(`Unknown command. ${usage}`);
  } catch (error) {
    io.stderr(`Error: ${formatError(error)}\n`);
    return 1;
  }
}

function formatError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => issue.message).join("; ");
  }
  if (
    error instanceof CliArgumentsError ||
    error instanceof TaskNotFoundError ||
    error instanceof CompletedTaskRemovalError
  ) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error";
}

const invokedPath = process.argv[1];
if (invokedPath && resolve(invokedPath) === fileURLToPath(import.meta.url)) {
  runCli().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
