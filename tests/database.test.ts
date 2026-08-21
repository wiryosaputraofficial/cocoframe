import assert from "node:assert/strict";
import test from "node:test";
import { createDatabase, defineDatabaseAdapter } from "../packages/database/src/index.ts";

test("releases database connections after success and failure", async () => {
  const released: number[] = [];
  let next = 0;
  const database = createDatabase(defineDatabaseAdapter({
    acquire: () => ({ id: ++next }),
    release: (connection) => { released.push(connection.id); },
    transaction: async (connection, operation) => operation(connection),
  }));
  assert.equal(await database.run((connection) => connection.id), 1);
  await assert.rejects(() => database.run(() => { throw new Error("query failed"); }), /query failed/);
  assert.equal(await database.transaction((connection) => connection.id), 3);
  assert.deepEqual(released, [1, 2, 3]);
});

test("fails explicitly when an adapter has no transaction support", async () => {
  const database = createDatabase({ acquire: () => ({}), release: () => {} });
  await assert.rejects(() => database.transaction(async () => undefined), /does not support transactions/);
});
