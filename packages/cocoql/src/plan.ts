import type {
  CocoQLAggregateFunction,
  CocoQLFilterOperator,
  CocoQLQuery,
  CocoQLSemanticDateExpression,
  CocoQLScalar,
  CocoQLValue,
} from "./ast.ts";
import { cocoQLError, type CocoQLIssuePath } from "./errors.ts";
import type { CocoQLSchema } from "./schema.ts";
import { isCocoQLNamedDate, resolveCocoQLDateRange } from "./semantic-date.ts";
import { resolveCocoQLFieldPath, resolveCocoQLRelationPath, validateCocoQL } from "./semantic.ts";

/**
 * Identifies the stable cocoql plan version contract used by @cocoframe/cocoql.
 */
export const COCOQL_PLAN_VERSION = "0.1" as const;

export interface CocoQLPlanFieldRef {
  readonly entity: string;
  readonly field: string;
  readonly relationPath: string | null;
}

export interface CocoQLPlanFilter {
  readonly field: CocoQLPlanFieldRef;
  readonly operator: CocoQLFilterOperator;
  readonly value: CocoQLPlanValue;
}

export type CocoQLPlanValue =
  | { readonly kind: "scalar"; readonly value: CocoQLScalar }
  | { readonly kind: "list"; readonly values: readonly CocoQLScalar[] }
  | CocoQLPlanDateRange;

export interface CocoQLPlanDateRange {
  readonly kind: "date-range";
  readonly start: string;
  readonly end: string;
  readonly timeZone: "UTC";
  readonly expression: CocoQLSemanticDateExpression;
}

export interface CocoQLPlanOptions {
  readonly now?: Date;
}

export interface CocoQLPlanSort {
  readonly by: CocoQLPlanOrderTarget;
  readonly direction: "asc" | "desc";
}

export type CocoQLPlanOrderTarget =
  | { readonly kind: "field"; readonly field: CocoQLPlanFieldRef }
  | { readonly kind: "aggregate"; readonly alias: string };

export interface CocoQLPlanAggregate {
  readonly function: CocoQLAggregateFunction;
  readonly field: CocoQLPlanFieldRef;
  readonly alias: string;
}

export interface CocoQLPlanJoin {
  readonly path: string;
  readonly parentPath: string | null;
  readonly relation: string;
  readonly fromEntity: string;
  readonly targetEntity: string;
  readonly kind: "left";
}

/** A validated, database-dialect-independent description of one read query. */
export interface CocoQLQueryPlan {
  readonly type: "QueryPlan";
  readonly version: typeof COCOQL_PLAN_VERSION;
  readonly operation: "select";
  readonly rootEntity: string;
  readonly joins: readonly CocoQLPlanJoin[];
  readonly projection: readonly CocoQLPlanFieldRef[];
  readonly filters: readonly CocoQLPlanFilter[];
  readonly groupBy: readonly CocoQLPlanFieldRef[];
  readonly aggregates: readonly CocoQLPlanAggregate[];
  readonly orderBy: readonly CocoQLPlanSort[];
  readonly limit?: number;
  readonly offset?: number;
}

const FILTER_OPERATORS = new Set<CocoQLFilterOperator>([
  "=", "!=", ">", ">=", "<", "<=", "in", "not in", "contains",
  "starts_with", "ends_with", "before", "after",
]);

/**
 * Builds a deterministic, database-independent Coco QL plan.
 */
export function planCocoQL(query: CocoQLQuery, schema: CocoQLSchema, options: CocoQLPlanOptions = {}): CocoQLQueryPlan {
  validateCocoQL(query, schema);
  const now = options.now ?? new Date();
  const rootEntity = query.source.entity;
  const fieldRef = (path: string): CocoQLPlanFieldRef => {
    const field = resolveCocoQLFieldPath(rootEntity, path, schema);
    return Object.freeze({ entity: field.entity, field: field.field, relationPath: field.relationPath });
  };
  const joinsByPath = new Map<string, CocoQLPlanJoin>();
  for (const path of query.with) {
    for (const relation of resolveCocoQLRelationPath(rootEntity, path, schema)) {
      joinsByPath.set(relation.path, Object.freeze({
        path: relation.path,
        parentPath: relation.parentPath,
        relation: relation.relation,
        fromEntity: relation.fromEntity,
        targetEntity: relation.targetEntity,
        kind: "left",
      }));
    }
  }
  const joins = [...joinsByPath.values()].sort((left, right) =>
    relationDepth(left.path) - relationDepth(right.path) || left.path.localeCompare(right.path));
  const aggregateAliases = new Set(query.aggregates.map((aggregate) => aggregate.alias));
  const plan: CocoQLQueryPlan = {
    type: "QueryPlan",
    version: COCOQL_PLAN_VERSION,
    operation: "select",
    rootEntity,
    joins: Object.freeze(joins),
    projection: Object.freeze(query.select.map(fieldRef)),
    filters: Object.freeze(query.filters.map((filter) => Object.freeze({
      field: fieldRef(filter.field),
      operator: filter.operator,
      value: freezePlanValue(filter.value, now),
    }))),
    groupBy: Object.freeze(query.group.map(fieldRef)),
    aggregates: Object.freeze(query.aggregates.map((aggregate) => Object.freeze({
      function: aggregate.function,
      field: fieldRef(aggregate.field),
      alias: aggregate.alias,
    }))),
    orderBy: Object.freeze(query.sort.map((sort) => Object.freeze({
      by: aggregateAliases.has(sort.field)
        ? Object.freeze({ kind: "aggregate" as const, alias: sort.field })
        : Object.freeze({ kind: "field" as const, field: fieldRef(sort.field) }),
      direction: sort.direction,
    }))),
    ...(query.take === undefined ? {} : { limit: query.take }),
    ...(query.skip === undefined ? {} : { offset: query.skip }),
  };
  return Object.freeze(plan);
}

/**
 * Validates Coco QL Plan and returns a typed value or structured diagnostic.
 */
export function validateCocoQLPlan(plan: CocoQLQueryPlan, schema: CocoQLSchema): CocoQLQueryPlan {
  assertPlanShape(plan);
  const joins = new Map<string, CocoQLPlanJoin>();
  for (const [index, join] of plan.joins.entries()) {
    if (joins.has(join.path)) invalidPlan(`Query plan contains duplicate join '${join.path}'.`, ["joins", index]);
    if (join.parentPath !== null && !joins.has(join.parentPath)) invalidPlan(`Join '${join.path}' must appear after its parent '${join.parentPath}'.`, ["joins", index, "parentPath"]);
    const resolved = resolveCocoQLRelationPath(plan.rootEntity, join.path, schema).at(-1)!;
    if (resolved.parentPath !== join.parentPath || resolved.relation !== join.relation || resolved.fromEntity !== join.fromEntity || resolved.targetEntity !== join.targetEntity) {
      invalidPlan(`Join '${join.path}' does not match the CocoQL schema.`, ["joins", index]);
    }
    joins.set(join.path, join);
  }
  validateCocoQL({
    type: "Query",
    version: "0.1",
    source: { entity: plan.rootEntity },
    with: plan.joins.map((join) => join.path),
    filters: plan.filters.map((filter) => ({
      field: formatFieldRef(filter.field),
      operator: filter.operator,
      value: planValueToAst(filter.value),
    })),
    group: plan.groupBy.map(formatFieldRef),
    select: plan.projection.map(formatFieldRef),
    aggregates: plan.aggregates.map((aggregate) => ({ function: aggregate.function, field: formatFieldRef(aggregate.field), alias: aggregate.alias })),
    sort: plan.orderBy.map((sort) => ({ field: sort.by.kind === "field" ? formatFieldRef(sort.by.field) : sort.by.alias, direction: sort.direction })),
    ...(plan.limit === undefined ? {} : { take: plan.limit }),
    ...(plan.offset === undefined ? {} : { skip: plan.offset }),
  }, schema);
  for (const field of allFieldRefs(plan)) {
    const resolved = resolveCocoQLFieldPath(plan.rootEntity, formatFieldRef(field), schema);
    if (resolved.entity !== field.entity) invalidPlan(`Field '${formatFieldRef(field)}' does not match entity '${field.entity}'.`, findFieldRefPath(plan, field));
  }
  return plan;
}

/**
 * Formats Coco QL Plan into deterministic canonical text.
 */
export function formatCocoQLPlan(plan: CocoQLQueryPlan): string {
  assertPlanShape(plan);
  return `${JSON.stringify(plan, null, 2)}\n`;
}

function assertPlanShape(plan: CocoQLQueryPlan): void {
  if (!plan || typeof plan !== "object") invalidPlan("Query plan must be an object.", []);
  if (plan.type !== "QueryPlan" || plan.version !== COCOQL_PLAN_VERSION || plan.operation !== "select") {
    invalidPlan("Query plan type, version, or operation is not supported.", ["version"]);
  }
  if (typeof plan.rootEntity !== "string" || plan.rootEntity.length === 0) invalidPlan("Query plan requires a root entity.", ["rootEntity"]);
  if (!Array.isArray(plan.joins)) invalidPlan("Query plan joins must be an array.", ["joins"]);
  if (!Array.isArray(plan.projection) || !Array.isArray(plan.groupBy) || !Array.isArray(plan.aggregates)) invalidPlan("Query plan projection, groupBy, and aggregates must be arrays.", ["projection"]);
  if (plan.projection.length === 0 && plan.aggregates.length === 0) invalidPlan("Query plan requires at least one projected field or aggregate.", ["projection"]);
  if (!Array.isArray(plan.filters) || !Array.isArray(plan.orderBy)) invalidPlan("Query plan filters and orderBy must be arrays.", ["filters"]);

  for (const [index, join] of plan.joins.entries()) {
    if (!join || typeof join !== "object"
      || typeof join.path !== "string" || join.path.length === 0
      || (join.parentPath !== null && (typeof join.parentPath !== "string" || join.parentPath.length === 0))
      || typeof join.relation !== "string" || join.relation.length === 0
      || typeof join.fromEntity !== "string" || join.fromEntity.length === 0
      || typeof join.targetEntity !== "string" || join.targetEntity.length === 0
      || join.kind !== "left") invalidPlan("Query plan 0.1 joins must use the deterministic 'left' kind.", ["joins", index]);
  }
  for (const [index, field] of plan.projection.entries()) assertFieldRef(field, ["projection", index]);
  for (const [index, field] of plan.groupBy.entries()) assertFieldRef(field, ["groupBy", index]);
  for (const [index, aggregate] of plan.aggregates.entries()) {
    if (!aggregate || typeof aggregate !== "object" || !isAggregateFunction(aggregate.function)
      || typeof aggregate.alias !== "string" || !/^[a-z_][a-z0-9_]*$/.test(aggregate.alias)) invalidPlan("Query plan contains an invalid aggregate.", ["aggregates", index]);
    assertFieldRef(aggregate.field, ["aggregates", index, "field"]);
  }
  for (const [index, filter] of plan.filters.entries()) {
    if (!filter || typeof filter !== "object") invalidPlan("Query plan contains an invalid filter.", ["filters", index]);
    assertFieldRef(filter.field, ["filters", index, "field"]);
    if (!FILTER_OPERATORS.has(filter.operator)) invalidPlan(`Query plan contains unsupported operator '${String(filter.operator)}'.`, ["filters", index, "operator"]);
    assertValue(filter.value, ["filters", index, "value"]);
  }
  for (const [index, sort] of plan.orderBy.entries()) {
    if (!sort || typeof sort !== "object") invalidPlan("Query plan contains an invalid sort.", ["orderBy", index]);
    if (!sort.by || typeof sort.by !== "object") invalidPlan("Query plan sort requires a target.", ["orderBy", index, "by"]);
    if (sort.by.kind === "field") assertFieldRef(sort.by.field, ["orderBy", index, "by", "field"]);
    else if (sort.by.kind !== "aggregate" || typeof sort.by.alias !== "string" || !/^[a-z_][a-z0-9_]*$/.test(sort.by.alias)) invalidPlan("Query plan contains an invalid sort target.", ["orderBy", index, "by"]);
    if (sort.direction !== "asc" && sort.direction !== "desc") invalidPlan("Query plan sort direction must be 'asc' or 'desc'.", ["orderBy", index, "direction"]);
  }
  assertPageValue(plan.limit, "limit", ["limit"]);
  assertPageValue(plan.offset, "offset", ["offset"]);
}

function assertFieldRef(field: CocoQLPlanFieldRef, path: CocoQLIssuePath): void {
  if (!field || typeof field !== "object" || typeof field.entity !== "string" || field.entity.length === 0
    || typeof field.field !== "string" || field.field.length === 0
    || (field.relationPath !== null && (typeof field.relationPath !== "string" || field.relationPath.length === 0))) {
    invalidPlan("Every query-plan field must reference an entity, relation path, and non-empty field.", path);
  }
}

function assertValue(value: CocoQLPlanValue, path: CocoQLIssuePath): void {
  if (!value || typeof value !== "object") invalidPlan("Query plan contains an invalid filter value.", path);
  if (value.kind === "scalar") {
    if (!isScalar(value.value)) invalidPlan("Query plan scalar value is not supported.", [...path, "value"]);
    return;
  }
  if (value.kind === "date-range") {
    const start = Date.parse(value.start);
    const end = Date.parse(value.end);
    if (value.timeZone !== "UTC" || !Number.isFinite(start) || !Number.isFinite(end) || start >= end) invalidPlan("Query plan contains an invalid semantic date range.", path);
    assertSemanticDateExpression(value.expression, [...path, "expression"]);
    return;
  }
  if (value.kind !== "list" || !Array.isArray(value.values) || value.values.length === 0 || !value.values.every(isScalar)) {
    invalidPlan("Query plan list value must contain supported scalar values.", path);
  }
}

function assertPageValue(value: number | undefined, name: string, path: CocoQLIssuePath): void {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) invalidPlan(`Query plan ${name} must be a non-negative safe integer.`, path);
}

function isScalar(value: unknown): value is CocoQLScalar {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function freezePlanValue(value: CocoQLValue, now: Date): CocoQLPlanValue {
  if (value.kind === "scalar") return Object.freeze({ kind: "scalar", value: value.value });
  if (value.kind === "list") return Object.freeze({ kind: "list", values: Object.freeze([...value.values]) });
  const range = resolveCocoQLDateRange(value.expression, now);
  return Object.freeze({
    kind: "date-range",
    start: range.start,
    end: range.end,
    timeZone: range.timeZone,
    expression: freezeSemanticDateExpression(value.expression),
  });
}

function formatFieldRef(field: CocoQLPlanFieldRef): string {
  return field.relationPath === null ? field.field : `${field.relationPath}.${field.field}`;
}

function allFieldRefs(plan: CocoQLQueryPlan): readonly CocoQLPlanFieldRef[] {
  return [
    ...plan.projection,
    ...plan.filters.map((filter) => filter.field),
    ...plan.groupBy,
    ...plan.aggregates.map((aggregate) => aggregate.field),
    ...plan.orderBy.flatMap((sort) => sort.by.kind === "field" ? [sort.by.field] : []),
  ];
}

function relationDepth(path: string): number {
  return path.split(".").length;
}

function planValueToAst(value: CocoQLPlanValue): CocoQLValue {
  return value.kind === "date-range" ? { kind: "semantic-date", expression: value.expression } : value;
}

function freezeSemanticDateExpression(expression: CocoQLSemanticDateExpression): CocoQLSemanticDateExpression {
  return expression.kind === "named"
    ? Object.freeze({ kind: "named", value: expression.value })
    : Object.freeze({ kind: "relative", direction: expression.direction, amount: expression.amount, unit: "days" });
}

function assertSemanticDateExpression(expression: CocoQLSemanticDateExpression, path: CocoQLIssuePath): void {
  if (!expression || typeof expression !== "object") invalidPlan("Query plan contains an invalid semantic date expression.", path);
  if (expression.kind === "named") {
    if (!isCocoQLNamedDate(expression.value)) invalidPlan("Query plan contains an unknown named date.", [...path, "value"]);
    return;
  }
  if (expression.kind !== "relative" || (expression.direction !== "last" && expression.direction !== "next")
    || expression.unit !== "days" || !Number.isSafeInteger(expression.amount) || expression.amount < 1 || expression.amount > 10_000) {
    invalidPlan("Query plan contains an invalid relative date expression.", path);
  }
}

function invalidPlan(message: string, path?: CocoQLIssuePath): never {
  return cocoQLError({ error: "INVALID_PLAN", stage: "planner", message, ...(path ? { path } : {}) });
}

function findFieldRefPath(plan: CocoQLQueryPlan, target: CocoQLPlanFieldRef): CocoQLIssuePath | undefined {
  const projection = plan.projection.indexOf(target);
  if (projection >= 0) return ["projection", projection];
  const group = plan.groupBy.indexOf(target);
  if (group >= 0) return ["groupBy", group];
  const aggregate = plan.aggregates.findIndex((item) => item.field === target);
  if (aggregate >= 0) return ["aggregates", aggregate, "field"];
  const filter = plan.filters.findIndex((item) => item.field === target);
  if (filter >= 0) return ["filters", filter, "field"];
  const order = plan.orderBy.findIndex((item) => item.by.kind === "field" && item.by.field === target);
  return order >= 0 ? ["orderBy", order, "by", "field"] : undefined;
}

function isAggregateFunction(value: unknown): value is CocoQLAggregateFunction {
  return value === "count" || value === "sum" || value === "avg" || value === "min" || value === "max";
}
