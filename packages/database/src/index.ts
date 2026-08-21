export interface DatabaseAdapter<Connection> {
  readonly acquire: () => Connection | Promise<Connection>;
  readonly release: (connection: Connection) => void | Promise<void>;
  readonly transaction?: <Result>(connection: Connection, operation: (transaction: Connection) => Promise<Result>) => Promise<Result>;
  readonly close?: () => void | Promise<void>;
}

export interface Database<Connection> {
  readonly run: <Result>(operation: (connection: Connection) => Result | Promise<Result>) => Promise<Result>;
  readonly transaction: <Result>(operation: (transaction: Connection) => Result | Promise<Result>) => Promise<Result>;
  readonly close: () => Promise<void>;
}

export function defineDatabaseAdapter<Connection>(adapter: DatabaseAdapter<Connection>): DatabaseAdapter<Connection> {
  return Object.freeze(adapter);
}

export function createDatabase<Connection>(adapter: DatabaseAdapter<Connection>): Database<Connection> {
  return {
    async run(operation) {
      const connection = await adapter.acquire();
      try {
        return await operation(connection);
      } finally {
        await adapter.release(connection);
      }
    },
    async transaction(operation) {
      if (!adapter.transaction) throw new Error("This database adapter does not support transactions");
      const connection = await adapter.acquire();
      try {
        return await adapter.transaction(connection, async (transaction) => operation(transaction));
      } finally {
        await adapter.release(connection);
      }
    },
    async close() {
      await adapter.close?.();
    },
  };
}
