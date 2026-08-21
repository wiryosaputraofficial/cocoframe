import assert from "node:assert/strict";
import test from "node:test";
import { migratePostgres, openPostgres, type PostgresPool, type PostgresQueryResult } from "../packages/database-postgres/src/index.ts";

test("uses PostgreSQL pool connections and commits transactions", async () => {
  const queries: Array<{ text: string; values?: readonly unknown[] }> = [];
  let released = 0;
  let ended = 0;
  const pool: PostgresPool = {
    async connect() {
      return {
        async query<Row extends Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<PostgresQueryResult<Row>> {
          queries.push({ text, ...(values ? { values } : {}) });
          return { rows: [], rowCount: 0 };
        },
        release() { released++; },
      };
    },
    async end() { ended++; },
  };
  const database = openPostgres(pool);
  await database.transaction((connection) => connection.query("INSERT INTO users(name) VALUES ($1)", ["Ada"]));
  assert.deepEqual(queries.map(({ text }) => text), ["BEGIN", "INSERT INTO users(name) VALUES ($1)", "COMMIT"]);
  assert.equal(released, 1);
  await database.close();
  assert.equal(ended, 1);
});

test("rolls back failures and runs locked idempotent PostgreSQL migrations", async () => {
  const queries: string[] = [];
  let released = 0;
  const pool: PostgresPool = {
    async connect() {
      return {
        async query<Row extends Record<string, unknown>>(text: string): Promise<PostgresQueryResult<Row>> {
          queries.push(text);
          if (text === "SELECT id FROM _fast_migrations") return { rows: [{ id: "001" }] as unknown as Row[], rowCount: 1 };
          if (text === "FAIL") throw new Error("query failed");
          return { rows: [], rowCount: 0 };
        },
        release() { released++; },
      };
    },
  };
  const database = openPostgres(pool);
  const applied = await migratePostgres(database, [
    { id: "001", up: "OLD" },
    { id: "002", up: "CREATE TABLE posts(id BIGINT PRIMARY KEY)" },
  ]);
  assert.deepEqual(applied, ["002"]);
  assert.ok(queries.includes("SELECT pg_advisory_xact_lock($1)"));
  assert.ok(!queries.includes("OLD"));
  await assert.rejects(() => database.transaction((connection) => connection.query("FAIL")), /query failed/);
  assert.equal(queries.at(-1), "ROLLBACK");
  assert.equal(released, 2);
});
