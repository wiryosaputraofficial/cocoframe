import { createDatabase, defineDatabaseAdapter, type Database, type DatabaseAdapter } from "@cocoframe/database";

export interface PostgresQueryResult<Row extends Record<string, unknown> = Record<string, unknown>> {
  readonly rows: readonly Row[];
  readonly rowCount: number | null;
}

export interface PostgresPoolClient {
  readonly query: <Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ) => Promise<PostgresQueryResult<Row>>;
  readonly release: () => void;
}

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
): Promise<readonly string[]> {
  const ids = new Set<string>();
  for (const migration of migrations) {
    if (!migration.id || ids.has(migration.id)) throw new Error(`Duplicate or empty PostgreSQL migration id: ${migration.id}`);
    ids.add(migration.id);
  }
  return database.transaction(async (connection) => {
    await connection.query("SELECT pg_advisory_xact_lock($1)", [1_171_422_019]);
    await connection.query("CREATE TABLE IF NOT EXISTS _fast_migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
    const known = await connection.query<{ id: string }>("SELECT id FROM _fast_migrations");
    const applied = new Set(known.rows.map(({ id }) => id));
    const completed: string[] = [];
    for (const migration of migrations) {
      if (applied.has(migration.id)) continue;
      await connection.query(migration.up);
      await connection.query("INSERT INTO _fast_migrations (id) VALUES ($1)", [migration.id]);
      completed.push(migration.id);
    }
    return completed;
  });
}
