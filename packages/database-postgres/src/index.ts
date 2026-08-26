import { createDatabase, defineDatabaseAdapter, type Database, type DatabaseAdapter } from "@cocoframe/database";
import { createHash } from "node:crypto";

export interface PostgresQueryResult<Row extends Record<string, unknown> = Record<string, unknown>> {
  readonly rows: readonly Row[];
  readonly rowCount: number | null;
}

export interface PostgresPoolClient {
  readonly query: <Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ) => Promise<PostgresQueryResult<Row>>;
  readonly release: (destroyError?: Error) => void;
}

export {
  createCocoQLPostgresExecutor,
  PostgresExecutionError,
} from "./executor.ts";
export type {
  CocoQLPostgresExecutor,
  PostgresExecutionErrorCode,
  PostgresExecutionEvent,
  PostgresExecutionEventName,
  PostgresExecutionInput,
  PostgresExecutionOperation,
  PostgresExecutionResult,
  PostgresExecutorOptions,
  PostgresMutationExecutionInput,
} from "./executor.ts";

export interface PostgresPool {
  readonly connect: () => Promise<PostgresPoolClient>;
  readonly end?: () => Promise<void>;
}

export interface PostgresConnection {
  readonly query: <Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ) => Promise<PostgresQueryResult<Row>>;
}

export interface PostgresMigration {
  readonly id: string;
  readonly up: string;
}

export interface PostgresMigrationOptions {
  readonly toolVersion?: string;
  readonly now?: () => number;
}

export type PostgresMigrationErrorCode = "INVALID_MIGRATION" | "MIGRATION_HISTORY_MISSING" | "MIGRATION_DRIFT";

/** A typed migration validation, missing-history, or immutable-checksum failure. */
export class PostgresMigrationError extends Error {
  readonly code: PostgresMigrationErrorCode;
  readonly migrationId?: string;

  constructor(code: PostgresMigrationErrorCode, message: string, migrationId?: string) {
    super(message);
    this.name = "PostgresMigrationError";
    this.code = code;
    if (migrationId !== undefined) this.migrationId = migrationId;
  }

  toJSON(): Readonly<Record<string, unknown>> {
    return Object.freeze({ type: "PostgresMigrationError", code: this.code, message: this.message, ...(this.migrationId ? { migrationId: this.migrationId } : {}) });
  }
}

interface InternalConnection extends PostgresConnection {
  readonly client: PostgresPoolClient;
}

/**
 * Creates a driver-neutral adapter around a structurally compatible PostgreSQL pool.
 */
export function createPostgresAdapter(pool: PostgresPool): DatabaseAdapter<PostgresConnection> {
  return defineDatabaseAdapter<PostgresConnection>({
    async acquire() {
      const client = await pool.connect();
      return { client, query: (text, values) => client.query(text, values) } as InternalConnection;
    },
    release(connection) {
      (connection as InternalConnection).client.release();
    },
    async transaction(connection, operation) {
      await connection.query("BEGIN");
      try {
        const result = await operation(connection);
        await connection.query("COMMIT");
        return result;
      } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
      }
    },
    async close() {
      await pool.end?.();
    },
  });
}

/**
 * Creates a database facade backed by a PostgreSQL connection pool.
 */
export function openPostgres(pool: PostgresPool): Database<PostgresConnection> {
  return createDatabase(createPostgresAdapter(pool));
}

/**
 * Runs ordered idempotent PostgreSQL migrations under a transaction-scoped advisory lock.
 */
export async function migratePostgres(
  database: Database<PostgresConnection>,
  migrations: readonly PostgresMigration[],
  options: PostgresMigrationOptions = {},
): Promise<readonly string[]> {
  const ids = new Set<string>();
  for (const migration of migrations) {
    if (!migration.id || ids.has(migration.id) || !migration.up) throw new PostgresMigrationError("INVALID_MIGRATION", `Duplicate, empty, or incomplete PostgreSQL migration id: ${migration.id}`, migration.id || undefined);
    ids.add(migration.id);
  }
  const expected = new Map(migrations.map((migration) => [migration.id, checksumPostgresMigration(migration)]));
  const toolVersion = options.toolVersion ?? "@cocoframe/database-postgres@0.1.0";
  const now = options.now ?? Date.now;
  return database.transaction(async (connection) => {
    await connection.query("SELECT pg_advisory_xact_lock($1)", [1_171_422_019]);
    await connection.query("CREATE TABLE IF NOT EXISTS _fast_migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
    await connection.query("ALTER TABLE _fast_migrations ADD COLUMN IF NOT EXISTS checksum TEXT NOT NULL DEFAULT ''");
    await connection.query("ALTER TABLE _fast_migrations ADD COLUMN IF NOT EXISTS tool_version TEXT NOT NULL DEFAULT 'legacy'");
    await connection.query("ALTER TABLE _fast_migrations ADD COLUMN IF NOT EXISTS execution_ms BIGINT NOT NULL DEFAULT 0");
    await connection.query("ALTER TABLE _fast_migrations ADD COLUMN IF NOT EXISTS legacy_baseline BOOLEAN NOT NULL DEFAULT TRUE");
    const known = await connection.query<{ id: string; checksum: string; legacy_baseline: boolean }>("SELECT id, checksum, legacy_baseline FROM _fast_migrations ORDER BY id");
    const applied = new Set<string>();
    for (const row of known.rows) {
      const checksum = expected.get(row.id);
      if (!checksum) throw new PostgresMigrationError("MIGRATION_HISTORY_MISSING", `Applied PostgreSQL migration '${row.id}' is missing from the immutable migration list.`, row.id);
      if (!row.checksum) {
        await connection.query("UPDATE _fast_migrations SET checksum = $2, tool_version = $3, execution_ms = 0, legacy_baseline = TRUE WHERE id = $1 AND checksum = ''", [row.id, checksum, toolVersion]);
      } else if (row.checksum !== checksum) {
        throw new PostgresMigrationError("MIGRATION_DRIFT", `Applied PostgreSQL migration '${row.id}' no longer matches its recorded checksum. Create a new migration instead of editing deployed history.`, row.id);
      }
      applied.add(row.id);
    }
    const completed: string[] = [];
    for (const migration of migrations) {
      if (applied.has(migration.id)) continue;
      const started = now();
      await connection.query(migration.up);
      const duration = Math.max(0, Math.round(now() - started));
      await connection.query("INSERT INTO _fast_migrations (id, checksum, tool_version, execution_ms, legacy_baseline) VALUES ($1, $2, $3, $4, FALSE)", [migration.id, expected.get(migration.id)!, toolVersion, duration]);
      completed.push(migration.id);
    }
    return Object.freeze(completed);
  });
}

/** Returns the deterministic SHA-256 checksum used to lock deployed migration source. */
export function checksumPostgresMigration(migration: PostgresMigration): string {
  return createHash("sha256").update(migration.up, "utf8").digest("hex");
}
