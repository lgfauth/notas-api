import assert from "node:assert/strict";
import test from "node:test";
import {
  INITIAL_TASK_STATUS,
  taskFilterSchema,
  taskIdSchema,
  taskSchema,
  taskStatusSchema,
  taskTitleSchema,
} from "./task.js";

test("task ID schema accepts UUIDs and rejects invalid identifiers", () => {
  assert.equal(
    taskIdSchema.parse("550e8400-e29b-41d4-a716-446655440000"),
    "550e8400-e29b-41d4-a716-446655440000",
  );
  assert.equal(taskIdSchema.safeParse("not-a-uuid").success, false);
});

test("task title schema trims whitespace and rejects empty titles", () => {
  assert.equal(taskTitleSchema.parse("  Buy milk  "), "Buy milk");
  assert.equal(taskTitleSchema.safeParse("").success, false);
  assert.equal(taskTitleSchema.safeParse("   ").success, false);
});

test("task status schema accepts open and done only", () => {
  assert.deepEqual(taskStatusSchema.options, ["open", "done"]);
  assert.equal(INITIAL_TASK_STATUS, "open");
  assert.equal(taskStatusSchema.safeParse("open").success, true);
  assert.equal(taskStatusSchema.safeParse("done").success, true);
  assert.equal(taskStatusSchema.safeParse("pending").success, false);
});

test("task filter schema accepts all, open, and done only", () => {
  assert.deepEqual(taskFilterSchema.options, ["all", "open", "done"]);
  assert.equal(taskFilterSchema.safeParse("all").success, true);
  assert.equal(taskFilterSchema.safeParse("open").success, true);
  assert.equal(taskFilterSchema.safeParse("done").success, true);
  assert.equal(taskFilterSchema.safeParse("invalid").success, false);
});

test("task schema validates task fields and normalized title", () => {
  assert.deepEqual(
    taskSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "  Review notes ",
      status: INITIAL_TASK_STATUS,
    }),
    {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Review notes",
      status: "open",
    },
  );
});
