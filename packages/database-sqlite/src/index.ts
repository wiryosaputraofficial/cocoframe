import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { createDatabase, defineDatabaseAdapter, type Database, type DatabaseAdapter } from "@cocoframe/database";

export interface SqliteOptions {
  readonly filename: string;
  readonly foreignKeys?: boolean;
}

export interface SqliteMigration {
  readonly id: string;
  readonly up: string;
}

export interface SqliteRunResult {
  readonly changes: number;
  readonly lastInsertRowid: number | bigint;
}

export interface SqliteConnection {
  readonly exec: (sql: string) => void;
  readonly run: (sql: string, ...parameters: SQLInputValue[]) => SqliteRunResult;
  readonly get: <Row extends Record<string, unknown>>(sql: string, ...parameters: SQLInputValue[]) => Row | undefined;
  readonly all: <Row extends Record<string, unknown>>(sql: string, ...parameters: SQLInputValue[]) => readonly Row[];
  readonly migrate: (migrations: readonly SqliteMigration[]) => void;
}

export function createSqliteAdapter(options: SqliteOptions): DatabaseAdapter<SqliteConnection> {
  const native = new DatabaseSync(options.filename);
  if (options.foreignKeys ?? true) native.exec("PRAGMA foreign_keys = ON");
  let available = true;
  let closed = false;
  const waiters: Array<(connection: SqliteConnection) => void> = [];
  const connection: SqliteConnection = {
    exec(sql) {
      native.exec(sql);
    },
    run(sql, ...parameters) {
      const result = native.prepare(sql).run(...parameters);
      return { changes: Number(result.changes), lastInsertRowid: result.lastInsertRowid };
    },
    get<Row extends Record<string, unknown>>(sql: string, ...parameters: SQLInputValue[]) {
      const row = native.prepare(sql).get(...parameters);
      return row ? { ...row } as Row : undefined;
    },
    all<Row extends Record<string, unknown>>(sql: string, ...parameters: SQLInputValue[]) {
      return native.prepare(sql).all(...parameters).map((row) => ({ ...row } as Row));
    },
    migrate(migrations) {
      native.exec("CREATE TABLE IF NOT EXISTS _fast_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
      const known = new Set(native.prepare("SELECT id FROM _fast_migrations").all().map((row) => String(row.id)));
      const insert = native.prepare("INSERT INTO _fast_migrations (id, applied_at) VALUES (?, ?)");
      native.exec("BEGIN IMMEDIATE");
      try {
        for (const migration of migrations) {
          if (known.has(migration.id)) continue;
          native.exec(migration.up);
          insert.run(migration.id, new Date().toISOString());
        }
        native.exec("COMMIT");
      } catch (error) {
        native.exec("ROLLBACK");
        throw error;
      }
    },
  };

  return defineDatabaseAdapter({
    acquire() {
      if (closed) throw new Error("SQLite database is closed");
      if (available) {
        available = false;
        return connection;
      }
      return new Promise<SqliteConnection>((resolve) => waiters.push(resolve));
    },
    release() {
      const waiter = waiters.shift();
      if (waiter) waiter(connection);
      else available = true;
    },
    async transaction(current, operation) {
      current.exec("BEGIN IMMEDIATE");
      try {
        const result = await operation(current);
        current.exec("COMMIT");
        return result;
      } catch (error) {
        current.exec("ROLLBACK");
        throw error;
      }
    },
    close() {
      if (waiters.length > 0 || !available) throw new Error("Cannot close SQLite while operations are active");
      closed = true;
      native.close();
    },
  });
}

export function openSqlite(options: SqliteOptions): Database<SqliteConnection> {
  return createDatabase(createSqliteAdapter(options));
}
