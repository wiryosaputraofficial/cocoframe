import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeCocoQL,
  authorizeCocoQLMutation,
  CocoQLError,
  compileCocoQL,
  compileCocoQLPostgres,
  compileCocoQLToMySql,
  compileCocoQLMutation,
  compileCocoQLMutationPostgres,
  compileCocoQLMutationToMySql,
  compileCocoQLMutationToPostgres,
  compileCocoQLToPostgres,
  defineCocoQLSchema,
  defineCocoQLPermissions,
  defineCocoQLSafetyPolicy,
  enforceCocoQLMutationSafety,
  enforceCocoQLSafety,
  formatCocoQL,
  formatCocoQLPlan,
  formatCocoQLMutation,
  lexCocoQL,
  parseCocoQL,
  parseCocoQLMutation,
  planCocoQL,
  planCocoQLMutation,
  previewCocoQLMutation,
  resolveCocoQLDateRange,
  validateCocoQL,
  type CocoQLQueryPlan,
} from "../packages/cocoql/src/index.ts";

const safety = defineCocoQLSafetyPolicy({
  version: "0.1",
  read: { requireTake: true, maxTake: 100, maxSkip: 1_000, maxFilters: 5, maxProjectedFields: 5, maxRelations: 2, maxRelationDepth: 2, maxGroupFields: 2, maxAggregates: 3 },
  mutation: { requireFilterForUpdate: true, requireFilterForDelete: true, requireConfirmation: true, maxAffectedRows: 1_000, maxFilters: 5, maxChanges: 5 },
});

const schema = defineCocoQLSchema({
  version: "0.1",
  entities: {
    users: {
      table: "app_users",
      fields: {
        id: { type: "id", column: "user_id" },
        name: { type: "string" },
        email: { type: "string" },
        age: { type: "number" },
        status: { type: "enum", values: ["active", "inactive"] },
        created_at: { type: "datetime" },
      },
    },
    projects: {
      table: "projects",
      fields: { id: { type: "id" }, name: { type: "string" }, status: { type: "enum", values: ["active", "completed"] }, client_id: { type: "id" } },
      relations: {
        client: { type: "belongs_to", entity: "clients", foreignKey: "client_id" },
        invoices: { type: "has_many", entity: "invoices", foreignKey: "project_id" },
      },
    },
    clients: {
      table: "clients",
      fields: { id: { type: "id" }, name: { type: "string" } },
      relations: { projects: { type: "has_many", entity: "projects", foreignKey: "client_id" } },
    },
    invoices: {
      table: "invoices",
      fields: { id: { type: "id" }, project_id: { type: "id" }, amount: { type: "money" }, status: { type: "enum", values: ["paid", "pending"] } },
      relations: { project: { type: "belongs_to", entity: "projects", foreignKey: "project_id" } },
    },
    orders: {
      table: "orders",
      fields: {
        id: { type: "id" },
        status: { type: "enum", values: ["paid", "pending"] },
        total: { type: "money" },
        created_at: { type: "datetime" },
        due_date: { type: "date", nullable: true },
      },
    },
  },
});

test("lexes and parses a deterministic CocoQL read query", () => {
  const source = `from users

filter age >= 18
filter status = active

select
  id
  name

sort name asc

take 10
skip 2`;
  const tokens = lexCocoQL(source);
  assert.equal(tokens.at(-1)?.kind, "eof");
  assert.deepEqual(parseCocoQL(source), {
    type: "Query",
    version: "0.1",
    source: { entity: "users" },
    with: [],
    filters: [
      { field: "age", operator: ">=", value: { kind: "scalar", value: 18 } },
      { field: "status", operator: "=", value: { kind: "scalar", value: "active" } },
    ],
    group: [],
    select: ["id", "name"],
    aggregates: [],
    sort: [{ field: "name", direction: "asc" }],
    take: 10,
    skip: 2,
  });
});

test("formats compact input into canonical CocoQL", () => {
  assert.equal(formatCocoQL("from users\nfilter age>=18\nselect id,name,email\ntake 10"), `from users

filter age >= 18

select
  id
  name
  email

take 10
`);
});

test("formats explicit relation includes before filters and projection", () => {
  assert.equal(formatCocoQL("from projects\nwith client\nfilter client.name contains corp\nselect id,client.name"), `from projects

with client

filter client.name contains corp

select
  id
  client.name
`);
});

test("parses and canonically formats named and relative semantic dates", () => {
  const query = parseCocoQL(`from orders
filter created_at in this_month
filter created_at not in last 7 days
filter due_date before today
select id`);
  assert.deepEqual(query.filters.map((filter) => filter.value), [
    { kind: "semantic-date", expression: { kind: "named", value: "this_month" } },
    { kind: "semantic-date", expression: { kind: "relative", direction: "last", amount: 7, unit: "days" } },
    { kind: "semantic-date", expression: { kind: "named", value: "today" } },
  ]);
  assert.equal(formatCocoQL(`from orders
filter created_at in next 1 day
select id`), `from orders

filter created_at in next 1 days

select
  id
`);
});

test("resolves every named semantic date to deterministic UTC ranges", () => {
  const now = new Date("2026-08-21T13:45:00.000Z");
  const expected = {
    today: ["2026-08-21T00:00:00.000Z", "2026-08-22T00:00:00.000Z"],
    yesterday: ["2026-08-20T00:00:00.000Z", "2026-08-21T00:00:00.000Z"],
    this_week: ["2026-08-17T00:00:00.000Z", "2026-08-24T00:00:00.000Z"],
    last_week: ["2026-08-10T00:00:00.000Z", "2026-08-17T00:00:00.000Z"],
    this_month: ["2026-08-01T00:00:00.000Z", "2026-09-01T00:00:00.000Z"],
    last_month: ["2026-07-01T00:00:00.000Z", "2026-08-01T00:00:00.000Z"],
    this_year: ["2026-01-01T00:00:00.000Z", "2027-01-01T00:00:00.000Z"],
    last_year: ["2025-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"],
  } as const;
  for (const [value, range] of Object.entries(expected)) {
    const result = resolveCocoQLDateRange({ kind: "named", value: value as keyof typeof expected }, now);
    assert.deepEqual([result.start, result.end], range);
    assert.equal(result.timeZone, "UTC");
  }
});

test("plans semantic ranges with an injected clock and compiles MySQL parameters", () => {
  const source = `from orders
filter created_at in this_month
filter created_at not in last 7 days
filter due_date after today
select id`;
  const now = new Date("2026-08-21T13:45:00.000Z");
  const first = planCocoQL(parseCocoQL(source), schema, { now });
  const second = planCocoQL(parseCocoQL(source), schema, { now });
  assert.deepEqual(first, second);
  assert.deepEqual(first.filters.map((filter) => filter.value.kind), ["date-range", "date-range", "date-range"]);
  assert.deepEqual(first.filters[0]?.value, {
    kind: "date-range",
    start: "2026-08-01T00:00:00.000Z",
    end: "2026-09-01T00:00:00.000Z",
    timeZone: "UTC",
    expression: { kind: "named", value: "this_month" },
  });
  const result = compileCocoQLToMySql(first, schema);
  assert.equal(result.sql, `SELECT
  \`id\`
FROM \`orders\`
WHERE (\`created_at\` >= ? AND \`created_at\` < ?)
  AND (\`created_at\` < ? OR \`created_at\` >= ?)
  AND \`due_date\` >= ?;`);
  assert.deepEqual(result.parameters, [
    "2026-08-01 00:00:00.000", "2026-09-01 00:00:00.000",
    "2026-08-15 00:00:00.000", "2026-08-22 00:00:00.000",
    "2026-08-22",
  ]);
});

test("rejects invalid semantic date usage and forged ranges", () => {
  assert.throws(
    () => compileCocoQL("from orders\nfilter status in today\nselect id", schema),
    (error: unknown) => error instanceof CocoQLError && error.issue.error === "INVALID_VALUE",
  );
  assert.throws(
    () => parseCocoQL("from orders\nfilter created_at in last 0 days\nselect id"),
    (error: unknown) => error instanceof CocoQLError && error.issue.error === "INVALID_VALUE",
  );
  assert.throws(
    () => parseCocoQL("from orders\nfilter created_at in next 2 weeks\nselect id"),
    (error: unknown) => error instanceof CocoQLError && error.issue.error === "SYNTAX_ERROR",
  );
  const valid = planCocoQL(parseCocoQL("from orders\nfilter created_at in today\nselect id"), schema, { now: new Date("2026-08-21T12:00:00.000Z") });
  const forged = {
    ...valid,
    filters: [{ ...valid.filters[0]!, value: { ...valid.filters[0]!.value, start: "2026-08-23T00:00:00.000Z", end: "2026-08-22T00:00:00.000Z" } }],
  } as CocoQLQueryPlan;
  assert.throws(
    () => compileCocoQLToMySql(forged, schema),
    (error: unknown) => error instanceof CocoQLError && error.issue.error === "INVALID_PLAN",
  );
});

test("parses and formats deterministic grouped aggregate expressions", () => {
  const source = `from orders
filter created_at in this_year
group status
select
  status
  sum(total) as revenue
  count(id) as order_count
sort revenue desc
take 10`;
  const query = parseCocoQL(source);
  assert.deepEqual(query.group, ["status"]);
  assert.deepEqual(query.select, ["status"]);
  assert.deepEqual(query.aggregates, [
    { function: "sum", field: "total", alias: "revenue" },
    { function: "count", field: "id", alias: "order_count" },
  ]);
  assert.equal(formatCocoQL(source), `from orders

filter created_at in this_year

group status

select
  status
  sum(total) as revenue
  count(id) as order_count

sort revenue desc

take 10
`);
});

test("plans and compiles grouping, aggregate aliases, and aggregate sorting", () => {
  const plan = planCocoQL(parseCocoQL(`from orders
filter status = paid
group status
select status,sum(total) as revenue,count(id) as order_count
sort revenue desc
take 10`), schema);
  assert.deepEqual(plan.groupBy, [{ entity: "orders", field: "status", relationPath: null }]);
  assert.deepEqual(plan.aggregates, [
    { function: "sum", field: { entity: "orders", field: "total", relationPath: null }, alias: "revenue" },
    { function: "count", field: { entity: "orders", field: "id", relationPath: null }, alias: "order_count" },
  ]);
  assert.deepEqual(plan.orderBy, [{ by: { kind: "aggregate", alias: "revenue" }, direction: "desc" }]);
  const result = compileCocoQLToMySql(plan, schema);
  assert.equal(result.sql, `SELECT
  \`status\`,
  SUM(\`total\`) AS \`revenue\`,
  COUNT(\`id\`) AS \`order_count\`
FROM \`orders\`
WHERE \`status\` = ?
GROUP BY \`status\`
ORDER BY \`revenue\` DESC
LIMIT ?;`);
  assert.deepEqual(result.parameters, ["paid", 10]);
});

test("compiles aggregates across nested schema relations", () => {
  const result = compileCocoQL(`from clients
with projects.invoices
filter projects.invoices.status = paid
group projects.name
select projects.name,sum(projects.invoices.amount) as revenue
sort revenue desc`, schema);
  assert.equal(result.sql, `SELECT
  \`t1\`.\`name\` AS \`projects.name\`,
  SUM(\`t2\`.\`amount\`) AS \`revenue\`
FROM \`clients\` AS \`t0\`
LEFT JOIN \`projects\` AS \`t1\` ON \`t1\`.\`client_id\` = \`t0\`.\`id\`
LEFT JOIN \`invoices\` AS \`t2\` ON \`t2\`.\`project_id\` = \`t1\`.\`id\`
WHERE \`t2\`.\`status\` = ?
GROUP BY \`t1\`.\`name\`
ORDER BY \`revenue\` DESC;`);
  assert.deepEqual(result.parameters, ["paid"]);
});

test("supports aggregate-only queries without a group clause", () => {
  const result = compileCocoQL("from orders\nselect avg(total) as average_total", schema);
  assert.equal(result.sql, "SELECT\n  AVG(`total`) AS `average_total`\nFROM `orders`;");
  assert.deepEqual(result.parameters, []);
});

test("rejects ambiguous or type-invalid aggregation", () => {
  const invalidQueries = [
    "from orders\nselect id,sum(total) as revenue",
    "from orders\ngroup status\nselect status",
    "from orders\ngroup status\nselect status,sum(status) as revenue",
    "from orders\ngroup status\nselect status,sum(total) as metric,count(id) as metric",
  ];
  for (const source of invalidQueries) {
    assert.throws(
      () => compileCocoQL(source, schema),
      (error: unknown) => error instanceof CocoQLError && error.issue.error === "INVALID_AGGREGATION",
    );
  }
  assert.throws(
    () => parseCocoQL("from orders\ngroup status\nselect sum(total) as revenue,status"),
    (error: unknown) => error instanceof CocoQLError && error.issue.error === "SYNTAX_ERROR",
  );
});

test("rejects forged aggregate functions before SQL compilation", () => {
  const valid = planCocoQL(parseCocoQL("from orders\nselect sum(total) as revenue"), schema);
  const forged = {
    ...valid,
    aggregates: [{ ...valid.aggregates[0]!, function: "sum) FROM orders; DROP TABLE users; --" }],
  } as unknown as CocoQLQueryPlan;
  assert.throws(
    () => compileCocoQLToMySql(forged, schema),
    (error: unknown) => error instanceof CocoQLError && error.issue.error === "INVALID_PLAN",
  );
});

test("builds a deterministic, dialect-independent query plan", () => {
  const source = `from users
filter age >= 18
select id,name
sort name asc
take 10
skip 2`;
  const first = planCocoQL(parseCocoQL(source), schema);
  const second = planCocoQL(parseCocoQL(source), schema);
  assert.deepEqual(first, second);
  assert.deepEqual(first, {
    type: "QueryPlan",
    version: "0.1",
    operation: "select",
    rootEntity: "users",
    joins: [],
    projection: [
      { entity: "users", field: "id", relationPath: null },
      { entity: "users", field: "name", relationPath: null },
    ],
    filters: [{
      field: { entity: "users", field: "age", relationPath: null },
      operator: ">=",
      value: { kind: "scalar", value: 18 },
    }],
    groupBy: [],
    aggregates: [],
    orderBy: [{ by: { kind: "field", field: { entity: "users", field: "name", relationPath: null } }, direction: "asc" }],
    limit: 10,
    offset: 2,
  });
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.projection));
  const serialized = formatCocoQLPlan(first);
  assert.equal(serialized, `${JSON.stringify(first, null, 2)}\n`);
  assert.doesNotMatch(serialized, /mysql|app_users|user_id|sql/i);
});

test("validates fields and returns a self-correctable structured error", () => {
  const query = parseCocoQL("from projects\nselect id,clientname");
  assert.throws(() => validateCocoQL(query, schema), (error: unknown) => {
    assert.ok(error instanceof CocoQLError);
    assert.equal(error.issue.type, "CocoQLIssue");
    assert.equal(error.issue.version, "0.1");
    assert.equal(error.issue.error, "UNKNOWN_FIELD");
    assert.equal(error.issue.stage, "semantic");
    assert.equal(error.issue.entity, "projects");
    assert.equal(error.issue.field, "clientname");
    assert.deepEqual(error.issue.location, { line: 2, column: 11, endLine: 2, endColumn: 21 });
    assert.deepEqual(error.issue.path, ["select", 1]);
    assert.ok(error.issue.suggestions?.includes("name"));
    assert.deepEqual(error.issue.availableFields, ["client_id", "id", "name", "status"]);
    assert.deepEqual(error.toJSON(), error.issue);
    assert.ok(Object.isFrozen(error.issue));
    assert.ok(Object.isFrozen(error.issue.location));
    assert.ok(Object.isFrozen(error.issue.path));
    assert.ok(Object.isFrozen(error.issue.suggestions));
    assert.ok(Object.isFrozen(error.issue.availableFields));
    assert.deepEqual(JSON.parse(JSON.stringify(error)), error.issue);
    assert.doesNotMatch(JSON.stringify(error), /stack|app_users|projects\.ts/i);
    return true;
  });
});

test("labels lexer and parser failures with precise pipeline stages", () => {
  assert.throws(() => parseCocoQL("from users\nselect id@"), (error: unknown) => {
    assert.ok(error instanceof CocoQLError);
    assert.equal(error.issue.stage, "lexer");
    assert.deepEqual(error.issue.location, { line: 2, column: 10, endLine: 2, endColumn: 11 });
    return true;
  });
  assert.throws(() => parseCocoQL("from users\nselect id\nfilter status = active"), (error: unknown) => {
    assert.ok(error instanceof CocoQLError);
    assert.equal(error.issue.stage, "parser");
    assert.deepEqual(error.issue.location, { line: 3, column: 1, endLine: 3, endColumn: 7 });
    return true;
  });
});

test("authorizes an explicit read policy before query planning", () => {
  const permissions = defineCocoQLPermissions({
    version: "0.1",
    entities: {
      projects: { fields: ["id", "status"], relations: ["client"] },
      clients: { fields: ["name"] },
    },
  });
  const query = parseCocoQL(`from projects
with client
filter status = active
select id,client.name`);
  assert.equal(authorizeCocoQL(query, schema, permissions), query);
  assert.equal(planCocoQL(query, schema).joins[0]?.targetEntity, "clients");
  assert.ok(Object.isFrozen(permissions));
  assert.ok(Object.isFrozen(permissions.entities));
  assert.ok(Object.isFrozen(permissions.entities.projects));
  assert.ok(Object.isFrozen(permissions.entities.projects?.fields));
  assert.ok(Object.isFrozen(permissions.entities.projects?.relations));
});

test("denies fields with source locations without leaking allowed policy names", () => {
  const permissions = defineCocoQLPermissions({ version: "0.1", entities: { projects: { fields: ["id"] } } });
  const query = parseCocoQL(`from projects
select
  id
  name`);
  assert.throws(() => authorizeCocoQL(query, schema, permissions), (error: unknown) => {
    assert.ok(error instanceof CocoQLError);
    assert.equal(error.issue.error, "PERMISSION_DENIED");
    assert.equal(error.issue.stage, "permission");
    assert.equal(error.issue.operation, "read");
    assert.equal(error.issue.permission, "field");
    assert.equal(error.issue.entity, "projects");
    assert.equal(error.issue.field, "name");
    assert.deepEqual(error.issue.location, { line: 4, column: 3, endLine: 4, endColumn: 7 });
    assert.deepEqual(error.issue.path, ["select", 1]);
    assert.equal(error.issue.suggestions, undefined);
    assert.equal(error.issue.availableFields, undefined);
    return true;
  });
});

test("denies root entities that have no explicit policy rule", () => {
  const permissions = defineCocoQLPermissions({ version: "0.1", entities: { users: { fields: ["id"] } } });
  assert.throws(() => authorizeCocoQL(parseCocoQL("from projects\nselect id"), schema, permissions), (error: unknown) => {
    assert.ok(error instanceof CocoQLError);
    assert.equal(error.issue.permission, "entity");
    assert.equal(error.issue.entity, "projects");
    assert.deepEqual(error.issue.path, ["source", "entity"]);
    assert.deepEqual(error.issue.location, { line: 1, column: 6, endLine: 1, endColumn: 14 });
    return true;
  });
});

test("denies relation traversal and aggregate functions independently", () => {
  const relationPolicy = defineCocoQLPermissions({
    version: "0.1",
    entities: {
      projects: { fields: ["id"] },
      clients: { fields: ["name"] },
    },
  });
  assert.throws(() => authorizeCocoQL(parseCocoQL("from projects\nwith client\nselect id,client.name"), schema, relationPolicy), (error: unknown) => {
    assert.ok(error instanceof CocoQLError);
    assert.equal(error.issue.permission, "relation");
    assert.equal(error.issue.relation, "client");
    assert.deepEqual(error.issue.path, ["with", 0]);
    assert.deepEqual(error.issue.location, { line: 2, column: 6, endLine: 2, endColumn: 12 });
    return true;
  });

  const aggregatePolicy = defineCocoQLPermissions({
    version: "0.1",
    entities: { orders: { fields: ["id", "status", "total"], aggregates: ["count"] } },
  });
  assert.throws(() => authorizeCocoQL(parseCocoQL(`from orders
group status
select
  status
  sum(total) as revenue`), schema, aggregatePolicy), (error: unknown) => {
    assert.ok(error instanceof CocoQLError);
    assert.equal(error.issue.permission, "aggregate");
    assert.equal(error.issue.field, "total");
    assert.deepEqual(error.issue.path, ["aggregates", 0]);
    return true;
  });
});

test("rejects permission policies that do not match the public schema", () => {
  const policy = defineCocoQLPermissions({ version: "0.1", entities: { projects: { fields: ["secret"] } } });
  assert.throws(() => authorizeCocoQL(parseCocoQL("from projects\nselect id"), schema, policy), (error: unknown) => {
    assert.ok(error instanceof CocoQLError);
    assert.equal(error.issue.error, "INVALID_PERMISSION_POLICY");
    assert.equal(error.issue.stage, "permission");
    assert.deepEqual(error.issue.path, ["entities", "projects", "fields"]);
    return true;
  });
});

test("requires relation traversal to be included explicitly", () => {
  const query = parseCocoQL("from projects\nselect id,client.name");
  assert.throws(() => validateCocoQL(query, schema), (error: unknown) => {
    assert.ok(error instanceof CocoQLError);
    assert.equal(error.issue.error, "RELATION_NOT_INCLUDED");
    assert.equal(error.issue.relation, "client");
    assert.deepEqual(error.issue.suggestions, ["with client"]);
    return true;
  });
});

test("rejects unknown relations without guessing an entity name", () => {
  const query = parseCocoQL("from projects\nwith customer\nselect id,customer.name");
  assert.throws(() => validateCocoQL(query, schema), (error: unknown) => {
    assert.ok(error instanceof CocoQLError);
    assert.equal(error.issue.error, "UNKNOWN_RELATION");
    assert.equal(error.issue.entity, "projects");
    assert.equal(error.issue.relation, "customer");
    assert.deepEqual(error.issue.availableRelations, ["client", "invoices"]);
    return true;
  });
});

test("does not resolve inherited object properties as schema names", () => {
  assert.throws(
    () => compileCocoQL("from __proto__\nselect id", schema),
    (error: unknown) => error instanceof CocoQLError && error.issue.error === "UNKNOWN_ENTITY",
  );
  assert.throws(
    () => compileCocoQL("from projects\nwith __proto__\nselect id", schema),
    (error: unknown) => error instanceof CocoQLError && error.issue.error === "UNKNOWN_RELATION",
  );
});

test("plans and compiles a schema-aware belongs-to relation", () => {
  const query = parseCocoQL(`from projects
with client
filter client.name contains corp
select id,name,client.name
sort client.name asc
take 10`);
  const plan = planCocoQL(query, schema);
  assert.deepEqual(plan.joins, [{
    path: "client",
    parentPath: null,
    relation: "client",
    fromEntity: "projects",
    targetEntity: "clients",
    kind: "left",
  }]);
  assert.deepEqual(plan.projection.at(-1), { entity: "clients", field: "name", relationPath: "client" });
  const result = compileCocoQLToMySql(plan, schema);
  assert.equal(result.sql, `SELECT
  \`t0\`.\`id\`,
  \`t0\`.\`name\`,
  \`t1\`.\`name\` AS \`client.name\`
FROM \`projects\` AS \`t0\`
LEFT JOIN \`clients\` AS \`t1\` ON \`t0\`.\`client_id\` = \`t1\`.\`id\`
WHERE \`t1\`.\`name\` LIKE ?
ORDER BY \`t1\`.\`name\` ASC
LIMIT ?;`);
  assert.deepEqual(result.parameters, ["%corp%", 10]);
});

test("expands and compiles nested has-many relation paths parent-first", () => {
  const plan = planCocoQL(parseCocoQL(`from clients
with projects.invoices
select id,projects.name,projects.invoices.amount`), schema);
  assert.deepEqual(plan.joins.map((join) => join.path), ["projects", "projects.invoices"]);
  const result = compileCocoQLToMySql(plan, schema);
  assert.equal(result.sql, `SELECT
  \`t0\`.\`id\`,
  \`t1\`.\`name\` AS \`projects.name\`,
  \`t2\`.\`amount\` AS \`projects.invoices.amount\`
FROM \`clients\` AS \`t0\`
LEFT JOIN \`projects\` AS \`t1\` ON \`t1\`.\`client_id\` = \`t0\`.\`id\`
LEFT JOIN \`invoices\` AS \`t2\` ON \`t2\`.\`project_id\` = \`t1\`.\`id\`;`);
  assert.deepEqual(result.parameters, []);
});

test("rejects relation schemas whose join key is not declared", () => {
  const brokenSchema = defineCocoQLSchema({
    version: "0.1",
    entities: {
      projects: { table: "projects", fields: { id: { type: "id" } }, relations: { client: { type: "belongs_to", entity: "clients", foreignKey: "missing_client_id" } } },
      clients: { table: "clients", fields: { id: { type: "id" } } },
    },
  });
  assert.throws(
    () => compileCocoQL("from projects\nwith client\nselect id,client.id", brokenSchema),
    (error: unknown) => error instanceof CocoQLError && error.issue.error === "INVALID_SCHEMA",
  );
});

test("compiles validated reads to parameterized MySQL", () => {
  const result = compileCocoQL(`from users
filter age >= 18
filter status in [active, inactive]
filter email contains "@example.com"
select id,name,email
sort name asc
take 10
skip 2`, schema);
  assert.equal(result.sql, `SELECT
  \`user_id\`,
  \`name\`,
  \`email\`
FROM \`app_users\`
WHERE \`age\` >= ?
  AND \`status\` IN (?, ?)
  AND \`email\` LIKE ?
ORDER BY \`name\` ASC
LIMIT ?
OFFSET ?;`);
  assert.deepEqual(result.parameters, [18, "active", "inactive", "%@example.com%", 10, 2]);
  assert.doesNotMatch(result.sql, /@example\.com|active/);
});

test("the MySQL compiler accepts a query plan instead of an AST", () => {
  const plan = planCocoQL(parseCocoQL("from users\nfilter name starts_with Jo\nselect id,name"), schema);
  const result = compileCocoQLToMySql(plan, schema);
  assert.equal(result.sql, "SELECT\n  `user_id`,\n  `name`\nFROM `app_users`\nWHERE `name` LIKE ?;");
  assert.deepEqual(result.parameters, ["jo%"]);
});

test("rejects forged query plans before dialect compilation", () => {
  const valid = planCocoQL(parseCocoQL("from users\nselect id"), schema);
  const forgedOperator = {
    ...valid,
    filters: [{ field: { entity: "users", field: "name", relationPath: null }, operator: "= ?; DROP TABLE users; --", value: { kind: "scalar", value: "x" } }],
  } as unknown as CocoQLQueryPlan;
  assert.throws(() => compileCocoQLToMySql(forgedOperator, schema), (error: unknown) => {
    assert.ok(error instanceof CocoQLError);
    assert.equal(error.issue.error, "INVALID_PLAN");
    assert.equal(error.issue.stage, "planner");
    assert.deepEqual(error.issue.path, ["filters", 0, "operator"]);
    assert.equal(error.issue.location, undefined);
    return true;
  });

  const crossEntity = {
    ...valid,
    projection: [{ entity: "projects", field: "id", relationPath: null }],
  } as CocoQLQueryPlan;
  assert.throws(() => compileCocoQLToMySql(crossEntity, schema), (error: unknown) => error instanceof CocoQLError && error.issue.error === "INVALID_PLAN");
});

test("rejects unsafe mutations before SQL compilation", () => {
  assert.throws(() => parseCocoQL("from users\ndelete"), (error: unknown) => {
    assert.ok(error instanceof CocoQLError);
    assert.equal(error.issue.error, "UNSAFE_MUTATION");
    assert.equal(error.issue.stage, "parser");
    assert.deepEqual(error.issue.path, ["delete"]);
    assert.deepEqual(error.issue.location, { line: 2, column: 1, endLine: 2, endColumn: 7 });
    return true;
  });
});

test("rejects non-canonical clause order instead of guessing intent", () => {
  assert.throws(() => parseCocoQL("from users\nselect id\nfilter status = active"), (error: unknown) => error instanceof CocoQLError && error.issue.error === "SYNTAX_ERROR");
  assert.throws(() => parseCocoQL("from users\nselect id\nselect name"), (error: unknown) => error instanceof CocoQLError && error.issue.error === "SYNTAX_ERROR");
});

test("validates enum values and query limits", () => {
  assert.throws(() => compileCocoQL("from users\nfilter status = pending\nselect id", schema), (error: unknown) => error instanceof CocoQLError && error.issue.error === "INVALID_VALUE");
  assert.throws(() => compileCocoQL("from users\nselect id\ntake 10001", schema), (error: unknown) => error instanceof CocoQLError && error.issue.error === "INVALID_LIMIT");
});

test("enforces deterministic read safety limits with structured rules", () => {
  const query = parseCocoQL("from users\nfilter status = active\nselect id,name\ntake 25");
  const report = enforceCocoQLSafety(query, schema, safety);
  assert.deepEqual(report.metrics, { take: 25, skip: 0, filters: 1, projectedFields: 2, relations: 0, relationDepth: 0, groupFields: 0, aggregates: 0 });
  assert.ok(Object.isFrozen(report));
  assert.throws(() => enforceCocoQLSafety(parseCocoQL("from users\nselect id"), schema, safety), (error: unknown) => {
    assert.ok(error instanceof CocoQLError);
    assert.equal(error.issue.error, "SAFETY_VIOLATION");
    assert.equal(error.issue.stage, "safety");
    assert.equal(error.issue.rule, "read.requireTake");
    assert.deepEqual(error.issue.path, ["take"]);
    return true;
  });
  assert.throws(() => enforceCocoQLSafety(parseCocoQL("from users\nselect id\ntake 101"), schema, safety), (error: unknown) => {
    assert.ok(error instanceof CocoQLError);
    assert.equal(error.issue.rule, "read.maxTake");
    assert.deepEqual(error.issue.location, { line: 3, column: 6, endLine: 3, endColumn: 9 });
    return true;
  });
});

test("parses and canonically formats explicit mutation preview syntax", () => {
  const source = `preview
from orders
filter status = pending
update
  status = paid`;
  const mutation = parseCocoQLMutation(source);
  assert.deepEqual(mutation, {
    type: "Mutation", version: "0.1", operation: "update", entity: "orders", preview: true,
    filters: [{ field: "status", operator: "=", value: { kind: "scalar", value: "pending" } }],
    changes: [{ field: "status", value: "paid" }],
  });
  assert.equal(formatCocoQLMutation(source), `preview

from orders

filter status = pending

update

  status = paid
`);
});

test("creates a database-free mutation preview with a public deterministic plan", () => {
  const mutation = parseCocoQLMutation(`preview
from orders
filter due_date before today
update
  status = paid`);
  const safetyReport = enforceCocoQLMutationSafety(mutation, schema, safety);
  assert.equal(safetyReport.allowed, true);
  const preview = previewCocoQLMutation(mutation, schema, { now: new Date("2026-08-21T12:00:00.000Z") });
  assert.equal(preview.estimatedAffectedRows, null);
  assert.equal(preview.estimate, "database-required");
  assert.equal(preview.plan.filters[0]?.value.kind, "date-range");
  assert.doesNotMatch(JSON.stringify(preview), /sql|orders`|where/i);
  assert.ok(Object.isFrozen(preview));
});

test("blocks unsafe update and delete mutations before planning", () => {
  const unfiltered = parseCocoQLMutation("from orders\nupdate\n  status = paid\nconfirm affected <= 10");
  assert.throws(() => enforceCocoQLMutationSafety(unfiltered, schema, safety), (error: unknown) => {
    assert.ok(error instanceof CocoQLError);
    assert.equal(error.issue.rule, "mutation.requireFilterForUpdate");
    assert.equal(error.issue.operation, "update");
    return true;
  });
  const unconfirmed = parseCocoQLMutation("from orders\nfilter status = pending\ndelete");
  assert.throws(() => enforceCocoQLMutationSafety(unconfirmed, schema, safety), (error: unknown) => error instanceof CocoQLError && error.issue.rule === "mutation.requireConfirmation");
  const excessive = parseCocoQLMutation("from orders\nfilter status = pending\ndelete\nconfirm affected <= 1001");
  assert.throws(() => enforceCocoQLMutationSafety(excessive, schema, safety), (error: unknown) => error instanceof CocoQLError && error.issue.rule === "mutation.maxAffectedRows");
});

test("authorizes mutation fields independently with a default-deny policy", () => {
  const mutation = parseCocoQLMutation("from orders\nfilter status = pending\nupdate\n  status = paid\nconfirm affected <= 25");
  const allowed = defineCocoQLPermissions({ version: "0.1", entities: { orders: { fields: ["status"], update: ["status"] } } });
  assert.equal(authorizeCocoQLMutation(mutation, schema, allowed), mutation);
  const denied = defineCocoQLPermissions({ version: "0.1", entities: { orders: { fields: ["status"] } } });
  assert.throws(() => authorizeCocoQLMutation(mutation, schema, denied), (error: unknown) => {
    assert.ok(error instanceof CocoQLError);
    assert.equal(error.issue.error, "PERMISSION_DENIED");
    assert.equal(error.issue.operation, "update");
    assert.equal(error.issue.permission, "field");
    assert.equal(error.issue.suggestions, undefined);
    return true;
  });
});

test("compiles guarded create, update, and delete plans to parameterized MySQL", () => {
  const permissions = defineCocoQLPermissions({ version: "0.1", entities: { orders: { fields: ["id", "status"], create: ["status", "total"], update: ["status"], delete: true } } });
  const update = compileCocoQLMutation("from orders\nfilter status = pending\nupdate\n  status = paid\nconfirm affected <= 25", schema, permissions, safety);
  assert.equal(update.sql, "UPDATE `orders`\nSET `status` = ?\nWHERE `status` = ?;");
  assert.deepEqual(update.parameters, ["paid", "pending"]);
  assert.deepEqual(update.guard, { maxAffectedRows: 25, verifyBeforeCommit: true });
  const create = compileCocoQLMutation("create orders\n  status = pending\n  total = 125\nconfirm affected <= 1", schema, permissions, safety);
  assert.equal(create.sql, "INSERT INTO `orders` (`status`, `total`) VALUES (?, ?);");
  assert.deepEqual(create.parameters, ["pending", 125]);
  const remove = compileCocoQLMutation("from orders\nfilter id = 7\ndelete\nconfirm affected <= 1", schema, permissions, safety);
  assert.equal(remove.sql, "DELETE FROM `orders`\nWHERE `id` = ?;");
  assert.deepEqual(remove.parameters, [7]);
});

test("never compiles preview or forged mutation plans into write SQL", () => {
  const previewPlan = planCocoQLMutation(parseCocoQLMutation("preview\nfrom orders\nfilter status = pending\ndelete"), schema);
  assert.throws(() => compileCocoQLMutationToMySql(previewPlan, schema), (error: unknown) => error instanceof CocoQLError && error.issue.error === "PREVIEW_REQUIRED");
  const valid = planCocoQLMutation(parseCocoQLMutation("from orders\nfilter status = pending\nupdate\n  status = paid\nconfirm affected <= 1"), schema);
  const forged = { ...valid, changes: [{ ...valid.changes[0]!, value: "root" }] };
  assert.throws(() => compileCocoQLMutationToMySql(forged, schema), (error: unknown) => error instanceof CocoQLError && error.issue.error === "INVALID_VALUE");
});

test("compiles validated reads to numbered PostgreSQL parameters", () => {
  const result = compileCocoQLPostgres(`from users
filter age >= 18
filter status in [active, inactive]
filter email contains "@example.com"
select id,name,email
sort name asc
take 10
skip 2`, schema);
  assert.equal(result.dialect, "postgres");
  assert.equal(result.sql, `SELECT
  "user_id",
  "name",
  "email"
FROM "app_users"
WHERE "age" >= $1
  AND "status" IN ($2, $3)
  AND "email" LIKE $4
ORDER BY "name" ASC
LIMIT $5
OFFSET $6;`);
  assert.deepEqual(result.parameters, [18, "active", "inactive", "%@example.com%", 10, 2]);
  assert.doesNotMatch(result.sql, /@example\.com|active/);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.parameters));
});

test("compiles PostgreSQL joins, aggregation, and semantic UTC dates from the shared plan", () => {
  const aggregate = compileCocoQLPostgres(`from clients
with projects.invoices
filter projects.invoices.status = paid
group projects.name
select projects.name,sum(projects.invoices.amount) as revenue
sort revenue desc
take 5`, schema);
  assert.equal(aggregate.sql, `SELECT
  "t1"."name" AS "projects.name",
  SUM("t2"."amount") AS "revenue"
FROM "clients" AS "t0"
LEFT JOIN "projects" AS "t1" ON "t1"."client_id" = "t0"."id"
LEFT JOIN "invoices" AS "t2" ON "t2"."project_id" = "t1"."id"
WHERE "t2"."status" = $1
GROUP BY "t1"."name"
ORDER BY "revenue" DESC
LIMIT $2;`);
  assert.deepEqual(aggregate.parameters, ["paid", 5]);

  const dates = compileCocoQLPostgres("from orders\nfilter created_at in this_month\nfilter due_date before today\nselect id", schema, { now: new Date("2026-08-21T13:45:00.000Z") });
  assert.equal(dates.sql, `SELECT
  "id"
FROM "orders"
WHERE ("created_at" >= $1 AND "created_at" < $2)
  AND "due_date" < $3;`);
  assert.deepEqual(dates.parameters, ["2026-08-01T00:00:00.000Z", "2026-09-01T00:00:00.000Z", "2026-08-21"]);
});

test("uses valid PostgreSQL offset and null semantics without placeholder gaps", () => {
  const result = compileCocoQLPostgres("from orders\nfilter due_date = null\nselect id\nskip 20", schema);
  assert.equal(result.sql, `SELECT
  "id"
FROM "orders"
WHERE "due_date" IS NULL
OFFSET $1;`);
  assert.deepEqual(result.parameters, [20]);
});

test("compiles guarded create, update, and delete mutations for PostgreSQL", () => {
  const permissions = defineCocoQLPermissions({ version: "0.1", entities: { orders: { fields: ["id", "status", "due_date"], create: ["status", "total"], update: ["status"], delete: true } } });
  const update = compileCocoQLMutationPostgres("from orders\nfilter status = pending\nfilter due_date before today\nupdate\n  status = paid\nconfirm affected <= 25", schema, permissions, safety, { now: new Date("2026-08-21T13:45:00.000Z") });
  assert.equal(update.sql, `UPDATE "orders"
SET "status" = $1
WHERE "status" = $2
  AND "due_date" < $3;`);
  assert.deepEqual(update.parameters, ["paid", "pending", "2026-08-21"]);
  assert.deepEqual(update.guard, { maxAffectedRows: 25, verifyBeforeCommit: true });

  const create = compileCocoQLMutationPostgres("create orders\n  status = pending\n  total = 125\nconfirm affected <= 1", schema, permissions, safety);
  assert.equal(create.sql, "INSERT INTO \"orders\" (\"status\", \"total\") VALUES ($1, $2);");
  assert.deepEqual(create.parameters, ["pending", 125]);

  const remove = compileCocoQLMutationPostgres("from orders\nfilter id = 7\ndelete\nconfirm affected <= 1", schema, permissions, safety);
  assert.equal(remove.sql, "DELETE FROM \"orders\"\nWHERE \"id\" = $1;");
  assert.deepEqual(remove.parameters, [7]);
});

test("PostgreSQL compiler rejects preview and forged plans before SQL output", () => {
  const preview = planCocoQLMutation(parseCocoQLMutation("preview\nfrom orders\nfilter id = 7\ndelete"), schema);
  assert.throws(() => compileCocoQLMutationToPostgres(preview, schema), (error: unknown) => error instanceof CocoQLError && error.issue.error === "PREVIEW_REQUIRED");

  const validRead = planCocoQL(parseCocoQL("from users\nselect id"), schema);
  const forgedRead = { ...validRead, filters: [{ field: { entity: "users", field: "name", relationPath: null }, operator: "= $1; DROP TABLE users", value: { kind: "scalar", value: "x" } }] } as unknown as CocoQLQueryPlan;
  assert.throws(() => compileCocoQLToPostgres(forgedRead, schema), (error: unknown) => error instanceof CocoQLError && error.issue.error === "INVALID_PLAN");

  const validMutation = planCocoQLMutation(parseCocoQLMutation("from orders\nfilter status = pending\nupdate\n  status = paid\nconfirm affected <= 1"), schema);
  const forgedMutation = { ...validMutation, requiresAffectedRowEstimate: false };
  assert.throws(() => compileCocoQLMutationToPostgres(forgedMutation, schema), (error: unknown) => error instanceof CocoQLError && error.issue.error === "INVALID_PLAN");
});
