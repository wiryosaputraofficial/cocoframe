import type { CocoQLMutation, CocoQLMutationOperation, CocoQLScalar } from "./ast.ts";
import { cocoQLError, type CocoQLIssuePath } from "./errors.ts";
import { getCocoQLMutationSourceMap } from "./mutation-source-map.ts";
import { planCocoQL, validateCocoQLPlan, type CocoQLPlanFieldRef, type CocoQLPlanFilter, type CocoQLPlanOptions } from "./plan.ts";
import type { CocoQLSchema } from "./schema.ts";
import { resolveCocoQLFieldPath, validateCocoQL, validateCocoQLFilterValue } from "./semantic.ts";

export const COCOQL_MUTATION_PLAN_VERSION = "0.1" as const;

export interface CocoQLPlanAssignment {
  readonly field: CocoQLPlanFieldRef;
  readonly value: CocoQLScalar;
}

export interface CocoQLMutationPlan {
  readonly type: "MutationPlan";
  readonly version: typeof COCOQL_MUTATION_PLAN_VERSION;
  readonly operation: CocoQLMutationOperation;
  readonly rootEntity: string;
  readonly preview: boolean;
  readonly filters: readonly CocoQLPlanFilter[];
  readonly changes: readonly CocoQLPlanAssignment[];
  readonly confirmation: { readonly maxAffectedRows: number } | null;
  readonly requiresAffectedRowEstimate: boolean;
}

export interface CocoQLMutationPreview {
  readonly type: "MutationPreview";
  readonly version: typeof COCOQL_MUTATION_PLAN_VERSION;
  readonly operation: CocoQLMutationOperation;
  readonly entity: string;
  readonly estimatedAffectedRows: number | null;
  readonly estimate: "deterministic" | "database-required";
  readonly plan: CocoQLMutationPlan;
}

export function validateCocoQLMutation(mutation: CocoQLMutation, schema: CocoQLSchema): CocoQLMutation {
  assertMutationShape(mutation);
  const sourceMap = getCocoQLMutationSourceMap(mutation);
  const entity = Object.hasOwn(schema.entities, mutation.entity) ? schema.entities[mutation.entity] : undefined;
  if (!entity) {
    cocoQLError({ error: "UNKNOWN_ENTITY", stage: "semantic", operation: mutation.operation, entity: mutation.entity, message: `Entity '${mutation.entity}' does not exist in the CocoQL schema.`, ...(sourceMap?.entity ? { location: sourceMap.entity } : {}), path: ["entity"] });
  }
  const selectedField = Object.keys(entity.fields)[0];
  if (!selectedField) invalidMutation(mutation.operation, "Mutation entity must expose at least one public field.", ["entity"]);
  validateCocoQL({
    type: "Query", version: "0.1", source: { entity: mutation.entity }, with: [],
    filters: mutation.filters, group: [], select: [selectedField], aggregates: [], sort: [],
  }, schema);
  const seen = new Set<string>();
  for (const [index, change] of mutation.changes.entries()) {
    const target = { ...(sourceMap?.changes[index] ? { location: sourceMap.changes[index] } : {}), path: ["changes", index] as const };
    if (change.field.includes(".")) invalidMutation(mutation.operation, "CocoQL 0.1 mutations cannot write through relations.", ["changes", index], target.location);
    if (seen.has(change.field)) invalidMutation(mutation.operation, `Field '${change.field}' may be assigned only once.`, ["changes", index], target.location);
    seen.add(change.field);
    const resolved = resolveCocoQLFieldPath(mutation.entity, change.field, schema, target);
    validateCocoQLFilterValue(resolved.entity, { field: change.field, operator: "=", value: { kind: "scalar", value: change.value } }, resolved.schema, target);
  }
  return mutation;
}

export function planCocoQLMutation(mutation: CocoQLMutation, schema: CocoQLSchema, options: CocoQLPlanOptions = {}): CocoQLMutationPlan {
  validateCocoQLMutation(mutation, schema);
  const entity = schema.entities[mutation.entity]!;
  const selectedField = Object.keys(entity.fields)[0]!;
  const readPlan = planCocoQL({
    type: "Query", version: "0.1", source: { entity: mutation.entity }, with: [], filters: mutation.filters,
    group: [], select: [selectedField], aggregates: [], sort: [],
  }, schema, options);
  const changes = mutation.changes.map((change) => {
    const field = resolveCocoQLFieldPath(mutation.entity, change.field, schema);
    return Object.freeze({ field: Object.freeze({ entity: field.entity, field: field.field, relationPath: null }), value: change.value });
  });
  return Object.freeze({
    type: "MutationPlan", version: COCOQL_MUTATION_PLAN_VERSION, operation: mutation.operation,
    rootEntity: mutation.entity, preview: mutation.preview,
    filters: Object.freeze([...readPlan.filters]), changes: Object.freeze(changes),
    confirmation: mutation.confirmation ? Object.freeze({ ...mutation.confirmation }) : null,
    requiresAffectedRowEstimate: mutation.operation !== "create",
  });
}

/** Revalidates a mutation plan before any dialect compiler can consume it. */
export function validateCocoQLMutationPlan(plan: CocoQLMutationPlan, schema: CocoQLSchema): CocoQLMutationPlan {
  if (!plan || typeof plan !== "object" || plan.type !== "MutationPlan" || plan.version !== "0.1"
    || (plan.operation !== "create" && plan.operation !== "update" && plan.operation !== "delete")
    || typeof plan.rootEntity !== "string" || typeof plan.preview !== "boolean"
    || typeof plan.requiresAffectedRowEstimate !== "boolean"
    || !Array.isArray(plan.filters) || !Array.isArray(plan.changes)) invalidPlan("Invalid mutation plan envelope.");
  const entity = Object.hasOwn(schema.entities, plan.rootEntity) ? schema.entities[plan.rootEntity] : undefined;
  if (!entity) invalidPlan(`Unknown mutation entity '${plan.rootEntity}'.`, ["rootEntity"]);
  const firstField = Object.keys(entity.fields)[0];
  if (!firstField) invalidPlan("Mutation entity has no public fields.", ["rootEntity"]);
  validateCocoQLPlan({
    type: "QueryPlan", version: "0.1", operation: "select", rootEntity: plan.rootEntity,
    joins: [], projection: [{ entity: plan.rootEntity, field: firstField, relationPath: null }],
    filters: plan.filters, groupBy: [], aggregates: [], orderBy: [],
  }, schema);
  if ((plan.operation === "update" || plan.operation === "delete") && plan.filters.length === 0) invalidPlan(`${plan.operation} plan requires a filter.`, ["filters"]);
  if (plan.operation === "create" && plan.filters.length > 0) invalidPlan("create plan cannot contain filters.", ["filters"]);
  if ((plan.operation === "create" || plan.operation === "update") && plan.changes.length === 0) invalidPlan(`${plan.operation} plan requires assignments.`, ["changes"]);
  if (plan.operation === "delete" && plan.changes.length > 0) invalidPlan("delete plan cannot contain assignments.", ["changes"]);
  if (plan.requiresAffectedRowEstimate !== (plan.operation !== "create")) invalidPlan("Mutation estimate flag does not match its operation.", ["requiresAffectedRowEstimate"]);
  for (const [index, change] of plan.changes.entries()) {
    if (!change || typeof change !== "object" || !change.field || change.field.entity !== plan.rootEntity || change.field.relationPath !== null
      || !Object.hasOwn(entity.fields, change.field.field) || !isScalar(change.value)) invalidPlan("Mutation plan contains an invalid assignment.", ["changes", index]);
    validateCocoQLFilterValue(plan.rootEntity, { field: change.field.field, operator: "=", value: { kind: "scalar", value: change.value } }, entity.fields[change.field.field]!, { path: ["changes", index] });
  }
  if (plan.confirmation !== null && (!Number.isSafeInteger(plan.confirmation.maxAffectedRows) || plan.confirmation.maxAffectedRows < 1)) invalidPlan("Mutation confirmation is invalid.", ["confirmation"]);
  return plan;
}

/** Returns explainable public-schema data only. It never creates SQL or contacts a database. */
export function previewCocoQLMutation(mutation: CocoQLMutation, schema: CocoQLSchema, options: CocoQLPlanOptions = {}): CocoQLMutationPreview {
  if (!mutation.preview) cocoQLError({ error: "PREVIEW_REQUIRED", stage: "planner", operation: mutation.operation, message: "Mutation preview requires the explicit 'preview' command.", path: ["preview"] });
  const plan = planCocoQLMutation(mutation, schema, options);
  return Object.freeze({
    type: "MutationPreview", version: COCOQL_MUTATION_PLAN_VERSION, operation: plan.operation, entity: plan.rootEntity,
    estimatedAffectedRows: plan.operation === "create" ? 1 : null,
    estimate: plan.operation === "create" ? "deterministic" : "database-required",
    plan,
  });
}

export function formatCocoQLMutationPlan(plan: CocoQLMutationPlan): string {
  return `${JSON.stringify(plan, null, 2)}\n`;
}

function assertMutationShape(mutation: CocoQLMutation): void {
  if (!mutation || typeof mutation !== "object" || mutation.type !== "Mutation" || mutation.version !== "0.1") invalidMutation("update", "Invalid CocoQL mutation envelope.");
  if (mutation.operation !== "create" && mutation.operation !== "update" && mutation.operation !== "delete") invalidMutation("update", "Unsupported mutation operation.", ["operation"]);
  if (typeof mutation.entity !== "string" || !/^[a-z_][a-z0-9_]*$/.test(mutation.entity)) invalidMutation(mutation.operation, "Mutation entity must be a canonical public name.", ["entity"]);
  if (typeof mutation.preview !== "boolean" || !Array.isArray(mutation.filters) || !Array.isArray(mutation.changes)) invalidMutation(mutation.operation, "Invalid mutation structure.");
  if (mutation.operation === "create" && mutation.filters.length > 0) invalidMutation("create", "create does not accept filters.", ["filters"]);
  if (mutation.operation === "delete" && mutation.changes.length > 0) invalidMutation("delete", "delete does not accept assignments.", ["changes"]);
  if ((mutation.operation === "create" || mutation.operation === "update") && mutation.changes.length === 0) invalidMutation(mutation.operation, `${mutation.operation} requires at least one assignment.`, ["changes"]);
  if (mutation.confirmation && (!Number.isSafeInteger(mutation.confirmation.maxAffectedRows) || mutation.confirmation.maxAffectedRows < 1)) invalidMutation(mutation.operation, "Confirmation must contain a positive safe affected-row limit.", ["confirmation"]);
}

function invalidMutation(operation: CocoQLMutationOperation, message: string, path?: CocoQLIssuePath, location?: { readonly line: number; readonly column: number; readonly endLine: number; readonly endColumn: number }): never {
  return cocoQLError({ error: "INVALID_MUTATION", stage: "semantic", operation, message, ...(path ? { path } : {}), ...(location ? { location } : {}) });
}

function isScalar(value: unknown): value is CocoQLScalar { return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean"; }
function invalidPlan(message: string, path?: CocoQLIssuePath): never { return cocoQLError({ error: "INVALID_PLAN", stage: "planner", message, ...(path ? { path } : {}) }); }
