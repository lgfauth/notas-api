import { TaskService } from "./service/task-service.js";
import {
  DEFAULT_TASKS_FILE,
  JsonTaskStore,
} from "./store/json-task-store.js";

export function createTaskService(
  filePath = DEFAULT_TASKS_FILE,
): TaskService {
  return new TaskService(new JsonTaskStore(filePath));
}
