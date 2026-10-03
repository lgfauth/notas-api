import { createTaskServer } from "./http/server.js";
import { createTaskService } from "./composition.js";

const server = createTaskServer(createTaskService());

server.on("error", (error) => {
  console.error("Failed to start task API", error);
  process.exitCode = 1;
});

server.listen(3000, "127.0.0.1", () => {
  console.log("Task API listening on http://127.0.0.1:3000");
});
