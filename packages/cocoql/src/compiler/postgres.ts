import type { CocoQLFilterOperator, CocoQLParameter, CocoQLScalar } from "../ast.ts";
import { cocoQLError } from "../errors.ts";
import type { CocoQLPlanAggregate, CocoQLPlanFieldRef, CocoQLPlanFilter, CocoQLPlanJoin, CocoQLQueryPlan } from "../plan.ts";
import { validateCocoQLPlan } from "../plan.ts";
import type { CocoQLEntitySchema, CocoQLSchema } from "../schema.ts";

export interface CompiledCocoQLPostgres {
  readonly dialect: "postgres";
  readonly sql: string;
  readonly parameters: readonly CocoQLParameter[];
}

export type CocoQLPostgresPredicate =
  | { readonly kind: "condition"; readonly filter: CocoQLPlanFilter }
  | { readonly kind: "all" | "any"; readonly predicates: readonly CocoQLPostgresPredicate[] }
  | { readonly kind: "not"; readonly predicate: CocoQLPostgresPredicate };

export interface CocoQLPostgresHaving {
  readonly alias: string;
  readonly operator: "=" | "!=" | ">" | ">=" | "<" | "<=";
  readonly value: CocoQLScalar;
}

export interface CocoQLPostgresCte {
  readonly name: string;
  readonly plan: CocoQLQueryPlan;
}

export interface CocoQLPostgresReadOptions {
  readonly distinct?: boolean;
  readonly predicate?: CocoQLPostgresPredicate;
  readonly having?: readonly CocoQLPostgresHaving[];
  readonly ctes?: readonly CocoQLPostgresCte[];
  readonly fromCte?: string;
  readonly cursor?: {
    readonly field: CocoQLPlanFieldRef;
    readonly value: CocoQLScalar;
    readonly position: "after" | "before";
  };
  readonly lock?: {
    readonly mode: "update" | "share";
    readonly wait?: "wait" | "nowait" | "skip_locked";
  };
}

/** Compiles a validated, dialect-independent read plan into PostgreSQL SQL. */
export function compileCocoQLToPostgres(plan: CocoQLQueryPlan, schema: CocoQLSchema, options: CocoQLPostgresReadOptions = {}): CompiledCocoQLPostgres {
  const parameters: CocoQLParameter[] = [];
  const sql = compilePlan(plan, schema, options, parameters);
  return Object.freeze({ dialect: "postgres", sql, parameters: Object.freeze(parameters) });
}

function compilePlan(plan: CocoQLQueryPlan, schema: CocoQLSchema, options: CocoQLPostgresReadOptions, parameters: CocoQLParameter[]): string {
  validateCocoQLPlan(plan, schema);
  validatePostgresOptions(plan, schema, options);
  const ctes = options.ctes?.map((cte) => {
    const nested = compilePlan(cte.plan, schema, {}, parameters).replace(/;$/, "").split("\n").map((line) => `  ${line}`).join("\n");
    return `${quoteIdentifier(cte.name)} AS (\n${nested}\n)`;
  });
  const entity = schema.entities[plan.rootEntity]!;
  const aliases = new Map<string | null, string>([[null, "t0"]]);
  plan.joins.forEach((join, index) => aliases.set(join.path, `t${index + 1}`));
  const hasJoins = plan.joins.length > 0;
  const projection = [
    ...plan.projection.map((field) => compileProjection(field, schema, aliases, hasJoins)),
    ...plan.aggregates.map((aggregate) => compileAggregate(aggregate, schema, aliases, hasJoins)),
  ].join(",\n  ");
  const lines = [`SELECT${options.distinct ? " DISTINCT" : ""}\n  ${projection}`, `FROM ${quoteIdentifier(options.fromCte ?? entity.table)}${hasJoins ? ` AS ${quoteIdentifier("t0")}` : ""}`];
  for (const join of plan.joins) lines.push(compileJoin(join, schema, aliases));
  const predicates = plan.filters.map((filter) => compileFilter(filter, schema, aliases, parameters, hasJoins));
  if (options.predicate) predicates.push(compilePredicate(options.predicate, schema, aliases, parameters, hasJoins));
  if (options.cursor) {
    const sort = plan.orderBy[0]!;
    const ascending = sort.direction === "asc";
    const greater = options.cursor.position === "after" ? ascending : !ascending;
    predicates.push(`${compileField(options.cursor.field, schema, aliases, hasJoins)} ${greater ? ">" : "<"} ${bind(parameters, options.cursor.value)}`);
  }
  if (predicates.length > 0) lines.push(`WHERE ${predicates.join("\n  AND ")}`);
  if (plan.groupBy.length > 0) lines.push(`GROUP BY ${plan.groupBy.map((field) => compileField(field, schema, aliases, hasJoins)).join(", ")}`);
  if (options.having?.length) {
    const aggregates = new Map(plan.aggregates.map((aggregate) => [aggregate.alias, aggregate]));
    lines.push(`HAVING ${options.having.map((item) => `${compileAggregateExpression(aggregates.get(item.alias)!, schema, aliases, hasJoins)} ${item.operator} ${bind(parameters, item.value)}`).join("\n  AND ")}`);
  }
  if (plan.orderBy.length > 0) lines.push(`ORDER BY ${plan.orderBy.map((item) => `${item.by.kind === "field" ? compileField(item.by.field, schema, aliases, hasJoins) : quoteIdentifier(item.by.alias)} ${item.direction.toUpperCase()}`).join(", ")}`);
  if (plan.limit !== undefined) lines.push(`LIMIT ${bind(parameters, plan.limit)}`);
  if (plan.offset !== undefined) lines.push(`OFFSET ${bind(parameters, plan.offset)}`);
  if (options.lock) lines.push(`FOR ${options.lock.mode === "update" ? "UPDATE" : "SHARE"}${options.lock.wait === "nowait" ? " NOWAIT" : options.lock.wait === "skip_locked" ? " SKIP LOCKED" : ""}`);
  const query = `${lines.join("\n")};`;
  return ctes?.length ? `WITH ${ctes.join(",\n")}\n${query}` : query;
}

function compilePredicate(predicate: CocoQLPostgresPredicate, schema: CocoQLSchema, aliases: ReadonlyMap<string | null, string>, parameters: CocoQLParameter[], qualify: boolean): string {
  if (predicate.kind === "condition") return compileFilter(predicate.filter, schema, aliases, parameters, qualify);
  if (predicate.kind === "not") return `NOT (${compilePredicate(predicate.predicate, schema, aliases, parameters, qualify)})`;
  const operator = predicate.kind === "all" ? " AND " : " OR ";
  return `(${predicate.predicates.map((item) => compilePredicate(item, schema, aliases, parameters, qualify)).join(operator)})`;
}

function validatePostgresOptions(plan: CocoQLQueryPlan, schema: CocoQLSchema, options: CocoQLPostgresReadOptions): void {
  if (options.distinct !== undefined && typeof options.distinct !== "boolean") invalidSchema("PostgreSQL distinct must be boolean.");
  const filters = options.predicate ? collectPredicateFilters(options.predicate) : [];
  if (filters.length) validateCocoQLPlan(Object.freeze({ ...plan, filters: Object.freeze([...plan.filters, ...filters]) }), schema);
  if (options.having !== undefined && !Array.isArray(options.having)) invalidSchema("PostgreSQL HAVING must be an array.");
  if (options.having?.length) {
    const aliases = new Set(plan.aggregates.map((aggregate) => aggregate.alias));
    for (const item of options.having) {
      if (!aliases.has(item.alias)) invalidSchema(`PostgreSQL HAVING references unknown aggregate alias '${item.alias}'.`);
      if (!isComparison(item.operator) || !isScalar(item.value)) invalidSchema("PostgreSQL HAVING contains an invalid predicate.");
    }
  }
  if (options.cursor) {
    if (!options.cursor || typeof options.cursor !== "object" || (options.cursor.position !== "after" && options.cursor.position !== "before")) invalidSchema("PostgreSQL cursor pagination contains an invalid position.");
    if (plan.offset !== undefined) invalidSchema("PostgreSQL cursor pagination cannot be combined with skip/offset.");
    const first = plan.orderBy[0];
    if (!first || first.by.kind !== "field" || !sameField(first.by.field, options.cursor.field) || !isScalar(options.cursor.value)) invalidSchema("PostgreSQL cursor pagination requires the first sort field to match its cursor field.");
    const cursorField = schema.entities[options.cursor.field.entity]?.fields[options.cursor.field.field];
    if (!cursorField || (cursorField.type !== "id" && cursorField.unique !== true)) invalidSchema("PostgreSQL cursor pagination requires a unique cursor field.");
    validateCocoQLPlan(Object.freeze({ ...plan, orderBy: Object.freeze([...plan.orderBy, { by: { kind: "field" as const, field: options.cursor.field }, direction: first.direction }]) }), schema);
  }
  if (options.lock) {
    if ((options.lock.mode !== "update" && options.lock.mode !== "share") || (options.lock.wait !== undefined && options.lock.wait !== "wait" && options.lock.wait !== "nowait" && options.lock.wait !== "skip_locked")) invalidSchema("PostgreSQL row lock options are invalid.");
    if (plan.aggregates.length > 0 || plan.groupBy.length > 0 || options.distinct) invalidSchema("PostgreSQL row locks cannot be combined with DISTINCT or grouped aggregation.");
  }
  if (options.ctes) {
    if (!Array.isArray(options.ctes)) invalidSchema("PostgreSQL CTEs must be an array.");
    const names = new Set<string>();
    for (const cte of options.ctes) {
      if (!cte || typeof cte !== "object" || typeof cte.name !== "string" || !/^[a-z_][a-z0-9_]*$/.test(cte.name) || names.has(cte.name)) invalidSchema(`Invalid or duplicate PostgreSQL CTE name '${String(cte?.name)}'.`);
      names.add(cte.name);
      validateCocoQLPlan(cte.plan, schema);
    }
    if (options.fromCte) {
      if (!names.has(options.fromCte)) invalidSchema(`PostgreSQL fromCte '${options.fromCte}' is not declared.`);
      validateCteSource(plan, schema, options.ctes.find((cte) => cte.name === options.fromCte)!.plan);
    }
  } else if (options.fromCte) invalidSchema("PostgreSQL fromCte requires a declared CTE.");
}

function collectPredicateFilters(predicate: CocoQLPostgresPredicate, depth = 0): readonly CocoQLPlanFilter[] {
  if (depth > 8) invalidSchema("PostgreSQL boolean predicate depth cannot exceed 8.");
  if (!predicate || typeof predicate !== "object" || (predicate.kind !== "condition" && predicate.kind !== "not" && predicate.kind !== "all" && predicate.kind !== "any")) invalidSchema("PostgreSQL boolean predicate contains an invalid node.");
  if (predicate.kind === "condition") return [predicate.filter];
  if (predicate.kind === "not") {
    if (!predicate.predicate) invalidSchema("PostgreSQL 'not' predicate requires one child.");
    return collectPredicateFilters(predicate.predicate, depth + 1);
  }
  if (!Array.isArray(predicate.predicates) || !predicate.predicates.length) invalidSchema(`PostgreSQL '${predicate.kind}' predicate cannot be empty.`);
  const filters = predicate.predicates.flatMap((item) => collectPredicateFilters(item, depth + 1));
  if (filters.length > 100) invalidSchema("PostgreSQL boolean predicates cannot exceed 100 conditions.");
  return filters;
}

function validateCteSource(plan: CocoQLQueryPlan, schema: CocoQLSchema, source: CocoQLQueryPlan): void {
  if (source.rootEntity !== plan.rootEntity || source.aggregates.length > 0 || source.groupBy.length > 0) invalidSchema("PostgreSQL fromCte requires a schema-preserving CTE for the same root entity.");
  const projected = new Set(source.projection.filter((field) => field.relationPath === null).map((field) => field.field));
  const required = new Set([
    ...plan.projection,
    ...plan.filters.map((filter) => filter.field),
    ...plan.groupBy,
    ...plan.aggregates.map((aggregate) => aggregate.field),
    ...plan.orderBy.flatMap((sort) => sort.by.kind === "field" ? [sort.by.field] : []),
  ].filter((field) => field.relationPath === null).map((field) => field.field));
  for (const join of plan.joins.filter((join) => join.parentPath === null)) {
    const relation = schema.entities[join.fromEntity]?.relations?.[join.relation];
    if (relation?.type === "belongs_to") required.add(relation.foreignKey);
    else required.add("id");
  }
  for (const field of required) if (!projected.has(field)) invalidSchema(`PostgreSQL fromCte does not project required root field '${field}'.`);
}

function sameField(left: CocoQLPlanFieldRef, right: CocoQLPlanFieldRef): boolean { return left.entity === right.entity && left.field === right.field && left.relationPath === right.relationPath; }
function isComparison(operator: CocoQLFilterOperator): boolean { return operator === "=" || operator === "!=" || operator === ">" || operator === ">=" || operator === "<" || operator === "<="; }
function isScalar(value: unknown): value is CocoQLScalar { return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean"; }

function compileFilter(filter: CocoQLPlanFilter, schema: CocoQLSchema, aliases: ReadonlyMap<string | null, string>, parameters: CocoQLParameter[], qualify: boolean): string {
  const field = compileField(filter.field, schema, aliases, qualify);
  const fieldSchema = schema.entities[filter.field.entity]!.fields[filter.field.field]!;
  if (filter.value.kind === "date-range") {
    const fieldType = schema.entities[filter.field.entity]!.fields[filter.field.field]!.type;
    const start = formatPostgresDate(filter.value.start, fieldType);
    const end = formatPostgresDate(filter.value.end, fieldType);
    if (filter.operator === "in") return `(${field} >= ${bind(parameters, start)} AND ${field} < ${bind(parameters, end)})`;
    if (filter.operator === "not in") return `(${field} < ${bind(parameters, start)} OR ${field} >= ${bind(parameters, end)})`;
    if (filter.operator === "before") return `${field} < ${bind(parameters, start)}`;
    return `${field} >= ${bind(parameters, end)}`;
  }
  if (filter.value.kind === "list") {
    if (filter.operator === "contains" || filter.operator === "contained_by" || filter.operator === "overlaps") {
      const operator = filter.operator === "contains" ? "@>" : filter.operator === "contained_by" ? "<@" : "&&";
      return `${field} ${operator} ${bind(parameters, Object.freeze([...filter.value.values]))}${arrayCast(fieldSchema.type)}`;
    }
    const placeholders = filter.value.values.map((value) => bind(parameters, value)).join(", ");
    return `${field} ${filter.operator === "not in" ? "NOT IN" : "IN"} (${placeholders})`;
  }
  let value = filter.value.value;
  if ((fieldSchema.type === "json" || fieldSchema.type === "jsonb") && (filter.operator === "contains" || filter.operator === "contained_by" || filter.operator === "overlaps")) {
    const operator = filter.operator === "contains" ? "@>" : filter.operator === "contained_by" ? "<@" : "&&";
    return `${field} ${operator} ${bind(parameters, value)}::${fieldSchema.type}`;
  }
  if (filter.operator === "has_key") return `${field} ? ${bind(parameters, value)}`;
  if (filter.operator === "matches") {
    const config = fieldSchema.searchConfig ?? "simple";
    if (!/^[a-z_][a-z0-9_]*$/.test(config)) invalidSchema(`Invalid PostgreSQL text-search configuration '${config}'.`);
    return `to_tsvector(${bind(parameters, config)}::regconfig, ${field}) @@ websearch_to_tsquery(${bind(parameters, config)}::regconfig, ${bind(parameters, value)})`;
  }
  const operator = filter.operator === "contains" || filter.operator === "starts_with" || filter.operator === "ends_with" ? "LIKE"
    : filter.operator === "ilike" ? "ILIKE" : filter.operator === "not ilike" ? "NOT ILIKE"
    : filter.operator === "before" ? "<" : filter.operator === "after" ? ">" : filter.operator;
  if (typeof value === "string") {
    if (filter.operator === "contains") value = `%${value}%`;
    else if (filter.operator === "starts_with") value = `${value}%`;
    else if (filter.operator === "ends_with") value = `%${value}`;
  }
  if (value === null && (operator === "=" || operator === "!=")) return `${field} IS${operator === "!=" ? " NOT" : ""} NULL`;
  return `${field} ${operator} ${bind(parameters, value)}`;
}

function compileProjection(field: CocoQLPlanFieldRef, schema: CocoQLSchema, aliases: ReadonlyMap<string | null, string>, qualify: boolean): string {
  const expression = compileField(field, schema, aliases, qualify);
  return field.relationPath === null ? expression : `${expression} AS ${quoteIdentifier(`${field.relationPath}.${field.field}`)}`;
}

function compileAggregate(aggregate: CocoQLPlanAggregate, schema: CocoQLSchema, aliases: ReadonlyMap<string | null, string>, qualify: boolean): string {
  return `${compileAggregateExpression(aggregate, schema, aliases, qualify)} AS ${quoteIdentifier(aggregate.alias)}`;
}

function compileAggregateExpression(aggregate: CocoQLPlanAggregate, schema: CocoQLSchema, aliases: ReadonlyMap<string | null, string>, qualify: boolean): string {
  return `${aggregate.function.toUpperCase()}(${compileField(aggregate.field, schema, aliases, qualify)})`;
}

function compileField(field: CocoQLPlanFieldRef, schema: CocoQLSchema, aliases: ReadonlyMap<string | null, string>, qualify: boolean): string {
  const entity = schema.entities[field.entity]!;
  const column = quoteIdentifier(columnFor(entity, field.field));
  if (!qualify) return column;
  const alias = aliases.get(field.relationPath);
  if (!alias) invalidSchema(`No SQL alias exists for relation path '${String(field.relationPath)}'.`);
  return `${quoteIdentifier(alias)}.${column}`;
}

function compileJoin(join: CocoQLPlanJoin, schema: CocoQLSchema, aliases: ReadonlyMap<string | null, string>): string {
  const from = schema.entities[join.fromEntity]!;
  const target = schema.entities[join.targetEntity]!;
  const relation = from.relations && Object.hasOwn(from.relations, join.relation) ? from.relations[join.relation] : undefined;
  if (!relation) invalidSchema(`Relation '${join.fromEntity}.${join.relation}' is not defined.`);
  const fromAlias = aliases.get(join.parentPath);
  const targetAlias = aliases.get(join.path);
  if (!fromAlias || !targetAlias) invalidSchema(`No SQL alias exists for join '${join.path}'.`);
  const relationName = `${join.fromEntity}.${join.relation}`;
  const left = relation.type === "belongs_to"
    ? qualifiedColumn(fromAlias, relation.foreignKey, from, relationName)
    : qualifiedColumn(targetAlias, relation.foreignKey, target, relationName);
  const right = relation.type === "belongs_to"
    ? qualifiedColumn(targetAlias, "id", target, relationName)
    : qualifiedColumn(fromAlias, "id", from, relationName);
  return `${join.kind.toUpperCase()} JOIN ${quoteIdentifier(target.table)} AS ${quoteIdentifier(targetAlias)} ON ${left} = ${right}`;
}

function bind(parameters: CocoQLParameter[], value: CocoQLParameter): string { parameters.push(value); return `$${parameters.length}`; }
function arrayCast(type: string): string {
  if (type === "number_array") return "::double precision[]";
  if (type === "boolean_array") return "::boolean[]";
  if (type === "uuid_array") return "::uuid[]";
  return "::text[]";
}
function formatPostgresDate(value: string, fieldType: string): string { return fieldType === "date" ? value.slice(0, 10) : value; }
function qualifiedColumn(alias: string, field: string, entity: CocoQLEntitySchema, relation: string): string {
  const fieldSchema = Object.hasOwn(entity.fields, field) ? entity.fields[field] : undefined;
  if (!fieldSchema) invalidSchema(`Relation '${relation}' references field '${field}' that is not defined in its entity schema.`);
  return `${quoteIdentifier(alias)}.${quoteIdentifier(fieldSchema.column ?? field)}`;
}
function columnFor(entity: CocoQLEntitySchema, field: string): string { return Object.hasOwn(entity.fields, field) ? entity.fields[field]!.column ?? field : field; }
function quoteIdentifier(identifier: string): string { return `"${identifier.replaceAll('"', '""')}"`; }
function invalidSchema(message: string): never { return cocoQLError({ error: "INVALID_SCHEMA", stage: "compiler", message }); }
