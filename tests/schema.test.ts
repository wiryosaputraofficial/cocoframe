import assert from "node:assert/strict";
import test from "node:test";
import { ValidationError, schema } from "../packages/schema/src/index.ts";

test("parses typed objects, coercion, and optional fields", () => {
  const input = schema.object({
    name: schema.string({ min: 2 }),
    age: schema.number({ integer: true, coerce: true }),
    active: schema.optional(schema.boolean({ coerce: true })),
  });
  assert.deepEqual(input.parse({ name: "AI", age: "4", active: "true", ignored: true }), { name: "AI", age: 4, active: true });
  assert.deepEqual(input.parse({ name: "Web", age: 3 }), { name: "Web", age: 3 });
});

test("reports all object issues with machine-readable paths", () => {
  const input = schema.object({ name: schema.string({ min: 2 }), age: schema.number() });
  assert.throws(() => input.parse({ name: "x", age: "old" }), (error) => {
    assert.ok(error instanceof ValidationError);
    assert.deepEqual(error.issues.map((issue) => issue.path), [["name"], ["age"]]);
    return true;
  });
});

test("supports enum, union, record, date, and transforms", () => {
  assert.equal(schema.enum(["draft", "published"]).parse("draft"), "draft");
  assert.equal(schema.union([schema.string(), schema.number()]).parse(3), 3);
  assert.deepEqual(schema.record(schema.number()).parse({ first: 1, second: 2 }), { first: 1, second: 2 });
  assert.equal(schema.date({ coerce: true }).parse("2026-08-20T00:00:00.000Z").toISOString(), "2026-08-20T00:00:00.000Z");
  assert.equal(schema.transform(schema.string(), (value) => value.toUpperCase()).parse("fast"), "FAST");
});
