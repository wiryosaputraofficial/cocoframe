import type { CocoQLAggregate, CocoQLFilter, CocoQLMutation, CocoQLQuery, CocoQLScalar, CocoQLValue } from "./ast.ts";
import { parseCocoQLMutation } from "./mutation-parser.ts";
import { parseCocoQL } from "./parser.ts";

/**
 * Formats Coco QL into deterministic canonical text.
 */
export function formatCocoQL(source: string): string { return formatCocoQLAst(parseCocoQL(source)); }
/**
 * Formats Coco QL Mutation into deterministic canonical text.
 */
export function formatCocoQLMutation(source: string): string { return formatCocoQLMutationAst(parseCocoQLMutation(source)); }

/**
 * Formats Coco QL Mutation Ast into deterministic canonical text.
 */
export function formatCocoQLMutationAst(mutation: CocoQLMutation): string {
  const blocks: string[] = mutation.preview ? ["preview"] : [];
  if (mutation.operation === "create") blocks.push(`create ${mutation.entity}`);
  else {
    blocks.push(`from ${mutation.entity}`);
    for (const filter of mutation.filters) blocks.push(formatFilter(filter));
    blocks.push(mutation.operation);
  }
  if (mutation.operation !== "delete") blocks.push(mutation.changes.map((change) => `  ${change.field} = ${formatScalar(change.value)}`).join("\n"));
  if (mutation.confirmation) blocks.push(`confirm affected <= ${mutation.confirmation.maxAffectedRows}`);
  return `${blocks.join("\n\n")}\n`;
}

/**
 * Formats Coco QL Ast into deterministic canonical text.
 */
export function formatCocoQLAst(query: CocoQLQuery): string {
  const blocks = [`from ${query.source.entity}`];
  for (const relation of query.with) blocks.push(`with ${relation}`);
  for (const filter of query.filters) blocks.push(formatFilter(filter));
  for (const field of query.group) blocks.push(`group ${field}`);
  blocks.push(`select\n${[...query.select.map((field) => `  ${field}`), ...query.aggregates.map((aggregate) => `  ${formatAggregate(aggregate)}`)].join("\n")}`);
  for (const item of query.sort) blocks.push(`sort ${item.field} ${item.direction}`);
  if (query.take !== undefined) blocks.push(`take ${query.take}`);
  if (query.skip !== undefined) blocks.push(`skip ${query.skip}`);
  return `${blocks.join("\n\n")}\n`;
}

function formatFilter(filter: CocoQLFilter): string { return `filter ${filter.field} ${filter.operator} ${formatValue(filter.value)}`; }
function formatAggregate(aggregate: CocoQLAggregate): string { return `${aggregate.function}(${aggregate.field}) as ${aggregate.alias}`; }
function formatValue(value: CocoQLValue): string {
  if (value.kind === "list") return `[${value.values.map(formatScalar).join(", ")}]`;
  if (value.kind === "semantic-date") return value.expression.kind === "named"
    ? value.expression.value
    : `${value.expression.direction} ${value.expression.amount} days`;
  return formatScalar(value.value);
}
function formatScalar(value: CocoQLScalar): string {
  if (value === null) return "null";
  if (typeof value !== "string") return String(value);
  if (/^[a-z_][a-z0-9_]*$/.test(value)) return value;
  return JSON.stringify(value);
}
