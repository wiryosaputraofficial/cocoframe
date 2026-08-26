import { COCOQL_VERSION, type CocoQLFilter, type CocoQLFilterOperator, type CocoQLMutation, type CocoQLMutationAssignment, type CocoQLMutationOperation, type CocoQLParameter, type CocoQLScalar, type CocoQLValue } from "./ast.ts";
import { cocoQLError, type CocoQLSourceLocation } from "./errors.ts";
import { lexCocoQL, type CocoQLToken, type CocoQLTokenKind } from "./lexer.ts";
import { registerCocoQLMutationSourceMap } from "./mutation-source-map.ts";
import { isCocoQLNamedDate } from "./semantic-date.ts";

const FILTER_WORD_OPERATORS = new Set<CocoQLFilterOperator>(["in", "contains", "starts_with", "ends_with", "before", "after", "ilike", "has_key", "overlaps", "contained_by", "matches"]);

/** Parses the intentionally small CocoQL 0.1 mutation grammar. */
export function parseCocoQLMutation(source: string): CocoQLMutation {
  const cursor = new Cursor(lexCocoQL(source));
  const filters: CocoQLFilter[] = [];
  const changes: CocoQLMutationAssignment[] = [];
  const filterLocations: CocoQLSourceLocation[] = [];
  const changeLocations: CocoQLSourceLocation[] = [];
  let preview = false;
  let previewLocation: CocoQLSourceLocation | undefined;
  let entity: string | undefined;
  let entityLocation: CocoQLSourceLocation | undefined;
  let operation: CocoQLMutationOperation | undefined;
  let operationLocation: CocoQLSourceLocation | undefined;
  let confirmation: number | undefined;
  let confirmationLocation: CocoQLSourceLocation | undefined;

  cursor.skipNewlines();
  if (cursor.word("preview")) {
    const token = cursor.take();
    preview = true;
    previewLocation = location(token);
    cursor.expectLineEnd();
    cursor.skipNewlines();
  }

  const first = cursor.expect("word", "Expected 'create <entity>' or 'from <entity>'.");
  if (first.value === "create") {
    operation = "create";
    operationLocation = location(first);
    const token = cursor.expect("word", "Expected an entity after 'create'.");
    entity = token.value;
    entityLocation = location(token);
    cursor.expectLineEnd();
    cursor.skipNewlines();
    parseAssignments(cursor, changes, changeLocations, ["confirm"]);
  } else if (first.value === "from") {
    const token = cursor.expect("word", "Expected an entity after 'from'.");
    entity = token.value;
    entityLocation = location(token);
    cursor.expectLineEnd();
    cursor.skipNewlines();
    while (cursor.word("filter")) {
      cursor.take();
      const field = cursor.fieldReference();
      const operator = parseOperator(cursor);
      const value = parseValue(cursor, operator);
      filters.push({ field: field.value, operator, value });
      filterLocations.push(field.location);
      cursor.expectLineEnd();
      cursor.skipNewlines();
    }
    const command = cursor.expect("word", "Expected 'update' or 'delete' after mutation filters.");
    if (command.value !== "update" && command.value !== "delete") cursor.fail("Expected 'update' or 'delete' after mutation filters.", command);
    operation = command.value as "update" | "delete";
    operationLocation = location(command);
    cursor.expectLineEnd();
    cursor.skipNewlines();
    if (operation === "update") parseAssignments(cursor, changes, changeLocations, ["confirm"]);
  } else cursor.fail("A mutation must start with 'create <entity>' or 'from <entity>'.", first);

  cursor.skipNewlines();
  if (cursor.word("confirm")) {
    const token = cursor.take();
    confirmationLocation = location(token);
    const affected = cursor.expect("word", "Expected 'affected <= <limit>'.");
    if (affected.value !== "affected") cursor.fail("Expected 'affected <= <limit>'.", affected);
    const operator = cursor.expect("operator", "Expected '<=' after 'affected'.");
    if (operator.value !== "<=") cursor.fail("Confirmation must use 'affected <= <limit>'.", operator);
    const maximum = cursor.expect("number", "Expected a positive affected-row limit.");
    confirmation = Number(maximum.value);
    if (!Number.isSafeInteger(confirmation) || confirmation < 1) invalidValue("Affected-row confirmation must be a positive safe integer.", maximum);
    cursor.expectLineEnd();
    cursor.skipNewlines();
  }
  if (!cursor.at("eof")) cursor.fail("Unexpected clause after the mutation.");
  if (!entity || !entityLocation || !operation || !operationLocation) return cursor.fail("Mutation is incomplete.");
  const finalEntity = entity;
  const finalEntityLocation = entityLocation;
  const finalOperation = operation;
  const finalOperationLocation = operationLocation;
  if ((finalOperation === "create" || finalOperation === "update") && changes.length === 0) cocoQLError({ error: "INVALID_MUTATION", stage: "parser", operation: finalOperation, message: `${finalOperation} requires at least one field assignment.`, path: ["changes"] });

  const mutation: CocoQLMutation = {
    type: "Mutation", version: COCOQL_VERSION, operation: finalOperation, entity: finalEntity, preview,
    filters, changes,
    ...(confirmation === undefined ? {} : { confirmation: { maxAffectedRows: confirmation } }),
  };
  registerCocoQLMutationSourceMap(mutation, {
    entity: finalEntityLocation, operation: finalOperationLocation,
    ...(previewLocation ? { preview: previewLocation } : {}),
    filters: filterLocations, changes: changeLocations,
    ...(confirmationLocation ? { confirmation: confirmationLocation } : {}),
  });
  return mutation;
}

function parseAssignments(cursor: Cursor, changes: CocoQLMutationAssignment[], locations: CocoQLSourceLocation[], stop: readonly string[]): void {
  while (!cursor.at("eof") && !(cursor.at("word") && stop.includes(cursor.peek().value))) {
    const field = cursor.fieldReference();
    const operator = cursor.expect("operator", "Assignments require '='.");
    if (operator.value !== "=") cursor.fail("Assignments require '='.", operator);
    changes.push({ field: field.value, value: parseParameter(cursor) });
    locations.push(field.location);
    cursor.expectLineEnd();
    cursor.skipNewlines();
  }
}

function parseOperator(cursor: Cursor): CocoQLFilterOperator {
  if (cursor.at("operator")) return cursor.take().value as CocoQLFilterOperator;
  const token = cursor.expect("word", "Expected a filter operator.");
  if (token.value === "not") {
    const next = cursor.expect("word", "Expected 'in' or 'ilike' after 'not'.");
    if (next.value === "in") return "not in";
    if (next.value === "ilike") return "not ilike";
    cursor.fail("Only 'not in' and 'not ilike' are valid compound operators.", next);
  }
  if (FILTER_WORD_OPERATORS.has(token.value as CocoQLFilterOperator)) return token.value as CocoQLFilterOperator;
  return cursor.fail(`Unknown filter operator '${token.value}'.`, token);
}

function parseValue(cursor: Cursor, operator: CocoQLFilterOperator): CocoQLValue {
  if ((operator === "in" || operator === "not in" || operator === "before" || operator === "after") && cursor.at("word")) {
    const token = cursor.peek();
    if (isCocoQLNamedDate(token.value)) { cursor.take(); return { kind: "semantic-date", expression: { kind: "named", value: token.value } }; }
    if (token.value === "last" || token.value === "next") {
      cursor.take();
      const amountToken = cursor.expect("number", "Expected a positive day count.");
      const amount = Number(amountToken.value);
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > 10_000) invalidValue("Relative date amount must be between 1 and 10000.", amountToken);
      const unit = cursor.expect("word", "Expected 'day' or 'days'.");
      if (unit.value !== "day" && unit.value !== "days") cursor.fail("Only day-based relative dates are supported.", unit);
      return { kind: "semantic-date", expression: { kind: "relative", direction: token.value, amount, unit: "days" } };
    }
  }
  if (operator === "in" || operator === "not in" || ((operator === "contains" || operator === "contained_by" || operator === "overlaps") && cursor.at("left-bracket"))) {
    cursor.expect("left-bracket", `Operator '${operator}' requires a list.`);
    const values: CocoQLScalar[] = [];
    while (!cursor.at("right-bracket")) { values.push(parseScalar(cursor)); if (!cursor.at("comma")) break; cursor.take(); }
    cursor.expect("right-bracket", "Expected ']'.");
    if (values.length === 0) cursor.fail("Filter lists cannot be empty.");
    return { kind: "list", values };
  }
  return { kind: "scalar", value: parseScalar(cursor) };
}

function parseParameter(cursor: Cursor): CocoQLParameter {
  if (!cursor.at("left-bracket")) return parseScalar(cursor);
  cursor.take();
  const values: CocoQLScalar[] = [];
  while (!cursor.at("right-bracket")) {
    values.push(parseScalar(cursor));
    if (!cursor.at("comma")) break;
    cursor.take();
  }
  cursor.expect("right-bracket", "Expected ']' after the assignment list.");
  if (values.length === 0) return cursor.fail("Assignment lists cannot be empty.");
  return Object.freeze(values);
}

function parseScalar(cursor: Cursor): CocoQLScalar {
  const token = cursor.take();
  if (token.kind === "string") return token.value;
  if (token.kind === "number") return Number(token.value);
  if (token.kind === "word") {
    if (token.value === "true") return true;
    if (token.value === "false") return false;
    if (token.value === "null") return null;
    return token.value;
  }
  return cursor.fail("Expected a scalar value.", token);
}

class Cursor {
  #index = 0;
  readonly tokens: readonly CocoQLToken[];
  constructor(tokens: readonly CocoQLToken[]) { this.tokens = tokens; }
  peek(): CocoQLToken { return this.tokens[this.#index] ?? this.tokens.at(-1)!; }
  at(kind: CocoQLTokenKind): boolean { return this.peek().kind === kind; }
  word(value: string): boolean { return this.at("word") && this.peek().value === value; }
  take(): CocoQLToken { const token = this.peek(); if (token.kind !== "eof") this.#index++; return token; }
  expect(kind: CocoQLTokenKind, message: string): CocoQLToken { const token = this.take(); if (token.kind !== kind) this.fail(message, token); return token; }
  skipNewlines(): void { while (this.at("newline")) this.take(); }
  expectLineEnd(): void { if (!this.at("newline") && !this.at("eof")) this.fail("Expected the clause to end on this line."); }
  fieldReference(): { readonly value: string; readonly location: CocoQLSourceLocation } {
    const first = this.expect("word", "Expected a field name.");
    let last = first;
    const parts = [first.value];
    while (this.at("dot")) { this.take(); last = this.expect("word", "Expected a field after '.'."); parts.push(last.value); }
    return { value: parts.join("."), location: span(first, last) };
  }
  fail(message: string, token = this.peek()): never { return cocoQLError({ error: "SYNTAX_ERROR", stage: "parser", message, location: location(token) }); }
}

function invalidValue(message: string, token: CocoQLToken): never { return cocoQLError({ error: "INVALID_VALUE", stage: "parser", message, location: location(token) }); }
function location(token: CocoQLToken): CocoQLSourceLocation { return { line: token.line, column: token.column, endLine: token.line, endColumn: token.column + token.value.length }; }
function span(first: CocoQLToken, last: CocoQLToken): CocoQLSourceLocation { return { line: first.line, column: first.column, endLine: last.line, endColumn: last.column + last.value.length }; }
