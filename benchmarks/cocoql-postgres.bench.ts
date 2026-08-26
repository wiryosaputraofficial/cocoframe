import { performance } from "node:perf_hooks";
import {
  compileCocoQLPostgres,
  compileCocoQLToPostgres,
  defineCocoQLPermissions,
  defineCocoQLSafetyPolicy,
  defineCocoQLSchema,
  parseCocoQL,
  planCocoQL,
  type CocoQLPostgresPredicate,
} from "../packages/cocoql/src/index.ts";
import { createCocoQLPostgresExecutor, type PostgresPool } from "../packages/database-postgres/src/index.ts";

const schema = defineCocoQLSchema({
  version: "0.1",
  entities: {
    users: { table: "users", fields: { id: { type: "id" }, email: { type: "string", unique: true }, status: { type: "enum", values: ["active", "inactive"] }, age: { type: "number" } } },
  },
});
const permissions = defineCocoQLPermissions({ version: "0.1", entities: { users: { fields: ["id", "email", "status", "age"] } } });
const safety = defineCocoQLSafetyPolicy({
  version: "0.1",
  read: { requireTake: true, maxTake: 100, maxSkip: 100, maxFilters: 100, maxProjectedFields: 4, maxRelations: 0, maxRelationDepth: 0, maxGroupFields: 2, maxAggregates: 2 },
  mutation: { requireFilterForUpdate: true, requireFilterForDelete: true, requireConfirmation: true, maxAffectedRows: 100, maxFilters: 10, maxChanges: 4 },
});
const source = "from users\nfilter status = active\nfilter age >= 18\nselect id,email\nsort id asc\ntake 20";
const plan = planCocoQL(parseCocoQL("from users\nselect id,email\nsort id asc\ntake 100"), schema);
const filter = planCocoQL(parseCocoQL("from users\nfilter age >= 18\nselect id\ntake 1"), schema).filters[0]!;
const predicate: CocoQLPostgresPredicate = {
  kind: "any",
  predicates: Array.from({ length: 100 }, () => ({ kind: "condition" as const, filter })),
};
const pool: PostgresPool = {
  async connect() {
    return {
      async query<Row extends Record<string, unknown>>(text: string) {
        return { rows: [] as Row[], rowCount: text.startsWith("SELECT\n") ? 0 : 0 };
      },
      release() {},
    };
  },
};
const executor = createCocoQLPostgresExecutor(pool);

for (let index = 0; index < 100; index++) compileCocoQLPostgres(source, schema);
const normal = measure(2_000, () => compileCocoQLPostgres(source, schema));
const complex = measure(500, () => compileCocoQLToPostgres(plan, schema, { predicate }));
for (let index = 0; index < 50; index++) await executor.read({ source, schema, permissions, safety });
const execution = await measureAsync(1_000, () => executor.read({ source, schema, permissions, safety }));

const thresholds = { normalCompileP95Ms: 5, complexCompileMaximumMs: 50, executorOverheadP95Ms: 2 } as const;
const report = {
  iterations: { normal: 2_000, complex: 500, executor: 1_000 },
  milliseconds: {
    normalCompileP95: round(percentile(normal, 0.95)),
    complexCompileMaximum: round(Math.max(...complex)),
    executorOverheadP95: round(percentile(execution, 0.95)),
  },
  thresholds,
  note: "Executor uses an immediate structural pool so measurements exclude PostgreSQL network and server latency.",
};
console.log(JSON.stringify(report, null, 2));
if (report.milliseconds.normalCompileP95 > thresholds.normalCompileP95Ms
  || report.milliseconds.complexCompileMaximum > thresholds.complexCompileMaximumMs
  || report.milliseconds.executorOverheadP95 > thresholds.executorOverheadP95Ms) process.exitCode = 1;

function measure(iterations: number, operation: () => unknown): number[] {
  const samples: number[] = [];
  for (let index = 0; index < iterations; index++) {
    const start = performance.now();
    operation();
    samples.push(performance.now() - start);
  }
  return samples;
}

async function measureAsync(iterations: number, operation: () => Promise<unknown>): Promise<number[]> {
  const samples: number[] = [];
  for (let index = 0; index < iterations; index++) {
    const start = performance.now();
    await operation();
    samples.push(performance.now() - start);
  }
  return samples;
}

function percentile(values: readonly number[], ratio: number): number {
  return [...values].sort((left, right) => left - right)[Math.ceil(values.length * ratio) - 1]!;
}

function round(value: number): number { return Number(value.toFixed(3)); }
