import type { CocoQLAggregate, CocoQLFilter, CocoQLQuery, CocoQLScalar } from "./ast.ts";
import { cocoQLError, type CocoQLIssuePath, type CocoQLSourceLocation } from "./errors.ts";
import type { CocoQLEntitySchema, CocoQLFieldSchema, CocoQLRelationSchema, CocoQLSchema } from "./schema.ts";
import { getCocoQLSourceMap } from "./source-map.ts";

export interface CocoQLDiagnosticTarget {
  readonly location?: CocoQLSourceLocation;
  readonly path?: CocoQLIssuePath;
}

export interface CocoQLResolvedRelation {
  readonly path: string;
  readonly parentPath: string | null;
  readonly relation: string;
  readonly fromEntity: string;
  readonly targetEntity: string;
  readonly schema: CocoQLRelationSchema;
}

export interface CocoQLResolvedField {
  readonly relationPath: string | null;
  readonly entity: string;
  readonly field: string;
  readonly schema: CocoQLFieldSchema;
}

/**
 * Validates Coco QL and returns a typed value or structured diagnostic.
 */
export function validateCocoQL(query: CocoQLQuery, schema: CocoQLSchema): CocoQLQuery {
  const sourceMap = getCocoQLSourceMap(query);
  const entity = Object.hasOwn(schema.entities, query.source.entity) ? schema.entities[query.source.entity] : undefined;
  if (!entity) {
    const entities = Object.keys(schema.entities).sort();
    cocoQLError({
      error: "UNKNOWN_ENTITY",
      stage: "semantic",
      entity: query.source.entity,
      message: `Entity '${query.source.entity}' does not exist in the CocoQL schema.`,
      ...(sourceMap?.entity ? { location: sourceMap.entity } : {}),
      path: ["source", "entity"],
      availableEntities: entities,
      suggestions: suggestions(query.source.entity, entities),
    });
  }

  const includedRelations = new Set<string>();
  for (const [index, path] of query.with.entries()) {
    for (const relation of resolveCocoQLRelationPath(query.source.entity, path, schema, diagnosticTarget(sourceMap?.relations[index], ["with", index]))) includedRelations.add(relation.path);
  }

  for (const [index, field] of query.group.entries()) validateField(query.source.entity, field, schema, includedRelations, diagnosticTarget(sourceMap?.group[index], ["group", index]));
  for (const [index, field] of query.select.entries()) validateField(query.source.entity, field, schema, includedRelations, diagnosticTarget(sourceMap?.select[index], ["select", index]));
  for (const [index, filter] of query.filters.entries()) {
    const target = diagnosticTarget(sourceMap?.filters[index], ["filters", index]);
    const field = validateField(query.source.entity, filter.field, schema, includedRelations, target);
    validateCocoQLFilterValue(field.entity, filter, field.schema, target);
  }
  const aggregateAliases = new Set<string>();
  for (const [index, aggregate] of query.aggregates.entries()) {
    const target = diagnosticTarget(sourceMap?.aggregates[index], ["aggregates", index]);
    const field = validateField(query.source.entity, aggregate.field, schema, includedRelations, target);
    validateAggregate(aggregate, field.schema, target);
    if (aggregateAliases.has(aggregate.alias)) invalidAggregation(`Aggregate alias '${aggregate.alias}' may appear only once.`, target);
    if (query.select.some((selected) => selected === aggregate.alias || selected.endsWith(`.${aggregate.alias}`))) {
      invalidAggregation(`Aggregate alias '${aggregate.alias}' conflicts with a selected field.`, target);
    }
    aggregateAliases.add(aggregate.alias);
  }
  if (query.group.length > 0 && query.aggregates.length === 0) invalidAggregation("A 'group' clause requires at least one aggregate expression.", diagnosticTarget(sourceMap?.group[0], ["group"]));
  const grouped = new Set(query.group);
  if (query.aggregates.length > 0) {
    for (const [index, field] of query.select.entries()) {
      if (!grouped.has(field)) invalidAggregation(`Selected field '${field}' must appear in a 'group' clause when aggregates are used.`, diagnosticTarget(sourceMap?.select[index], ["select", index]));
    }
  }
  for (const [index, item] of query.sort.entries()) {
    if (aggregateAliases.has(item.field)) continue;
    const target = diagnosticTarget(sourceMap?.sort[index], ["sort", index]);
    validateField(query.source.entity, item.field, schema, includedRelations, target);
    if (query.aggregates.length > 0 && !grouped.has(item.field)) invalidAggregation(`Sort field '${item.field}' must be grouped or reference an aggregate alias.`, target);
  }
  if (query.take !== undefined && query.take > 10_000) cocoQLError({ error: "INVALID_LIMIT", stage: "semantic", message: "take cannot exceed 10000 in CocoQL 0.1.", ...diagnosticTarget(sourceMap?.take, ["take"]) });
  return query;
}

function validateAggregate(aggregate: CocoQLAggregate, field: CocoQLFieldSchema, target: CocoQLDiagnosticTarget): void {
  if ((aggregate.function === "sum" || aggregate.function === "avg") && field.type !== "number" && field.type !== "money") {
    invalidAggregation(`Aggregate '${aggregate.function}' requires a number or money field; '${aggregate.field}' is ${field.type}.`, target);
  }
  if ((aggregate.function === "min" || aggregate.function === "max") && field.type === "boolean") {
    invalidAggregation(`Aggregate '${aggregate.function}' does not support boolean field '${aggregate.field}'.`, target);
  }
}

export function resolveCocoQLRelationPath(rootEntity: string, path: string, schema: CocoQLSchema, target: CocoQLDiagnosticTarget = {}): readonly CocoQLResolvedRelation[] {
  const segments = path.split(".");
  let currentEntity = rootEntity;
  let parentPath: string | null = null;
  const resolved: CocoQLResolvedRelation[] = [];
  for (const relationName of segments) {
    const entity = Object.hasOwn(schema.entities, currentEntity) ? schema.entities[currentEntity] : undefined;
    if (!entity) invalidSchema(`Entity '${currentEntity}' referenced by relation path '${path}' is not defined.`);
    const relation = entity.relations && Object.hasOwn(entity.relations, relationName) ? entity.relations[relationName] : undefined;
    if (!relation) {
      cocoQLError({
        error: "UNKNOWN_RELATION",
        stage: "semantic",
        entity: currentEntity,
        relation: relationName,
        message: `Relation '${relationName}' does not exist on ${currentEntity}.`,
        ...target,
        availableRelations: Object.keys(entity.relations ?? {}).sort(),
        suggestions: suggestions(relationName, Object.keys(entity.relations ?? {})),
      });
    }
    if (!Object.hasOwn(schema.entities, relation.entity)) invalidSchema(`Relation '${currentEntity}.${relationName}' targets unknown entity '${relation.entity}'.`);
    const relationPath: string = parentPath === null ? relationName : `${parentPath}.${relationName}`;
    resolved.push({
      path: relationPath,
      parentPath,
      relation: relationName,
      fromEntity: currentEntity,
      targetEntity: relation.entity,
      schema: relation,
    });
    currentEntity = relation.entity;
    parentPath = relationPath;
  }
  return resolved;
}

export function resolveCocoQLFieldPath(rootEntity: string, path: string, schema: CocoQLSchema, target: CocoQLDiagnosticTarget = {}): CocoQLResolvedField {
  const segments = path.split(".");
  const fieldName = segments.pop()!;
  const relationPath = segments.length === 0 ? null : segments.join(".");
  const entityName = relationPath === null
    ? rootEntity
    : resolveCocoQLRelationPath(rootEntity, relationPath, schema, target).at(-1)!.targetEntity;
  const entity = Object.hasOwn(schema.entities, entityName) ? schema.entities[entityName] : undefined;
  if (!entity) invalidSchema(`Entity '${entityName}' referenced by field '${path}' is not defined.`);
  const field = Object.hasOwn(entity.fields, fieldName) ? entity.fields[fieldName] : undefined;
  if (!field) {
    const fields = Object.keys(entity.fields).sort();
    cocoQLError({
      error: "UNKNOWN_FIELD",
      stage: "semantic",
      entity: entityName,
      field: path,
      message: `Field '${fieldName}' does not exist on ${entityName}.`,
      ...target,
      suggestions: suggestions(fieldName, fields).map((candidate) => relationPath === null ? candidate : `${relationPath}.${candidate}`),
      availableFields: fields.map((candidate) => relationPath === null ? candidate : `${relationPath}.${candidate}`),
    });
  }
  return { relationPath, entity: entityName, field: fieldName, schema: field };
}

function validateField(rootEntity: string, path: string, schema: CocoQLSchema, includedRelations: ReadonlySet<string>, target: CocoQLDiagnosticTarget): CocoQLResolvedField {
  const field = resolveCocoQLFieldPath(rootEntity, path, schema, target);
  if (field.relationPath !== null && !includedRelations.has(field.relationPath)) {
    cocoQLError({
      error: "RELATION_NOT_INCLUDED",
      stage: "semantic",
      entity: rootEntity,
      relation: field.relationPath,
      field: path,
      message: `Field '${path}' requires 'with ${field.relationPath}'.`,
      ...target,
      suggestions: [`with ${field.relationPath}`],
    });
  }
  return field;
}

export function validateCocoQLFilterValue(entity: string, filter: CocoQLFilter, field: CocoQLFieldSchema, target: CocoQLDiagnosticTarget = {}): void {
  if (filter.value.kind === "semantic-date") {
    if (field.type !== "date" && field.type !== "datetime") {
      cocoQLError({ error: "INVALID_VALUE", stage: "semantic", entity, field: filter.field, message: `Semantic date values require a date or datetime field; ${entity}.${filter.field} is ${field.type}.`, ...target });
    }
    if (filter.operator !== "in" && filter.operator !== "not in" && filter.operator !== "before" && filter.operator !== "after") {
      cocoQLError({ error: "INVALID_VALUE", stage: "semantic", entity, field: filter.field, message: `Semantic date values do not support operator '${filter.operator}'.`, ...target });
    }
    return;
  }
  const values = filter.value.kind === "list" ? filter.value.values : [filter.value.value];
  if ((filter.operator === "in" || filter.operator === "not in") !== (filter.value.kind === "list")) {
    cocoQLError({ error: "INVALID_VALUE", stage: "semantic", entity, field: filter.field, message: `Operator '${filter.operator}' has an invalid value shape.`, ...target });
  }
  for (const value of values) {
    if (!valueMatchesField(value, field)) cocoQLError({ error: "INVALID_VALUE", stage: "semantic", entity, field: filter.field, message: `Value ${JSON.stringify(value)} is invalid for ${entity}.${filter.field} (${field.type}).`, ...target });
    if (field.type === "enum" && typeof value === "string" && field.values && !field.values.includes(value)) {
      cocoQLError({ error: "INVALID_VALUE", stage: "semantic", entity, field: filter.field, message: `Value '${value}' is not allowed for ${entity}.${filter.field}.`, suggestions: field.values, ...target });
    }
  }
}

function invalidSchema(message: string): never {
  return cocoQLError({ error: "INVALID_SCHEMA", stage: "semantic", message });
}

function invalidAggregation(message: string, target: CocoQLDiagnosticTarget): never {
  return cocoQLError({ error: "INVALID_AGGREGATION", stage: "semantic", message, ...target });
}

function diagnosticTarget(location: CocoQLSourceLocation | undefined, path: CocoQLIssuePath): CocoQLDiagnosticTarget {
  return { ...(location ? { location } : {}), path };
}

function valueMatchesField(value: CocoQLScalar, field: CocoQLFieldSchema): boolean {
  if (value === null) return field.nullable === true;
  if (field.type === "number" || field.type === "money") return typeof value === "number";
  if (field.type === "boolean") return typeof value === "boolean";
  return typeof value === "string" || (field.type === "id" && typeof value === "number");
}

function suggestions(input: string, candidates: readonly string[]): readonly string[] {
  return [...candidates]
    .map((candidate) => ({ candidate, score: editDistance(input, candidate) }))
    .sort((left, right) => left.score - right.score || left.candidate.localeCompare(right.candidate))
    .slice(0, 3)
    .map(({ candidate }) => candidate);
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      current[rightIndex] = left[leftIndex - 1] === right[rightIndex - 1]
        ? previous[rightIndex - 1]!
        : 1 + Math.min(previous[rightIndex - 1]!, previous[rightIndex]!, current[rightIndex - 1]!);
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length]!;
}
