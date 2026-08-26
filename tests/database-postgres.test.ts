import assert from "node:assert/strict";
import test from "node:test";
import { CocoQLError, defineCocoQLPermissions, defineCocoQLSafetyPolicy, defineCocoQLSchema, planCocoQL, parseCocoQL } from "../packages/cocoql/src/index.ts";
import {
  checksumPostgresMigration,
  createCocoQLPostgresExecutor,
  migratePostgres,
  openPostgres,
  PostgresExecutionError,
  PostgresMigrationError,
  type PostgresExecutionEvent,
  type PostgresPool,
  type PostgresPoolClient,
  type PostgresQueryResult,
} from "../packages/database-postgres/src/index.ts";

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
          if (text === "SELECT id, checksum, legacy_baseline FROM _fast_migrations ORDER BY id") return { rows: [{ id: "001", checksum: checksumPostgresMigration({ id: "001", up: "OLD" }), legacy_baseline: false }] as unknown as Row[], rowCount: 1 };
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

const executorSchema = defineCocoQLSchema({
  version: "0.1",
  entities: {
    users: {
      table: "users",
      fields: {
        id: { type: "id" },
        email: { type: "string", unique: true },
        status: { type: "enum", values: ["active", "inactive"] },
      },
    },
  },
});

const executorPermissions = defineCocoQLPermissions({
  version: "0.1",
  entities: { users: { fields: ["id", "email", "status"], create: ["email", "status"], update: ["status"], delete: true } },
});

const executorSafety = defineCocoQLSafetyPolicy({
  version: "0.1",
  read: { requireTake: true, maxTake: 100, maxSkip: 100, maxFilters: 4, maxProjectedFields: 3, maxRelations: 0, maxRelationDepth: 0, maxGroupFields: 2, maxAggregates: 2 },
  mutation: { requireFilterForUpdate: true, requireFilterForDelete: true, requireConfirmation: true, maxAffectedRows: 10, maxFilters: 4, maxChanges: 3 },
});

test("rejects invalid, unauthorized, unsafe, preview, and forged reads before PostgreSQL acquisition", async () => {
  let connections = 0;
  const pool: PostgresPool = { async connect() { connections++; throw new Error("must not connect"); } };
  const executor = createCocoQLPostgresExecutor(pool);
  const input = { schema: executorSchema, permissions: executorPermissions, safety: executorSafety };
  await assert.rejects(() => executor.read({ ...input, source: "not cocoql" }), CocoQLError);
  const denied = defineCocoQLPermissions({ version: "0.1", entities: { users: { fields: ["id"] } } });
  await assert.rejects(() => executor.read({ ...input, permissions: denied, source: "from users\nselect email\ntake 1" }), CocoQLError);
  await assert.rejects(() => executor.read({ ...input, source: "from users\nselect id\ntake 101" }), CocoQLError);
  await assert.rejects(() => executor.mutate({ ...input, source: "preview\nfrom users\nfilter id = 1\ndelete" }), CocoQLError);

  const forgedField = planCocoQL(parseCocoQL("from users\nfilter email = \"hidden@example.com\"\nselect id\ntake 1"), executorSchema).filters[0]!;
  await assert.rejects(() => executor.read({
    ...input,
    permissions: denied,
    source: "from users\nselect id\ntake 1",
    postgres: { predicate: { kind: "condition", filter: forgedField } },
  }), (error: unknown) => error instanceof CocoQLError && error.issue.error === "PERMISSION_DENIED");
  await assert.rejects(() => executor.read({
    ...input,
    source: "from users\nselect id\ntake 1",
    postgres: { lock: { mode: "drop" } } as never,
  }), (error: unknown) => error instanceof CocoQLError && error.issue.error === "INVALID_SCHEMA");
  assert.equal(connections, 0);
});

test("executes reads in a bounded transaction and emits sanitized telemetry", async () => {
  const queries: Array<{ text: string; values?: readonly unknown[] }> = [];
  const events: PostgresExecutionEvent[] = [];
  let releases = 0;
  const pool = poolFromClient({
    async query<Row extends Record<string, unknown>>(text: string, values?: readonly unknown[]) {
      queries.push({ text, ...(values ? { values } : {}) });
      if (text.startsWith("SELECT\n")) return { rows: [{ id: 1, email: "private@example.com" }] as unknown as Row[], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    },
    release() { releases++; },
  });
  const executor = createCocoQLPostgresExecutor(pool, { onEvent: (event) => events.push(event) });
  const result = await executor.read<{ id: number; email: string }>({
    source: "from users\nfilter email = \"private@example.com\"\nselect id,email\ntake 1",
    schema: executorSchema,
    permissions: executorPermissions,
    safety: executorSafety,
  });
  assert.deepEqual(result.rows, [{ id: 1, email: "private@example.com" }]);
  assert.deepEqual(queries.map((query) => query.text === queries[2]?.text ? "QUERY" : query.text), ["BEGIN", "SELECT set_config('statement_timeout', $1, true)", "QUERY", "COMMIT"]);
  assert.equal(releases, 1);
  const telemetry = JSON.stringify(events);
  assert.doesNotMatch(telemetry, /private@example\.com|SELECT|users/);
  assert.deepEqual(events.map((event) => event.name), ["connection.acquire.start", "connection.acquire.success", "transaction.begin", "query.start", "transaction.commit", "query.success"]);
});

test("rolls back an affected-row guard rejection before commit", async () => {
  const queries: string[] = [];
  const pool = poolFromClient({
    async query<Row extends Record<string, unknown>>(text: string) {
      queries.push(text);
      if (text.startsWith("UPDATE ")) return { rows: [] as Row[], rowCount: 2 };
      return { rows: [], rowCount: 0 };
    },
    release() {},
  });
  const executor = createCocoQLPostgresExecutor(pool);
  await assert.rejects(() => executor.mutate({
    source: "from users\nfilter id = 1\nupdate\n  status = inactive\nconfirm affected <= 1",
    schema: executorSchema, permissions: executorPermissions, safety: executorSafety,
  }), (error: unknown) => error instanceof PostgresExecutionError && error.code === "GUARD_REJECTED" && error.actualAffectedRows === 2);
  assert.equal(queries.at(-1), "ROLLBACK");
  assert.ok(!queries.includes("COMMIT"));
});

test("retries serialization failures on a fresh PostgreSQL connection", async () => {
  let connections = 0;
  let mutationAttempts = 0;
  const pool: PostgresPool = {
    async connect() {
      connections++;
      return {
        async query<Row extends Record<string, unknown>>(text: string) {
          if (text.startsWith("UPDATE ") && mutationAttempts++ === 0) throw Object.assign(new Error("serialization details and SQL must stay private"), { code: "40001" });
          return { rows: [] as Row[], rowCount: text.startsWith("UPDATE ") ? 1 : 0 };
        },
        release() {},
      };
    },
  };
  const executor = createCocoQLPostgresExecutor(pool);
  const result = await executor.mutate({
    source: "from users\nfilter id = 1\nupdate\n  status = inactive\nconfirm affected <= 1",
    schema: executorSchema, permissions: executorPermissions, safety: executorSafety, retryMaximum: 1,
  });
  assert.equal(result.attempts, 2);
  assert.equal(connections, 2);
});

test("retries a definitive serialization failure returned by COMMIT", async () => {
  let connections = 0;
  let commits = 0;
  const pool: PostgresPool = {
    async connect() {
      connections++;
      return {
        async query<Row extends Record<string, unknown>>(text: string) {
          if (text === "COMMIT" && commits++ === 0) throw Object.assign(new Error("commit serialization"), { code: "40001" });
          return { rows: [] as Row[], rowCount: text.startsWith("UPDATE ") ? 1 : 0 };
        },
        release() {},
      };
    },
  };
  const executor = createCocoQLPostgresExecutor(pool);
  const result = await executor.mutate({
    source: "from users\nfilter id = 1\nupdate\n  status = inactive\nconfirm affected <= 1",
    schema: executorSchema, permissions: executorPermissions, safety: executorSafety, retryMaximum: 1,
  });
  assert.equal(result.attempts, 2);
  assert.equal(connections, 2);
});

test("destroys the client when COMMIT outcome is indeterminate", async () => {
  const releases: Array<Error | undefined> = [];
  const pool = poolFromClient({
    async query<Row extends Record<string, unknown>>(text: string) {
      if (text === "COMMIT") throw new Error("connection disappeared during commit");
      return { rows: [] as Row[], rowCount: text.startsWith("UPDATE ") ? 1 : 0 };
    },
    release(error?: Error) { releases.push(error); },
  });
  const executor = createCocoQLPostgresExecutor(pool);
  await assert.rejects(() => executor.mutate({
    source: "from users\nfilter id = 1\nupdate\n  status = inactive\nconfirm affected <= 1",
    schema: executorSchema, permissions: executorPermissions, safety: executorSafety,
  }), (error: unknown) => error instanceof PostgresExecutionError && error.code === "TRANSACTION_INDETERMINATE");
  assert.equal(releases.length, 1);
  assert.ok(releases[0] instanceof PostgresExecutionError);
});

test("destroys one checked-out client when AbortSignal cancels an in-flight query", async () => {
  const releases: Array<Error | undefined> = [];
  let queryStarted!: () => void;
  const started = new Promise<void>((resolve) => { queryStarted = resolve; });
  const pool = poolFromClient({
    async query<Row extends Record<string, unknown>>(text: string) {
      if (text.startsWith("SELECT\n")) {
        queryStarted();
        return await new Promise<PostgresQueryResult<Row>>(() => undefined);
      }
      return { rows: [], rowCount: 0 };
    },
    release(error?: Error) { releases.push(error); },
  });
  const controller = new AbortController();
  const executor = createCocoQLPostgresExecutor(pool);
  const pending = executor.read({ source: "from users\nselect id\ntake 1", schema: executorSchema, permissions: executorPermissions, safety: executorSafety, signal: controller.signal });
  await started;
  controller.abort("test cancellation");
  await assert.rejects(() => pending, (error: unknown) => error instanceof PostgresExecutionError && error.code === "ABORTED");
  assert.equal(releases.length, 1);
  assert.ok(releases[0] instanceof Error);
});

test("rejects migration history gaps and checksum drift under the advisory lock", async () => {
  const migration = { id: "001", up: "CREATE TABLE users(id BIGINT PRIMARY KEY)" };
  for (const [row, code] of [
    [{ id: "999", checksum: "unknown", legacy_baseline: false }, "MIGRATION_HISTORY_MISSING"],
    [{ id: "001", checksum: "changed", legacy_baseline: false }, "MIGRATION_DRIFT"],
  ] as const) {
    const pool = poolFromClient({
      async query<Row extends Record<string, unknown>>(text: string) {
        if (text.startsWith("SELECT id, checksum")) return { rows: [row] as unknown as Row[], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      },
      release() {},
    });
    await assert.rejects(() => migratePostgres(openPostgres(pool), [migration]), (error: unknown) => error instanceof PostgresMigrationError && error.code === code);
  }
});

test("baselines legacy migration rows and records immutable metadata", async () => {
  const calls: Array<{ text: string; values?: readonly unknown[] }> = [];
  let clock = 10;
  const pool = poolFromClient({
    async query<Row extends Record<string, unknown>>(text: string, values?: readonly unknown[]) {
      calls.push({ text, ...(values ? { values } : {}) });
      if (text.startsWith("SELECT id, checksum")) return { rows: [{ id: "001", checksum: "", legacy_baseline: true }] as unknown as Row[], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    },
    release() {},
  });
  const applied = await migratePostgres(openPostgres(pool), [{ id: "001", up: "OLD" }, { id: "002", up: "NEW" }], { toolVersion: "test-tool", now: () => (clock += 5) });
  assert.deepEqual(applied, ["002"]);
  const baseline = calls.find((call) => call.text.startsWith("UPDATE _fast_migrations SET checksum"));
  assert.equal(baseline?.values?.[1], checksumPostgresMigration({ id: "001", up: "OLD" }));
  const insert = calls.find((call) => call.text.startsWith("INSERT INTO _fast_migrations"));
  assert.deepEqual(insert?.values, ["002", checksumPostgresMigration({ id: "002", up: "NEW" }), "test-tool", 5]);
});

function poolFromClient(client: PostgresPoolClient): PostgresPool {
  return { async connect() { return client; } };
}
