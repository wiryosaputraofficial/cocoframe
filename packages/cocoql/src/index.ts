export { COCOQL_VERSION } from "./ast.ts";
export type { CocoQLAggregate, CocoQLAggregateFunction, CocoQLFilter, CocoQLFilterOperator, CocoQLMutation, CocoQLMutationAssignment, CocoQLMutationConfirmation, CocoQLMutationOperation, CocoQLNamedDate, CocoQLParameter, CocoQLQuery, CocoQLScalar, CocoQLSemanticDateExpression, CocoQLSort, CocoQLValue } from "./ast.ts";
export { COCOQL_ISSUE_VERSION, CocoQLError } from "./errors.ts";
export type { CocoQLErrorCode, CocoQLErrorStage, CocoQLIssue, CocoQLIssueInput, CocoQLIssuePath, CocoQLPermissionTarget, CocoQLSourceLocation } from "./errors.ts";
export { lexCocoQL } from "./lexer.ts";
export type { CocoQLToken, CocoQLTokenKind } from "./lexer.ts";
export { parseCocoQL } from "./parser.ts";
export { parseCocoQLMutation } from "./mutation-parser.ts";
export { authorizeCocoQL, authorizeCocoQLMutation, COCOQL_PERMISSION_VERSION, defineCocoQLPermissions } from "./permissions.ts";
export type { CocoQLEntityReadPermission, CocoQLPermissionPolicy } from "./permissions.ts";
export { COCOQL_PLAN_VERSION, formatCocoQLPlan, planCocoQL, validateCocoQLPlan } from "./plan.ts";
export type { CocoQLPlanAggregate, CocoQLPlanDateRange, CocoQLPlanFieldRef, CocoQLPlanFilter, CocoQLPlanJoin, CocoQLPlanOptions, CocoQLPlanOrderTarget, CocoQLPlanSort, CocoQLPlanValue, CocoQLQueryPlan } from "./plan.ts";
export { COCOQL_NAMED_DATES, resolveCocoQLDateRange } from "./semantic-date.ts";
export type { CocoQLDateRange } from "./semantic-date.ts";
export { COCOQL_SAFETY_VERSION, defineCocoQLSafetyPolicy, enforceCocoQLMutationSafety, enforceCocoQLSafety } from "./safety.ts";
export type { CocoQLMutationSafetyLimits, CocoQLMutationSafetyReport, CocoQLReadSafetyLimits, CocoQLReadSafetyMetrics, CocoQLSafetyPolicy, CocoQLSafetyReport } from "./safety.ts";
export { defineCocoQLSchema } from "./schema.ts";
export type { CocoQLEntitySchema, CocoQLFieldSchema, CocoQLFieldType, CocoQLRelationSchema, CocoQLRelationType, CocoQLSchema } from "./schema.ts";
export { validateCocoQL } from "./semantic.ts";
export { formatCocoQL, formatCocoQLAst, formatCocoQLMutation, formatCocoQLMutationAst } from "./formatter.ts";
export { COCOQL_MUTATION_PLAN_VERSION, formatCocoQLMutationPlan, planCocoQLMutation, previewCocoQLMutation, validateCocoQLMutation, validateCocoQLMutationPlan } from "./mutation.ts";
export type { CocoQLMutationPlan, CocoQLMutationPreview, CocoQLPlanAssignment } from "./mutation.ts";
export { compileCocoQLToMySql } from "./compiler/mysql.ts";
export type { CompiledCocoQL } from "./compiler/mysql.ts";
export { compileCocoQLMutationToMySql } from "./compiler/mysql-mutation.ts";
export type { CompiledCocoQLMutation } from "./compiler/mysql-mutation.ts";
export { compileCocoQLToPostgres } from "./compiler/postgres.ts";
export type { CocoQLPostgresCte, CocoQLPostgresHaving, CocoQLPostgresPredicate, CocoQLPostgresReadOptions, CompiledCocoQLPostgres } from "./compiler/postgres.ts";
export { compileCocoQLMutationToPostgres } from "./compiler/postgres-mutation.ts";
export type { CocoQLPostgresConflict, CocoQLPostgresMutationCompileOptions, CompiledCocoQLPostgresMutation } from "./compiler/postgres-mutation.ts";

import type { CocoQLSchema } from "./schema.ts";
import { parseCocoQL } from "./parser.ts";
import { planCocoQL, type CocoQLPlanOptions } from "./plan.ts";
import { compileCocoQLToMySql, type CompiledCocoQL } from "./compiler/mysql.ts";
import { parseCocoQLMutation } from "./mutation-parser.ts";
import { authorizeCocoQLMutation, type CocoQLPermissionPolicy } from "./permissions.ts";
import { enforceCocoQLMutationSafety, type CocoQLSafetyPolicy } from "./safety.ts";
import { planCocoQLMutation } from "./mutation.ts";
import { compileCocoQLMutationToMySql, type CompiledCocoQLMutation } from "./compiler/mysql-mutation.ts";
import { compileCocoQLToPostgres, type CocoQLPostgresReadOptions, type CompiledCocoQLPostgres } from "./compiler/postgres.ts";
import { compileCocoQLMutationToPostgres, type CocoQLPostgresMutationCompileOptions, type CompiledCocoQLPostgresMutation } from "./compiler/postgres-mutation.ts";
import { CocoQLError } from "./errors.ts";

/**
 * Compiles Coco QL into guarded parameterized output.
 */
export function compileCocoQL(source: string, schema: CocoQLSchema, options: CocoQLPlanOptions = {}): CompiledCocoQL {
  return compileCocoQLToMySql(planCocoQL(parseCocoQL(source), schema, options), schema);
}

/**
 * Compiles Coco QL Postgres into guarded parameterized output.
 */
export function compileCocoQLPostgres(source: string, schema: CocoQLSchema, options: CocoQLPlanOptions & CocoQLPostgresReadOptions = {}): CompiledCocoQLPostgres {
  return compileCocoQLToPostgres(planCocoQL(parseCocoQL(source), schema, options), schema, options);
}

/** Runs the explicit parse -> permission -> safety -> plan -> MySQL write pipeline. */
export function compileCocoQLMutation(source: string, schema: CocoQLSchema, permissions: CocoQLPermissionPolicy, safety: CocoQLSafetyPolicy, options: CocoQLPlanOptions = {}): CompiledCocoQLMutation {
  const mutation = parseCocoQLMutation(source);
  authorizeCocoQLMutation(mutation, schema, permissions);
  enforceCocoQLMutationSafety(mutation, schema, safety);
  return compileCocoQLMutationToMySql(planCocoQLMutation(mutation, schema, options), schema);
}

/** Runs the same guarded mutation pipeline and emits PostgreSQL placeholders. */
export function compileCocoQLMutationPostgres(source: string, schema: CocoQLSchema, permissions: CocoQLPermissionPolicy, safety: CocoQLSafetyPolicy, options: CocoQLPlanOptions & CocoQLPostgresMutationCompileOptions = {}): CompiledCocoQLPostgresMutation {
  const mutation = parseCocoQLMutation(source);
  authorizeCocoQLMutation(mutation, schema, permissions);
  enforceCocoQLMutationSafety(mutation, schema, safety);
  authorizePostgresMutationOutput(mutation.entity, permissions, options);
  return compileCocoQLMutationToPostgres(planCocoQLMutation(mutation, schema, options), schema, options);
}

function authorizePostgresMutationOutput(entity: string, permissions: CocoQLPermissionPolicy, options: CocoQLPostgresMutationCompileOptions): void {
  const rule = permissions.entities[entity];
  for (const field of options.returning ?? []) if (!rule?.fields.includes(field)) throw postgresMutationFieldDenied(entity, field, `PostgreSQL RETURNING field '${entity}.${field}' is denied by the CocoQL policy.`);
  for (const field of options.conflict?.update ?? []) if (!rule?.update?.includes(field)) throw postgresMutationFieldDenied(entity, field, `PostgreSQL ON CONFLICT update field '${entity}.${field}' is denied by the CocoQL policy.`);
}

function postgresMutationFieldDenied(entity: string, field: string, message: string): CocoQLError {
  return new CocoQLError({ error: "PERMISSION_DENIED", stage: "permission", permission: "field", entity, field, message });
}
