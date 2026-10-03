import { createServer, type IncomingMessage, type Server } from "node:http";
import { z } from "zod";
import {
  taskFilterSchema,
  taskIdSchema,
  taskTitleSchema,
} from "../domain/task.js";
import {
  CompletedTaskRemovalError,
  TaskNotFoundError,
} from "../domain/task-errors.js";
import { TaskService } from "../service/task-service.js";

const createTaskBodySchema = z.object({ title: taskTitleSchema }).strict();
const completeTaskBodySchema = z.object({ status: z.literal("done") }).strict();
const listQuerySchema = z
  .object({ filter: taskFilterSchema.optional() })
  .strict();

class BadRequestError extends Error {}

export function createTaskServer(service: TaskService): Server {
  return createServer((request, response) => {
    void handleRequest(request, response, service).catch((error: unknown) => {
      if (response.destroyed) {
        return;
      }
      if (error instanceof z.ZodError) {
        sendError(
          response,
          400,
          "invalid_request",
          formatValidationError(error),
        );
        return;
      }
      if (error instanceof BadRequestError) {
        sendError(response, 400, "invalid_request", error.message);
        return;
      }
      if (error instanceof TaskNotFoundError) {
        sendError(response, 404, "not_found", error.message);
        return;
      }
      if (error instanceof CompletedTaskRemovalError) {
        sendError(response, 409, "conflict", error.message);
        return;
      }

      console.error("Unexpected task API error", error);
      sendError(response, 500, "internal_error", "Internal server error");
    });
  });
}

async function handleRequest(
  request: IncomingMessage,
  response: import("node:http").ServerResponse,
  service: TaskService,
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://localhost");
  const pathname = url.pathname;

  if (pathname === "/tasks") {
    if (request.method === "POST") {
      const body = createTaskBodySchema.parse(await readJsonBody(request));
      sendJson(response, 201, await service.create(body.title));
      return;
    }

    if (request.method === "GET") {
      const filterValues = url.searchParams.getAll("filter");
      if (filterValues.length > 1) {
        throw new BadRequestError("The filter query parameter must appear once");
      }
      const query = listQuerySchema.parse(
        Object.fromEntries(url.searchParams.entries()),
      );
      sendJson(response, 200, await service.list(query.filter ?? "all"));
      return;
    }

    response.setHeader("Allow", "GET, POST");
    sendError(response, 405, "method_not_allowed", "Method not allowed");
    return;
  }

  const taskPathMatch = /^\/tasks\/([^/]+)$/.exec(pathname);
  if (taskPathMatch) {
    let encodedId: string;
    try {
      encodedId = decodeURIComponent(taskPathMatch[1]);
    } catch {
      throw new BadRequestError("Task ID is not valid URL encoding");
    }
    const taskId = taskIdSchema.parse(encodedId);

    if (request.method === "PATCH") {
      const body = completeTaskBodySchema.parse(await readJsonBody(request));
      sendJson(response, 200, await service.complete(taskId));
      return;
    }

    if (request.method === "DELETE") {
      await service.remove(taskId);
      response.writeHead(204);
      response.end();
      return;
    }

    response.setHeader("Allow", "DELETE, PATCH");
    sendError(response, 405, "method_not_allowed", "Method not allowed");
    return;
  }

  sendError(response, 404, "not_found", "Route not found");
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let byteLength = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.byteLength;
    if (byteLength > 1_048_576) {
      throw new BadRequestError("Request body exceeds the 1 MiB limit");
    }
    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new BadRequestError("Request body must contain valid JSON");
    }
    throw error;
  }
}

function sendJson(
  response: import("node:http").ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function sendError(
  response: import("node:http").ServerResponse,
  statusCode: number,
  code: string,
  message: string,
): void {
  sendJson(response, statusCode, { error: { code, message } });
}

function formatValidationError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join("; ");
}
