import type { CocoQLScalar } from "../ast.ts";
import { cocoQLError } from "../errors.ts";
import { validateCocoQLMutationPlan, type CocoQLMutationPlan } from "../mutation.ts";
import type { CocoQLPlanFilter } from "../plan.ts";
import type { CocoQLEntitySchema, CocoQLSchema } from "../schema.ts";

export interface CompiledCocoQLMutation {
  readonly dialect: "mysql";
  readonly operation: "create" | "update" | "delete";
  readonly sql: string;
  readonly parameters: readonly CocoQLScalar[];
  readonly guard: {
    readonly maxAffectedRows: number;
    readonly verifyBeforeCommit: true;
  };
}

/** Compiles a previously authorized and safety-checked plan. It never executes SQL. */
export function compileCocoQLMutationToMySql(plan: CocoQLMutationPlan, schema: CocoQLSchema): CompiledCocoQLMutation {
  validateCocoQLMutationPlan(plan, schema);
  if (plan.preview) cocoQLError({ error: "PREVIEW_REQUIRED", stage: "compiler", operation: plan.operation, message: "Preview plans cannot be compiled into write SQL.", path: ["preview"] });
  if (!plan.confirmation) cocoQLError({ error: "SAFETY_VIOLATION", stage: "compiler", operation: plan.operation, rule: "mutation.requireConfirmation", message: "Write SQL requires an affected-row confirmation.", path: ["confirmation"] });
  const entity = schema.entities[plan.rootEntity]!;
  const parameters: CocoQLScalar[] = [];
  let sql: string;
  if (plan.operation === "create") {
    const columns = plan.changes.map((change) => quoteIdentifier(columnFor(entity, change.field.field))).join(", ");
    parameters.push(...plan.changes.map((change) => change.value));
    sql = `INSERT INTO ${quoteIdentifier(entity.table)} (${columns}) VALUES (${plan.changes.map(() => "?").join(", ")});`;
  } else {
    if (plan.operation === "update") {
      const assignments = plan.changes.map((change) => {
        parameters.push(change.value);
        return `${quoteIdentifier(columnFor(entity, change.field.field))} = ?`;
      });
      const filterParameters: CocoQLScalar[] = [];
      const predicate = plan.filters.map((filter) => compileFilter(filter, schema, filterParameters)).join("\n  AND ");
      parameters.push(...filterParameters);
      sql = `UPDATE ${quoteIdentifier(entity.table)}\nSET ${assignments.join(",\n  ")}\nWHERE ${predicate};`;
    } else {
      const where = plan.filters.map((filter) => compileFilter(filter, schema, parameters)).join("\n  AND ");
      sql = `DELETE FROM ${quoteIdentifier(entity.table)}\nWHERE ${where};`;
    }
  }
  return Object.freeze({
    dialect: "mysql", operation: plan.operation, sql, parameters: Object.freeze(parameters),
    guard: Object.freeze({ maxAffectedRows: plan.confirmation.maxAffectedRows, verifyBeforeCommit: true as const }),
  });
}

function compileFilter(filter: CocoQLPlanFilter, schema: CocoQLSchema, parameters: CocoQLScalar[]): string {
  const entity = schema.entities[filter.field.entity]!;
  const field = quoteIdentifier(columnFor(entity, filter.field.field));
  if (filter.value.kind === "date-range") {
    const type = entity.fields[filter.field.field]!.type;
    const start = formatDate(filter.value.start, type);
    const end = formatDate(filter.value.end, type);
    if (filter.operator === "in") { parameters.push(start, end); return `(${field} >= ? AND ${field} < ?)`; }
    if (filter.operator === "not in") { parameters.push(start, end); return `(${field} < ? OR ${field} >= ?)`; }
    parameters.push(filter.operator === "before" ? start : end);
    return `${field} ${filter.operator === "before" ? "<" : ">="} ?`;
  }
  if (filter.value.kind === "list") {
    parameters.push(...filter.value.values);
    return `${field} ${filter.operator === "not in" ? "NOT IN" : "IN"} (${filter.value.values.map(() => "?").join(", ")})`;
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
  parameters.push(value);
  return `${field} ${operator} ?`;
}

function formatDate(value: string, fieldType: string): string { return fieldType === "date" ? value.slice(0, 10) : value.slice(0, 23).replace("T", " "); }
function columnFor(entity: CocoQLEntitySchema, field: string): string { return entity.fields[field]!.column ?? field; }
function quoteIdentifier(identifier: string): string { return `\`${identifier.replaceAll("`", "``")}\``; }
