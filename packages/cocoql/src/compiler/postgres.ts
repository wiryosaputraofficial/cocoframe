import type { CocoQLScalar } from "../ast.ts";
import { cocoQLError } from "../errors.ts";
import type { CocoQLPlanAggregate, CocoQLPlanFieldRef, CocoQLPlanFilter, CocoQLPlanJoin, CocoQLQueryPlan } from "../plan.ts";
import { validateCocoQLPlan } from "../plan.ts";
import type { CocoQLEntitySchema, CocoQLSchema } from "../schema.ts";

export interface CompiledCocoQLPostgres {
  readonly dialect: "postgres";
  readonly sql: string;
  readonly parameters: readonly CocoQLScalar[];
}

/** Compiles a validated, dialect-independent read plan into PostgreSQL SQL. */
export function compileCocoQLToPostgres(plan: CocoQLQueryPlan, schema: CocoQLSchema): CompiledCocoQLPostgres {
  validateCocoQLPlan(plan, schema);
  const entity = schema.entities[plan.rootEntity]!;
  const parameters: CocoQLScalar[] = [];
  const aliases = new Map<string | null, string>([[null, "t0"]]);
  plan.joins.forEach((join, index) => aliases.set(join.path, `t${index + 1}`));
  const hasJoins = plan.joins.length > 0;
  const projection = [
    ...plan.projection.map((field) => compileProjection(field, schema, aliases, hasJoins)),
    ...plan.aggregates.map((aggregate) => compileAggregate(aggregate, schema, aliases, hasJoins)),
  ].join(",\n  ");
  const lines = [`SELECT\n  ${projection}`, `FROM ${quoteIdentifier(entity.table)}${hasJoins ? ` AS ${quoteIdentifier("t0")}` : ""}`];
  for (const join of plan.joins) lines.push(compileJoin(join, schema, aliases));
  if (plan.filters.length > 0) lines.push(`WHERE ${plan.filters.map((filter) => compileFilter(filter, schema, aliases, parameters, hasJoins)).join("\n  AND ")}`);
  if (plan.groupBy.length > 0) lines.push(`GROUP BY ${plan.groupBy.map((field) => compileField(field, schema, aliases, hasJoins)).join(", ")}`);
  if (plan.orderBy.length > 0) lines.push(`ORDER BY ${plan.orderBy.map((item) => `${item.by.kind === "field" ? compileField(item.by.field, schema, aliases, hasJoins) : quoteIdentifier(item.by.alias)} ${item.direction.toUpperCase()}`).join(", ")}`);
  if (plan.limit !== undefined) lines.push(`LIMIT ${bind(parameters, plan.limit)}`);
  if (plan.offset !== undefined) lines.push(`OFFSET ${bind(parameters, plan.offset)}`);
  return Object.freeze({ dialect: "postgres", sql: `${lines.join("\n")};`, parameters: Object.freeze(parameters) });
}

function compileFilter(filter: CocoQLPlanFilter, schema: CocoQLSchema, aliases: ReadonlyMap<string | null, string>, parameters: CocoQLScalar[], qualify: boolean): string {
  const field = compileField(filter.field, schema, aliases, qualify);
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
    const placeholders = filter.value.values.map((value) => bind(parameters, value)).join(", ");
    return `${field} ${filter.operator === "not in" ? "NOT IN" : "IN"} (${placeholders})`;
  }
  let value = filter.value.value;
  const operator = filter.operator === "contains" || filter.operator === "starts_with" || filter.operator === "ends_with" ? "LIKE"
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
  return `${aggregate.function.toUpperCase()}(${compileField(aggregate.field, schema, aliases, qualify)}) AS ${quoteIdentifier(aggregate.alias)}`;
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

function bind(parameters: CocoQLScalar[], value: CocoQLScalar): string { parameters.push(value); return `$${parameters.length}`; }
function formatPostgresDate(value: string, fieldType: string): string { return fieldType === "date" ? value.slice(0, 10) : value; }
function qualifiedColumn(alias: string, field: string, entity: CocoQLEntitySchema, relation: string): string {
  const fieldSchema = Object.hasOwn(entity.fields, field) ? entity.fields[field] : undefined;
  if (!fieldSchema) invalidSchema(`Relation '${relation}' references field '${field}' that is not defined in its entity schema.`);
  return `${quoteIdentifier(alias)}.${quoteIdentifier(fieldSchema.column ?? field)}`;
}
function columnFor(entity: CocoQLEntitySchema, field: string): string { return Object.hasOwn(entity.fields, field) ? entity.fields[field]!.column ?? field : field; }
function quoteIdentifier(identifier: string): string { return `"${identifier.replaceAll('"', '""')}"`; }
function invalidSchema(message: string): never { return cocoQLError({ error: "INVALID_SCHEMA", stage: "compiler", message }); }

