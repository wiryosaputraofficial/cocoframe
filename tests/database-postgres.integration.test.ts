import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import {
  defineCocoQLPermissions,
  defineCocoQLSafetyPolicy,
  defineCocoQLSchema,
  parseCocoQL,
  planCocoQL,
} from "../packages/cocoql/src/index.ts";
import {
  createCocoQLPostgresExecutor,
  migratePostgres,
  openPostgres,
  PostgresExecutionError,
  PostgresMigrationError,
  type PostgresPool,
} from "../packages/database-postgres/src/index.ts";

const connectionString = process.env.COCOFRAME_POSTGRES_URL;

test("CocoQL executes its complete managed workflow against PostgreSQL", { skip: connectionString ? false : "Set COCOFRAME_POSTGRES_URL to run the real PostgreSQL integration suite." }, async () => {
  const namespace = `cocoql_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString, max: 1 });
  await admin.query(`CREATE SCHEMA "${namespace}"`);
  const driverPool = new Pool({ connectionString, max: 4, options: `-c search_path=${namespace}` });
  const pool = driverPool as unknown as PostgresPool;
  try {
    const database = openPostgres(pool);
    const migrations = [
      { id: "001_users", up: "CREATE TYPE user_status AS ENUM ('active', 'inactive'); CREATE TABLE users (id BIGINT PRIMARY KEY, email TEXT NOT NULL UNIQUE, status user_status NOT NULL)" },
      { id: "002_articles", up: "CREATE TABLE articles (id UUID PRIMARY KEY, slug TEXT NOT NULL UNIQUE, metadata JSONB NOT NULL, tags TEXT[] NOT NULL, body TEXT NOT NULL)" },
      { id: "003_slow_view", up: "CREATE VIEW slow_users AS SELECT id, (pg_sleep(1) IS NULL) AS delayed FROM users" },
    ] as const;
    const concurrentMigrations = await Promise.all([
      migratePostgres(database, migrations, { toolVersion: "integration-test" }),
      migratePostgres(database, migrations, { toolVersion: "integration-test" }),
    ]);
    assert.deepEqual(concurrentMigrations.flat().sort(), ["001_users", "002_articles", "003_slow_view"]);
    assert.deepEqual(await migratePostgres(database, migrations, { toolVersion: "integration-test" }), []);
    await assert.rejects(() => migratePostgres(database, [
      { id: "001_users", up: "CREATE TABLE users (id INTEGER PRIMARY KEY)" },
      ...migrations.slice(1),
    ]), (error: unknown) => error instanceof PostgresMigrationError && error.code === "MIGRATION_DRIFT");

    const schema = defineCocoQLSchema({
      version: "0.1",
      entities: {
        users: { table: "users", fields: { id: { type: "id" }, email: { type: "string", unique: true }, status: { type: "enum", values: ["active", "inactive"] } } },
        articles: { table: "articles", fields: { id: { type: "uuid" }, slug: { type: "string", unique: true }, metadata: { type: "jsonb" }, tags: { type: "string_array" }, body: { type: "string", searchConfig: "english" } } },
        slow_users: { table: "slow_users", fields: { id: { type: "id" }, delayed: { type: "boolean" } } },
      },
    });
    const permissions = defineCocoQLPermissions({
      version: "0.1",
      entities: {
        users: { fields: ["id", "email", "status"], create: ["id", "email", "status"], update: ["status"], delete: true, aggregates: ["count"] },
        articles: { fields: ["id", "slug", "metadata", "tags", "body"], create: ["id", "slug", "metadata", "tags", "body"], update: ["metadata", "tags", "body"] },
        slow_users: { fields: ["id", "delayed"] },
      },
    });
    const safety = defineCocoQLSafetyPolicy({
      version: "0.1",
      read: { requireTake: true, maxTake: 100, maxSkip: 100, maxFilters: 10, maxProjectedFields: 8, maxRelations: 2, maxRelationDepth: 2, maxGroupFields: 4, maxAggregates: 4 },
      mutation: { requireFilterForUpdate: true, requireFilterForDelete: true, requireConfirmation: true, maxAffectedRows: 10, maxFilters: 10, maxChanges: 8 },
    });
    const executor = createCocoQLPostgresExecutor(pool, { queryTimeoutMs: 2_000 });

    for (const [id, email] of [[1, "ada@example.com"], [2, "grace@example.com"]] as const) {
      const created = await executor.mutate<{ id: string }>({
        source: `create users\n  id = ${id}\n  email = "${email}"\n  status = active\nconfirm affected <= 1`,
        schema, permissions, safety, returning: ["id"],
      });
      assert.equal(created.rowCount, 1);
    }

    await assert.rejects(() => executor.mutate({
      source: "from users\nfilter status = active\nupdate\n  status = inactive\nconfirm affected <= 1",
      schema, permissions, safety,
    }), (error: unknown) => error instanceof PostgresExecutionError && error.code === "GUARD_REJECTED");
    const unchanged = await executor.read<{ status: string }>({ source: "from users\nselect status\nsort id asc\ntake 10", schema, permissions, safety });
    assert.deepEqual(unchanged.rows.map((row) => row.status), ["active", "active"]);

    const articleId = randomUUID();
    const createArticle = `create articles
  id = "${articleId}"
  slug = first
  metadata = "{\\\"tier\\\":\\\"pro\\\"}"
  tags = [postgres,typescript]
  body = "PostgreSQL connection pooling"
confirm affected <= 1`;
    const article = await executor.mutate<{ id: string; metadata: { tier: string }; tags: string[] }>({
      source: createArticle, schema, permissions, safety, returning: ["id", "metadata", "tags"],
    });
    assert.equal(article.rows[0]?.id, articleId);
    assert.deepEqual(article.rows[0]?.metadata, { tier: "pro" });
    assert.deepEqual(article.rows[0]?.tags, ["postgres", "typescript"]);

    const upserted = await executor.mutate<{ body: string }>({
      source: `create articles\n  id = "${randomUUID()}"\n  slug = first\n  metadata = "{\\\"tier\\\":\\\"enterprise\\\"}"\n  tags = [postgres]\n  body = "Updated PostgreSQL guide"\nconfirm affected <= 1`,
      schema, permissions, safety,
      conflict: { fields: ["slug"], action: "update", update: ["metadata", "tags", "body"] },
      returning: ["body"],
    });
    assert.equal(upserted.rows[0]?.body, "Updated PostgreSQL guide");

    const nativeRead = await executor.read<{ slug: string }>({
      source: "from articles\nfilter metadata has_key tier\nfilter tags overlaps [postgres]\nfilter body matches \"updated guide\"\nselect slug\ntake 10",
      schema, permissions, safety,
    });
    assert.deepEqual(nativeRead.rows, [{ slug: "first" }]);

    const cte = planCocoQL(parseCocoQL("from users\nfilter status = active\nselect id,email\nsort id asc\ntake 100"), schema);
    const outer = planCocoQL(parseCocoQL("from users\nselect id,email\nsort id asc\ntake 10"), schema);
    const advanced = await executor.read<{ id: string }>({
      source: "from users\nselect id,email\nsort id asc\ntake 10",
      schema, permissions, safety,
      postgres: { distinct: true, ctes: [{ name: "active_users", plan: cte }], fromCte: "active_users", cursor: { field: outer.projection[0]!, value: 0, position: "after" } },
    });
    assert.deepEqual(advanced.rows.map((row) => Number(row.id)), [1, 2]);

    const grouped = await executor.read<{ status: string; total: string }>({
      source: "from users\ngroup status\nselect status,count(id) as total\nsort total desc\ntake 10",
      schema, permissions, safety,
      postgres: { having: [{ alias: "total", operator: ">", value: 1 }] },
    });
    assert.equal(Number(grouped.rows[0]?.total), 2);

    await assert.rejects(() => executor.read({
      source: "from slow_users\nselect id,delayed\ntake 1", schema, permissions, safety, queryTimeoutMs: 50,
    }), (error: unknown) => error instanceof PostgresExecutionError && error.code === "QUERY_TIMEOUT" && error.sqlState === "57014");

    const controller = new AbortController();
    const cancelled = executor.read({ source: "from slow_users\nselect id,delayed\ntake 1", schema, permissions, safety, signal: controller.signal });
    setTimeout(() => controller.abort("integration cancellation"), 50).unref?.();
    await assert.rejects(() => cancelled, (error: unknown) => error instanceof PostgresExecutionError && error.code === "ABORTED");

    const recovered = await executor.read({ source: "from users\nselect id\ntake 1", schema, permissions, safety });
    assert.equal(recovered.rowCount, 1);
  } finally {
    await driverPool.end().catch(() => undefined);
    await admin.query(`DROP SCHEMA "${namespace}" CASCADE`).catch(() => undefined);
    await admin.end();
  }
});
