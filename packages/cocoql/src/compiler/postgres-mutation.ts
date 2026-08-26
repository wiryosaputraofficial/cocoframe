import type { CocoQLParameter, CocoQLScalar } from "../ast.ts";
import { cocoQLError } from "../errors.ts";
import { validateCocoQLMutationPlan, type CocoQLMutationPlan } from "../mutation.ts";
import type { CocoQLPlanFilter } from "../plan.ts";
import type { CocoQLEntitySchema, CocoQLSchema } from "../schema.ts";

export interface CompiledCocoQLPostgresMutation {
  readonly dialect: "postgres";
  readonly operation: "create" | "update" | "delete";
  readonly sql: string;
  readonly parameters: readonly CocoQLParameter[];
  readonly guard: {
    readonly maxAffectedRows: number;
    readonly verifyBeforeCommit: true;
  };
}

export interface CocoQLPostgresConflict {
  readonly fields: readonly string[];
  readonly action: "nothing" | "update";
  readonly update?: readonly string[];
}

export interface CocoQLPostgresMutationCompileOptions {
  readonly returning?: readonly string[];
  readonly conflict?: CocoQLPostgresConflict;
}

/** Compiles an authorized, safety-checked plan. Execution remains adapter-owned. */
export function compileCocoQLMutationToPostgres(plan: CocoQLMutationPlan, schema: CocoQLSchema, options: CocoQLPostgresMutationCompileOptions = {}): CompiledCocoQLPostgresMutation {
  validateCocoQLMutationPlan(plan, schema);
  if (plan.preview) cocoQLError({ error: "PREVIEW_REQUIRED", stage: "compiler", operation: plan.operation, message: "Preview plans cannot be compiled into write SQL.", path: ["preview"] });
  if (!plan.confirmation) cocoQLError({ error: "SAFETY_VIOLATION", stage: "compiler", operation: plan.operation, rule: "mutation.requireConfirmation", message: "Write SQL requires an affected-row confirmation.", path: ["confirmation"] });
  const entity = schema.entities[plan.rootEntity]!;
  const returning = validateReturning(options.returning, entity);
  const parameters: CocoQLParameter[] = [];
  let sql: string;
  if (plan.operation === "create") {
    const columns = plan.changes.map((change) => quoteIdentifier(columnFor(entity, change.field.field))).join(", ");
    const values = plan.changes.map((change) => bindAssignment(parameters, change.value, entity.fields[change.field.field]!.type)).join(", ");
    const conflict = compileConflict(options.conflict, plan, entity);
    sql = `INSERT INTO ${quoteIdentifier(entity.table)} (${columns}) VALUES (${values})${conflict}${returning};`;
  } else if (plan.operation === "update") {
    if (options.conflict) invalidSchema("ON CONFLICT is available only for create mutations.");
    const assignments = plan.changes.map((change) => `${quoteIdentifier(columnFor(entity, change.field.field))} = ${bindAssignment(parameters, change.value, entity.fields[change.field.field]!.type)}`);
    const predicate = plan.filters.map((filter) => compileFilter(filter, schema, parameters)).join("\n  AND ");
    sql = `UPDATE ${quoteIdentifier(entity.table)}\nSET ${assignments.join(",\n  ")}\nWHERE ${predicate}${returning};`;
  } else {
    if (options.conflict) invalidSchema("ON CONFLICT is available only for create mutations.");
    const predicate = plan.filters.map((filter) => compileFilter(filter, schema, parameters)).join("\n  AND ");
    sql = `DELETE FROM ${quoteIdentifier(entity.table)}\nWHERE ${predicate}${returning};`;
  }
  return Object.freeze({
    dialect: "postgres", operation: plan.operation, sql, parameters: Object.freeze(parameters),
    guard: Object.freeze({ maxAffectedRows: plan.confirmation.maxAffectedRows, verifyBeforeCommit: true as const }),
  });
}

function validateReturning(fields: readonly string[] | undefined, entity: CocoQLEntitySchema): string {
  if (fields === undefined) return "";
  if (!Array.isArray(fields)) invalidSchema("PostgreSQL RETURNING fields must be an array.");
  if (fields.length === 0) return "";
  if (!fields.every((field) => typeof field === "string") || new Set(fields).size !== fields.length) invalidSchema("PostgreSQL RETURNING fields must be unique canonical names.");
  const columns = fields.map((field) => {
    if (!Object.hasOwn(entity.fields, field)) invalidSchema(`PostgreSQL RETURNING references unknown field '${field}'.`);
    return quoteIdentifier(columnFor(entity, field));
  });
  return `\nRETURNING ${columns.join(", ")}`;
}

function compileConflict(conflict: CocoQLPostgresConflict | undefined, plan: CocoQLMutationPlan, entity: CocoQLEntitySchema): string {
  if (!conflict) return "";
  if (typeof conflict !== "object" || !Array.isArray(conflict.fields) || conflict.fields.length === 0 || !conflict.fields.every((field) => typeof field === "string") || new Set(conflict.fields).size !== conflict.fields.length) invalidSchema("PostgreSQL ON CONFLICT requires unique conflict fields.");
  const changed = new Set(plan.changes.map((change) => change.field.field));
  const target = conflict.fields.map((field) => {
    const schema = Object.hasOwn(entity.fields, field) ? entity.fields[field] : undefined;
    if (!schema) invalidSchema(`PostgreSQL ON CONFLICT references unknown field '${field}'.`);
    if (!schema.unique && schema.type !== "id") invalidSchema(`PostgreSQL ON CONFLICT field '${field}' must be declared unique or use the id type.`);
    if (!changed.has(field)) invalidSchema(`PostgreSQL ON CONFLICT field '${field}' must be assigned by the create mutation.`);
    return quoteIdentifier(columnFor(entity, field));
  }).join(", ");
  if (conflict.action === "nothing") {
    if (conflict.update?.length) invalidSchema("ON CONFLICT DO NOTHING cannot declare update fields.");
    return `\nON CONFLICT (${target}) DO NOTHING`;
  }
  if (conflict.action !== "update" || !Array.isArray(conflict.update) || conflict.update.length === 0 || !conflict.update.every((field) => typeof field === "string") || new Set(conflict.update).size !== conflict.update.length) invalidSchema("ON CONFLICT DO UPDATE requires unique update fields.");
  const updateFields = conflict.update;
  const assignments = updateFields.map((field) => {
    if (!Object.hasOwn(entity.fields, field)) invalidSchema(`PostgreSQL ON CONFLICT update references unknown field '${field}'.`);
    if (!changed.has(field)) invalidSchema(`PostgreSQL ON CONFLICT update field '${field}' must be assigned by the create mutation.`);
    const column = quoteIdentifier(columnFor(entity, field));
    return `${column} = EXCLUDED.${column}`;
  });
  return `\nON CONFLICT (${target}) DO UPDATE SET ${assignments.join(", ")}`;
}

function compileFilter(filter: CocoQLPlanFilter, schema: CocoQLSchema, parameters: CocoQLParameter[]): string {
  const entity = schema.entities[filter.field.entity]!;
  const field = quoteIdentifier(columnFor(entity, filter.field.field));
  const fieldSchema = entity.fields[filter.field.field]!;
  if (filter.value.kind === "date-range") {
    const type = entity.fields[filter.field.field]!.type;
    const start = formatDate(filter.value.start, type);
    const end = formatDate(filter.value.end, type);
    if (filter.operator === "in") return `(${field} >= ${bind(parameters, start)} AND ${field} < ${bind(parameters, end)})`;
    if (filter.operator === "not in") return `(${field} < ${bind(parameters, start)} OR ${field} >= ${bind(parameters, end)})`;
    return `${field} ${filter.operator === "before" ? "<" : ">="} ${bind(parameters, filter.operator === "before" ? start : end)}`;
  }
  if (filter.value.kind === "list") {
    if (filter.operator === "contains" || filter.operator === "contained_by" || filter.operator === "overlaps") {
      const operator = filter.operator === "contains" ? "@>" : filter.operator === "contained_by" ? "<@" : "&&";
      return `${field} ${operator} ${bind(parameters, Object.freeze([...filter.value.values]))}${arrayCast(fieldSchema.type)}`;
    }
    return `${field} ${filter.operator === "not in" ? "NOT IN" : "IN"} (${filter.value.values.map((value) => bind(parameters, value)).join(", ")})`;
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

function bind(parameters: CocoQLParameter[], value: CocoQLParameter): string { parameters.push(value); return `$${parameters.length}`; }
function bindAssignment(parameters: CocoQLParameter[], value: CocoQLParameter, type: string): string {
  const placeholder = bind(parameters, value);
  if (type === "json" || type === "jsonb") return `${placeholder}::${type}`;
  if (type === "number_array") return `${placeholder}::double precision[]`;
  if (type === "boolean_array") return `${placeholder}::boolean[]`;
  if (type === "uuid_array") return `${placeholder}::uuid[]`;
  if (type === "string_array") return `${placeholder}::text[]`;
  return placeholder;
}
function arrayCast(type: string): string {
  if (type === "number_array") return "::double precision[]";
  if (type === "boolean_array") return "::boolean[]";
  if (type === "uuid_array") return "::uuid[]";
  return "::text[]";
}
function formatDate(value: string, fieldType: string): string { return fieldType === "date" ? value.slice(0, 10) : value; }
function columnFor(entity: CocoQLEntitySchema, field: string): string { return entity.fields[field]!.column ?? field; }
function quoteIdentifier(identifier: string): string { return `"${identifier.replaceAll('"', '""')}"`; }
function invalidSchema(message: string): never { return cocoQLError({ error: "INVALID_SCHEMA", stage: "compiler", message }); }
