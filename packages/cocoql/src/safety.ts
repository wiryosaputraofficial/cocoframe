import type { CocoQLMutation, CocoQLMutationOperation, CocoQLQuery } from "./ast.ts";
import { cocoQLError, type CocoQLIssuePath, type CocoQLSourceLocation } from "./errors.ts";
import type { CocoQLSchema } from "./schema.ts";
import { resolveCocoQLRelationPath, validateCocoQL } from "./semantic.ts";
import { getCocoQLSourceMap } from "./source-map.ts";
import { getCocoQLMutationSourceMap } from "./mutation-source-map.ts";
import { validateCocoQLMutation } from "./mutation.ts";

/**
 * Identifies the stable cocoql safety version contract used by @cocoframe/cocoql.
 */
export const COCOQL_SAFETY_VERSION = "0.1" as const;

export interface CocoQLReadSafetyLimits {
  readonly requireTake: boolean;
  readonly maxTake: number;
  readonly maxSkip: number;
  readonly maxFilters: number;
  readonly maxProjectedFields: number;
  readonly maxRelations: number;
  readonly maxRelationDepth: number;
  readonly maxGroupFields: number;
  readonly maxAggregates: number;
}

export interface CocoQLSafetyPolicy {
  readonly version: typeof COCOQL_SAFETY_VERSION;
  readonly read: CocoQLReadSafetyLimits;
  readonly mutation: CocoQLMutationSafetyLimits;
}

export interface CocoQLMutationSafetyLimits {
  readonly requireFilterForUpdate: boolean;
  readonly requireFilterForDelete: boolean;
  readonly requireConfirmation: boolean;
  readonly maxAffectedRows: number;
  readonly maxFilters: number;
  readonly maxChanges: number;
}

export interface CocoQLReadSafetyMetrics {
  readonly take: number | null;
  readonly skip: number;
  readonly filters: number;
  readonly projectedFields: number;
  readonly relations: number;
  readonly relationDepth: number;
  readonly groupFields: number;
  readonly aggregates: number;
}

export interface CocoQLSafetyReport {
  readonly type: "SafetyReport";
  readonly version: typeof COCOQL_SAFETY_VERSION;
  readonly operation: "read";
  readonly allowed: true;
  readonly metrics: CocoQLReadSafetyMetrics;
}

export interface CocoQLMutationSafetyReport {
  readonly type: "SafetyReport";
  readonly version: typeof COCOQL_SAFETY_VERSION;
  readonly operation: CocoQLMutationOperation;
  readonly allowed: true;
  readonly metrics: {
    readonly filters: number;
    readonly changes: number;
    readonly confirmedAffectedRows: number | null;
    readonly preview: boolean;
  };
}

interface SafetyTarget {
  readonly location?: CocoQLSourceLocation;
  readonly path: CocoQLIssuePath;
}

/**
 * Defines deterministic read and mutation safety limits for CocoQL planning.
 */
export function defineCocoQLSafetyPolicy(policy: CocoQLSafetyPolicy): CocoQLSafetyPolicy {
  assertSafetyPolicy(policy);
  return Object.freeze({ version: COCOQL_SAFETY_VERSION, read: Object.freeze({ ...policy.read }), mutation: Object.freeze({ ...policy.mutation }) });
}

/**
 * Applies deterministic read limits to a validated CocoQL query plan.
 */
export function enforceCocoQLSafety(query: CocoQLQuery, schema: CocoQLSchema, policy: CocoQLSafetyPolicy): CocoQLSafetyReport {
  validateCocoQL(query, schema);
  assertSafetyPolicy(policy);
  const sourceMap = getCocoQLSourceMap(query);
  const relationPaths = query.with.flatMap((path) => resolveCocoQLRelationPath(query.source.entity, path, schema).map((relation) => relation.path));
  const uniqueRelations = new Set(relationPaths);
  const metrics: CocoQLReadSafetyMetrics = {
    take: query.take ?? null,
    skip: query.skip ?? 0,
    filters: query.filters.length,
    projectedFields: query.select.length,
    relations: uniqueRelations.size,
    relationDepth: Math.max(0, ...relationPaths.map((path) => path.split(".").length)),
    groupFields: query.group.length,
    aggregates: query.aggregates.length,
  };
  const limits = policy.read;

  if (limits.requireTake && query.take === undefined) violation("read.requireTake", "Read queries must include an explicit 'take' clause.", target(undefined, ["take"]));
  if (query.take !== undefined && query.take > limits.maxTake) violation("read.maxTake", `take ${query.take} exceeds the safety maximum of ${limits.maxTake}.`, target(sourceMap?.take, ["take"]));
  if ((query.skip ?? 0) > limits.maxSkip) violation("read.maxSkip", `skip ${query.skip} exceeds the safety maximum of ${limits.maxSkip}.`, target(sourceMap?.skip, ["skip"]));
  if (metrics.filters > limits.maxFilters) violation("read.maxFilters", `Query has ${metrics.filters} filters; safety allows ${limits.maxFilters}.`, target(sourceMap?.filters[limits.maxFilters], ["filters", limits.maxFilters]));
  if (metrics.projectedFields > limits.maxProjectedFields) violation("read.maxProjectedFields", `Query selects ${metrics.projectedFields} fields; safety allows ${limits.maxProjectedFields}.`, target(sourceMap?.select[limits.maxProjectedFields], ["select", limits.maxProjectedFields]));
  if (metrics.relations > limits.maxRelations) violation("read.maxRelations", `Query traverses ${metrics.relations} relations; safety allows ${limits.maxRelations}.`, target(sourceMap?.relations[0], ["with"]));
  if (metrics.relationDepth > limits.maxRelationDepth) violation("read.maxRelationDepth", `Relation depth ${metrics.relationDepth} exceeds the safety maximum of ${limits.maxRelationDepth}.`, target(sourceMap?.relations[0], ["with"]));
  if (metrics.groupFields > limits.maxGroupFields) violation("read.maxGroupFields", `Query groups ${metrics.groupFields} fields; safety allows ${limits.maxGroupFields}.`, target(sourceMap?.group[limits.maxGroupFields], ["group", limits.maxGroupFields]));
  if (metrics.aggregates > limits.maxAggregates) violation("read.maxAggregates", `Query uses ${metrics.aggregates} aggregates; safety allows ${limits.maxAggregates}.`, target(sourceMap?.aggregates[limits.maxAggregates], ["aggregates", limits.maxAggregates]));

  return Object.freeze({ type: "SafetyReport", version: COCOQL_SAFETY_VERSION, operation: "read", allowed: true, metrics: Object.freeze(metrics) });
}

/**
 * Rejects unsafe CocoQL mutation plans before SQL compilation.
 */
export function enforceCocoQLMutationSafety(mutation: CocoQLMutation, schema: CocoQLSchema, policy: CocoQLSafetyPolicy): CocoQLMutationSafetyReport {
  validateCocoQLMutation(mutation, schema);
  assertSafetyPolicy(policy);
  const limits = policy.mutation;
  const sourceMap = getCocoQLMutationSourceMap(mutation);
  const requiresFilter = mutation.operation === "update" ? limits.requireFilterForUpdate : mutation.operation === "delete" ? limits.requireFilterForDelete : false;
  if (requiresFilter && mutation.filters.length === 0) mutationViolation(mutation.operation, `mutation.requireFilterFor${mutation.operation === "update" ? "Update" : "Delete"}`, `${mutation.operation} requires at least one explicit filter.`, target(sourceMap?.operation, ["filters"]));
  if (mutation.filters.length > limits.maxFilters) mutationViolation(mutation.operation, "mutation.maxFilters", `Mutation has ${mutation.filters.length} filters; safety allows ${limits.maxFilters}.`, target(sourceMap?.filters[limits.maxFilters], ["filters", limits.maxFilters]));
  if (mutation.changes.length > limits.maxChanges) mutationViolation(mutation.operation, "mutation.maxChanges", `Mutation changes ${mutation.changes.length} fields; safety allows ${limits.maxChanges}.`, target(sourceMap?.changes[limits.maxChanges], ["changes", limits.maxChanges]));
  if (!mutation.preview && limits.requireConfirmation && !mutation.confirmation) mutationViolation(mutation.operation, "mutation.requireConfirmation", "Executable mutations require 'confirm affected <= <limit>'.", target(sourceMap?.operation, ["confirmation"]));
  if (mutation.confirmation && mutation.confirmation.maxAffectedRows > limits.maxAffectedRows) mutationViolation(mutation.operation, "mutation.maxAffectedRows", `Confirmation ${mutation.confirmation.maxAffectedRows} exceeds the safety maximum of ${limits.maxAffectedRows}.`, target(sourceMap?.confirmation, ["confirmation", "maxAffectedRows"]));
  const metrics = Object.freeze({ filters: mutation.filters.length, changes: mutation.changes.length, confirmedAffectedRows: mutation.confirmation?.maxAffectedRows ?? null, preview: mutation.preview });
  return Object.freeze({ type: "SafetyReport", version: COCOQL_SAFETY_VERSION, operation: mutation.operation, allowed: true, metrics });
}

function assertSafetyPolicy(policy: CocoQLSafetyPolicy): void {
  if (!policy || typeof policy !== "object" || policy.version !== COCOQL_SAFETY_VERSION) invalidSafetyPolicy("Safety policy version must be '0.1'.", ["version"]);
  if (!policy.read || typeof policy.read !== "object" || typeof policy.read.requireTake !== "boolean") invalidSafetyPolicy("Safety policy requires explicit read limits.", ["read"]);
  for (const name of ["maxTake", "maxSkip", "maxFilters", "maxProjectedFields", "maxRelations", "maxRelationDepth", "maxGroupFields", "maxAggregates"] as const) {
    const value = policy.read[name];
    if (!Number.isSafeInteger(value) || value < 0) invalidSafetyPolicy(`Safety limit '${name}' must be a non-negative safe integer.`, ["read", name]);
  }
  if (policy.read.maxTake > 10_000) invalidSafetyPolicy("Safety maxTake cannot exceed the CocoQL language maximum of 10000.", ["read", "maxTake"]);
  if (!policy.mutation || typeof policy.mutation !== "object"
    || typeof policy.mutation.requireFilterForUpdate !== "boolean"
    || typeof policy.mutation.requireFilterForDelete !== "boolean"
    || typeof policy.mutation.requireConfirmation !== "boolean") invalidSafetyPolicy("Safety policy requires explicit mutation limits.", ["mutation"]);
  for (const name of ["maxAffectedRows", "maxFilters", "maxChanges"] as const) {
    const value = policy.mutation[name];
    if (!Number.isSafeInteger(value) || value < 0) invalidSafetyPolicy(`Mutation safety limit '${name}' must be a non-negative safe integer.`, ["mutation", name]);
  }
  if (policy.mutation.maxAffectedRows < 1) invalidSafetyPolicy("Mutation maxAffectedRows must be at least 1.", ["mutation", "maxAffectedRows"]);
}

function violation(rule: string, message: string, diagnostic: SafetyTarget): never {
  return cocoQLError({ error: "SAFETY_VIOLATION", stage: "safety", operation: "read", rule, message, ...diagnostic });
}

function mutationViolation(operation: CocoQLMutationOperation, rule: string, message: string, diagnostic: SafetyTarget): never {
  return cocoQLError({ error: "SAFETY_VIOLATION", stage: "safety", operation, rule, message, ...diagnostic });
}

function invalidSafetyPolicy(message: string, path: CocoQLIssuePath): never {
  return cocoQLError({ error: "INVALID_SAFETY_POLICY", stage: "safety", operation: "read", message, path });
}

function target(location: CocoQLSourceLocation | undefined, path: CocoQLIssuePath): SafetyTarget {
  return { ...(location ? { location } : {}), path };
}
