import type { CocoQLAggregateFunction, CocoQLMutation, CocoQLMutationOperation, CocoQLQuery } from "./ast.ts";
import { cocoQLError, type CocoQLIssuePath, type CocoQLPermissionTarget, type CocoQLSourceLocation } from "./errors.ts";
import type { CocoQLSchema } from "./schema.ts";
import { resolveCocoQLFieldPath, resolveCocoQLRelationPath, validateCocoQL } from "./semantic.ts";
import { getCocoQLSourceMap } from "./source-map.ts";
import { getCocoQLMutationSourceMap } from "./mutation-source-map.ts";
import { validateCocoQLMutation } from "./mutation.ts";

/**
 * Identifies the stable cocoql permission version contract used by @cocoframe/cocoql.
 */
export const COCOQL_PERMISSION_VERSION = "0.1" as const;

export interface CocoQLEntityReadPermission {
  readonly fields: readonly string[];
  readonly relations?: readonly string[];
  readonly aggregates?: readonly CocoQLAggregateFunction[];
  readonly create?: readonly string[];
  readonly update?: readonly string[];
  readonly delete?: boolean;
}

export interface CocoQLPermissionPolicy {
  readonly version: typeof COCOQL_PERMISSION_VERSION;
  readonly entities: Readonly<Record<string, CocoQLEntityReadPermission>>;
}

interface PermissionTarget {
  readonly location?: CocoQLSourceLocation;
  readonly path: CocoQLIssuePath;
}

const AGGREGATE_FUNCTIONS = new Set<CocoQLAggregateFunction>(["count", "sum", "avg", "min", "max"]);

/**
 * Defines an explicit default-deny CocoQL permission policy against a public schema.
 */
export function defineCocoQLPermissions(policy: CocoQLPermissionPolicy): CocoQLPermissionPolicy {
  assertPolicyShape(policy);
  const entities = Object.fromEntries(Object.entries(policy.entities).map(([entity, rule]) => [entity, Object.freeze({
    fields: Object.freeze([...rule.fields]),
    ...(rule.relations ? { relations: Object.freeze([...rule.relations]) } : {}),
    ...(rule.aggregates ? { aggregates: Object.freeze([...rule.aggregates]) } : {}),
    ...(rule.create ? { create: Object.freeze([...rule.create]) } : {}),
    ...(rule.update ? { update: Object.freeze([...rule.update]) } : {}),
    ...(rule.delete === undefined ? {} : { delete: rule.delete }),
  })]));
  return Object.freeze({ version: COCOQL_PERMISSION_VERSION, entities: Object.freeze(entities) });
}

/** Applies default-deny write permissions. Safety remains a separate mandatory layer. */
export function authorizeCocoQLMutation(mutation: CocoQLMutation, schema: CocoQLSchema, policy: CocoQLPermissionPolicy): CocoQLMutation {
  validateCocoQLMutation(mutation, schema);
  assertPolicyShape(policy);
  validatePolicyReferences(policy, schema);
  const sourceMap = getCocoQLMutationSourceMap(mutation);
  const rule = mutationEntityRule(policy, mutation.entity, mutation.operation, target(sourceMap?.entity, ["entity"]));
  for (const [index, filter] of mutation.filters.entries()) mutationReadField(policy, mutation.entity, filter.field, schema, mutation.operation, target(sourceMap?.filters[index], ["filters", index]));
  if (mutation.operation === "delete") {
    if (rule.delete !== true) mutationDenied("entity", "Delete access is denied by the CocoQL policy.", mutation.operation, target(sourceMap?.operation, ["operation"]), { entity: mutation.entity });
  } else {
    const allowed = mutation.operation === "create" ? rule.create : rule.update;
    for (const [index, change] of mutation.changes.entries()) {
      if (!allowed?.includes(change.field)) mutationDenied("field", `${mutation.operation} access to field '${mutation.entity}.${change.field}' is denied by the CocoQL policy.`, mutation.operation, target(sourceMap?.changes[index], ["changes", index]), { entity: mutation.entity, field: change.field });
    }
  }
  return mutation;
}

/** Applies one explicit, default-deny read policy after semantic validation. */
export function authorizeCocoQL(query: CocoQLQuery, schema: CocoQLSchema, policy: CocoQLPermissionPolicy): CocoQLQuery {
  validateCocoQL(query, schema);
  assertPolicyShape(policy);
  validatePolicyReferences(policy, schema);
  const sourceMap = getCocoQLSourceMap(query);

  requireEntity(policy, query.source.entity, target(sourceMap?.entity, ["source", "entity"]));

  for (const [index, path] of query.with.entries()) {
    const diagnostic = target(sourceMap?.relations[index], ["with", index]);
    for (const relation of resolveCocoQLRelationPath(query.source.entity, path, schema)) {
      const rule = requireEntity(policy, relation.fromEntity, diagnostic);
      if (!rule.relations?.includes(relation.relation)) {
        denied("relation", `Read access to relation '${relation.path}' is denied by the CocoQL policy.`, diagnostic, {
          entity: relation.fromEntity,
          relation: relation.path,
        });
      }
      requireEntity(policy, relation.targetEntity, diagnostic);
    }
  }

  for (const [index, field] of query.group.entries()) requireField(policy, query.source.entity, field, schema, target(sourceMap?.group[index], ["group", index]));
  for (const [index, field] of query.select.entries()) requireField(policy, query.source.entity, field, schema, target(sourceMap?.select[index], ["select", index]));
  for (const [index, filter] of query.filters.entries()) requireField(policy, query.source.entity, filter.field, schema, target(sourceMap?.filters[index], ["filters", index]));

  for (const [index, aggregate] of query.aggregates.entries()) {
    const diagnostic = target(sourceMap?.aggregates[index], ["aggregates", index]);
    const field = requireField(policy, query.source.entity, aggregate.field, schema, diagnostic);
    const rule = requireEntity(policy, field.entity, diagnostic);
    if (!rule.aggregates?.includes(aggregate.function)) {
      denied("aggregate", `Aggregate '${aggregate.function}' is denied on entity '${field.entity}' by the CocoQL policy.`, diagnostic, {
        entity: field.entity,
        field: aggregate.field,
      });
    }
  }

  const aggregateAliases = new Set(query.aggregates.map((aggregate) => aggregate.alias));
  for (const [index, sort] of query.sort.entries()) {
    if (!aggregateAliases.has(sort.field)) requireField(policy, query.source.entity, sort.field, schema, target(sourceMap?.sort[index], ["sort", index]));
  }
  return query;
}

function requireEntity(policy: CocoQLPermissionPolicy, entity: string, diagnostic: PermissionTarget): CocoQLEntityReadPermission {
  const rule = Object.hasOwn(policy.entities, entity) ? policy.entities[entity] : undefined;
  if (!rule) denied("entity", `Read access to entity '${entity}' is denied by the CocoQL policy.`, diagnostic, { entity });
  return rule;
}

function requireField(policy: CocoQLPermissionPolicy, rootEntity: string, path: string, schema: CocoQLSchema, diagnostic: PermissionTarget) {
  const field = resolveCocoQLFieldPath(rootEntity, path, schema);
  const rule = requireEntity(policy, field.entity, diagnostic);
  if (!rule.fields.includes(field.field)) {
    denied("field", `Read access to field '${field.entity}.${field.field}' is denied by the CocoQL policy.`, diagnostic, {
      entity: field.entity,
      field: path,
    });
  }
  return field;
}

function validatePolicyReferences(policy: CocoQLPermissionPolicy, schema: CocoQLSchema): void {
  for (const [entity, rule] of Object.entries(policy.entities)) {
    const entitySchema = Object.hasOwn(schema.entities, entity) ? schema.entities[entity] : undefined;
    if (!entitySchema) invalidPolicy(`Permission policy references unknown entity '${entity}'.`, ["entities", entity]);
    for (const field of rule.fields) {
      if (!Object.hasOwn(entitySchema.fields, field)) invalidPolicy(`Permission policy references unknown field '${entity}.${field}'.`, ["entities", entity, "fields"]);
    }
    for (const relation of rule.relations ?? []) {
      if (!entitySchema.relations || !Object.hasOwn(entitySchema.relations, relation)) invalidPolicy(`Permission policy references unknown relation '${entity}.${relation}'.`, ["entities", entity, "relations"]);
    }
    for (const [kind, fields] of [["create", rule.create], ["update", rule.update]] as const) {
      for (const field of fields ?? []) if (!Object.hasOwn(entitySchema.fields, field)) invalidPolicy(`Permission policy references unknown ${kind} field '${entity}.${field}'.`, ["entities", entity, kind]);
    }
  }
}

function assertPolicyShape(policy: CocoQLPermissionPolicy): void {
  if (!policy || typeof policy !== "object" || policy.version !== COCOQL_PERMISSION_VERSION) invalidPolicy("Permission policy version must be '0.1'.", ["version"]);
  if (!policy.entities || typeof policy.entities !== "object" || Array.isArray(policy.entities)) invalidPolicy("Permission policy entities must be an object.", ["entities"]);
  for (const [entity, rule] of Object.entries(policy.entities)) {
    if (!/^[a-z_][a-z0-9_]*$/.test(entity) || !rule || typeof rule !== "object") invalidPolicy(`Permission policy contains invalid entity rule '${entity}'.`, ["entities", entity]);
    assertUniqueNames(rule.fields, ["entities", entity, "fields"]);
    if (rule.relations !== undefined) assertUniqueNames(rule.relations, ["entities", entity, "relations"]);
    if (rule.aggregates !== undefined) {
      assertUniqueNames(rule.aggregates, ["entities", entity, "aggregates"]);
      if (!rule.aggregates.every((aggregate) => AGGREGATE_FUNCTIONS.has(aggregate))) invalidPolicy(`Permission policy contains an unsupported aggregate for '${entity}'.`, ["entities", entity, "aggregates"]);
    }
    if (rule.create !== undefined) assertUniqueNames(rule.create, ["entities", entity, "create"]);
    if (rule.update !== undefined) assertUniqueNames(rule.update, ["entities", entity, "update"]);
    if (rule.delete !== undefined && typeof rule.delete !== "boolean") invalidPolicy(`Permission delete rule for '${entity}' must be boolean.`, ["entities", entity, "delete"]);
  }
}

function mutationEntityRule(policy: CocoQLPermissionPolicy, entity: string, operation: CocoQLMutationOperation, diagnostic: PermissionTarget): CocoQLEntityReadPermission {
  const rule = Object.hasOwn(policy.entities, entity) ? policy.entities[entity] : undefined;
  if (!rule) mutationDenied("entity", `${operation} access to entity '${entity}' is denied by the CocoQL policy.`, operation, diagnostic, { entity });
  return rule;
}

function mutationReadField(policy: CocoQLPermissionPolicy, entity: string, field: string, schema: CocoQLSchema, operation: CocoQLMutationOperation, diagnostic: PermissionTarget): void {
  const resolved = resolveCocoQLFieldPath(entity, field, schema);
  const rule = mutationEntityRule(policy, resolved.entity, operation, diagnostic);
  if (!rule.fields.includes(resolved.field)) mutationDenied("field", `Filter access to field '${entity}.${field}' is denied by the CocoQL policy.`, operation, diagnostic, { entity, field });
}

function mutationDenied(permission: CocoQLPermissionTarget, message: string, operation: CocoQLMutationOperation, diagnostic: PermissionTarget, context: { readonly entity?: string; readonly field?: string }): never {
  return cocoQLError({ error: "PERMISSION_DENIED", stage: "permission", operation, permission, message, ...diagnostic, ...context });
}

function assertUniqueNames(values: readonly string[], path: CocoQLIssuePath): void {
  if (!Array.isArray(values) || !values.every((value) => typeof value === "string" && /^[a-z_][a-z0-9_]*$/.test(value)) || new Set(values).size !== values.length) {
    invalidPolicy("Permission lists must contain unique canonical names.", path);
  }
}

function denied(permission: CocoQLPermissionTarget, message: string, diagnostic: PermissionTarget, context: { readonly entity?: string; readonly field?: string; readonly relation?: string }): never {
  return cocoQLError({
    error: "PERMISSION_DENIED",
    stage: "permission",
    operation: "read",
    permission,
    message,
    ...diagnostic,
    ...context,
  });
}

function invalidPolicy(message: string, path: CocoQLIssuePath): never {
  return cocoQLError({ error: "INVALID_PERMISSION_POLICY", stage: "permission", operation: "read", message, path });
}

function target(location: CocoQLSourceLocation | undefined, path: CocoQLIssuePath): PermissionTarget {
  return { ...(location ? { location } : {}), path };
}
