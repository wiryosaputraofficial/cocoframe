import assert from "node:assert/strict";
import test from "node:test";
import { openSqlite } from "../packages/database-sqlite/src/index.ts";

test("runs SQLite migrations, parameterized queries, and transactions", async () => {
  const database = openSqlite({ filename: ":memory:" });
  await database.run((connection) => {
    connection.migrate([{ id: "001-users", up: "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)" }]);
    connection.migrate([{ id: "001-users", up: "THIS MUST NOT RUN" }]);
    connection.run("INSERT INTO users (name) VALUES (?)", "Ada");
  });
  await database.transaction((connection) => {
    connection.run("INSERT INTO users (name) VALUES (?)", "Lin");
  });
  const rows = await database.run((connection) => connection.all<{ id: number; name: string }>("SELECT id, name FROM users ORDER BY id"));
  assert.deepEqual(rows, [{ id: 1, name: "Ada" }, { id: 2, name: "Lin" }]);
  await assert.rejects(() => database.transaction((connection) => {
    connection.run("INSERT INTO users (name) VALUES (?)", "Rolled back");
    throw new Error("stop");
  }), /stop/);
  assert.equal((await database.run((connection) => connection.get<{ count: number }>("SELECT COUNT(*) AS count FROM users")))?.count, 2);
  await database.close();
});
