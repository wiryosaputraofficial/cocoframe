import { COCOQL_VERSION, type CocoQLAggregate, type CocoQLAggregateFunction, type CocoQLFilter, type CocoQLFilterOperator, type CocoQLQuery, type CocoQLScalar, type CocoQLSort, type CocoQLValue } from "./ast.ts";
import { cocoQLError, type CocoQLSourceLocation } from "./errors.ts";
import { lexCocoQL, type CocoQLToken, type CocoQLTokenKind } from "./lexer.ts";
import { isCocoQLNamedDate } from "./semantic-date.ts";
import { registerCocoQLSourceMap } from "./source-map.ts";

const READ_COMMANDS = new Set(["from", "with", "filter", "group", "select", "sort", "take", "skip"]);
const COMMAND_ORDER: Readonly<Record<string, number>> = { from: 0, with: 1, filter: 2, group: 3, select: 4, sort: 5, take: 6, skip: 7 };
const MUTATION_COMMANDS = new Set(["create", "update", "delete", "preview", "confirm"]);
const FILTER_WORD_OPERATORS = new Set<CocoQLFilterOperator>(["in", "contains", "starts_with", "ends_with", "before", "after"]);
const AGGREGATE_FUNCTIONS = new Set<CocoQLAggregateFunction>(["count", "sum", "avg", "min", "max"]);

/**
 * Parses Coco QL into its typed public representation.
 */
export function parseCocoQL(source: string): CocoQLQuery {
  const cursor = new TokenCursor(lexCocoQL(source));
  let entity: string | undefined;
  const relations: string[] = [];
  const filters: CocoQLFilter[] = [];
  const group: string[] = [];
  const select: string[] = [];
  const aggregates: CocoQLAggregate[] = [];
  const sort: CocoQLSort[] = [];
  const relationLocations: CocoQLSourceLocation[] = [];
  const filterLocations: CocoQLSourceLocation[] = [];
  const groupLocations: CocoQLSourceLocation[] = [];
  const selectLocations: CocoQLSourceLocation[] = [];
  const aggregateLocations: CocoQLSourceLocation[] = [];
  const sortLocations: CocoQLSourceLocation[] = [];
  let entityLocation: CocoQLSourceLocation | undefined;
  let takeLocation: CocoQLSourceLocation | undefined;
  let skipLocation: CocoQLSourceLocation | undefined;
  let sawSelect = false;
  let take: number | undefined;
  let skip: number | undefined;
  let lastCommandOrder = -1;

  cursor.skipNewlines();
  while (!cursor.at("eof")) {
    const command = cursor.expect("word", "Expected a CocoQL command.");
    if (MUTATION_COMMANDS.has(command.value)) {
      cocoQLError({ error: "UNSAFE_MUTATION", stage: "parser", message: `Command '${command.value}' is not available in CocoQL 0.1 read mode.`, location: tokenLocation(command), path: [command.value] });
    }
    if (!READ_COMMANDS.has(command.value)) {
      cocoQLError({ error: "UNSUPPORTED_COMMAND", stage: "parser", message: `Command '${command.value}' is not supported by CocoQL 0.1.`, location: tokenLocation(command), path: [command.value], suggestions: [...READ_COMMANDS] });
    }
    const commandOrder = COMMAND_ORDER[command.value]!;
    if (commandOrder < lastCommandOrder) cursor.fail(`Clause '${command.value}' is out of order in canonical CocoQL.`, command);
    if (command.value !== "from" && !entity) cursor.fail("A CocoQL read query must start with 'from <entity>'.", command);
    lastCommandOrder = commandOrder;

    if (command.value === "from") {
      if (entity) cursor.fail("A query may contain only one 'from' clause.", command);
      const entityToken = cursor.expect("word", "Expected an entity after 'from'.");
      entity = entityToken.value;
      entityLocation = tokenLocation(entityToken);
      cursor.expectLineEnd();
    } else if (command.value === "with") {
      const relation = cursor.fieldReference();
      if (relations.includes(relation.value)) cursor.fail(`Relation '${relation.value}' may be included only once.`, command);
      relations.push(relation.value);
      relationLocations.push(relation.location);
      cursor.expectLineEnd();
    } else if (command.value === "filter") {
      const field = cursor.fieldReference();
      const operator = parseOperator(cursor);
      const value = parseValue(cursor, operator);
      filters.push({ field: field.value, operator, value });
      filterLocations.push(field.location);
      cursor.expectLineEnd();
    } else if (command.value === "group") {
      const field = cursor.fieldReference();
      if (group.includes(field.value)) cursor.fail(`Group field '${field.value}' may appear only once.`, command);
      group.push(field.value);
      groupLocations.push(field.location);
      cursor.expectLineEnd();
    } else if (command.value === "select") {
      if (sawSelect) cursor.fail("A query may contain only one 'select' clause.", command);
      sawSelect = true;
      parseSelectBlock(cursor, select, aggregates, selectLocations, aggregateLocations);
    } else if (command.value === "sort") {
      const field = cursor.fieldReference();
      const direction = cursor.expect("word", "Expected 'asc' or 'desc' after the sort field.");
      if (direction.value !== "asc" && direction.value !== "desc") cursor.fail("Sort direction must be 'asc' or 'desc'.", direction);
      sort.push({ field: field.value, direction: direction.value as "asc" | "desc" });
      sortLocations.push(field.location);
      cursor.expectLineEnd();
    } else if (command.value === "take" || command.value === "skip") {
      const token = cursor.expect("number", `Expected a non-negative integer after '${command.value}'.`);
      const value = Number(token.value);
      if (!Number.isSafeInteger(value) || value < 0) cocoQLError({ error: "INVALID_LIMIT", stage: "parser", message: `${command.value} must be a non-negative safe integer.`, location: tokenLocation(token), path: [command.value] });
      if (command.value === "take") {
        if (take !== undefined) cursor.fail("A query may contain only one 'take' clause.", command);
        take = value;
        takeLocation = tokenLocation(token);
      } else {
        if (skip !== undefined) cursor.fail("A query may contain only one 'skip' clause.", command);
        skip = value;
        skipLocation = tokenLocation(token);
      }
      cursor.expectLineEnd();
    }
    cursor.skipNewlines();
  }

  if (!entity || !entityLocation) cocoQLError({ error: "SYNTAX_ERROR", stage: "parser", message: "A CocoQL read query must start with 'from <entity>'.", location: { line: 1, column: 1, endLine: 1, endColumn: 1 }, path: ["source", "entity"], suggestions: ["from users"] });
  if (select.length === 0 && aggregates.length === 0) cocoQLError({ error: "SYNTAX_ERROR", stage: "parser", message: "A CocoQL read query requires at least one field or aggregate in 'select'.", path: ["select"], suggestions: ["select\n  id"] });
  const query: CocoQLQuery = {
    type: "Query",
    version: COCOQL_VERSION,
    source: { entity },
    with: relations,
    filters,
    group,
    select,
    aggregates,
    sort,
    ...(take !== undefined ? { take } : {}),
    ...(skip !== undefined ? { skip } : {}),
  };
  registerCocoQLSourceMap(query, {
    entity: entityLocation,
    relations: relationLocations,
    filters: filterLocations,
    group: groupLocations,
    select: selectLocations,
    aggregates: aggregateLocations,
    sort: sortLocations,
    ...(takeLocation ? { take: takeLocation } : {}),
    ...(skipLocation ? { skip: skipLocation } : {}),
  });
  return query;
}

function parseSelectBlock(cursor: TokenCursor, fields: string[], aggregates: CocoQLAggregate[], fieldLocations: CocoQLSourceLocation[], aggregateLocations: CocoQLSourceLocation[]): void {
  let sawAggregate = false;
  cursor.skipNewlines();
  while (!cursor.at("eof")) {
    if (cursor.at("word") && READ_COMMANDS.has(cursor.peek().value)) break;
    if (cursor.at("word") && AGGREGATE_FUNCTIONS.has(cursor.peek().value as CocoQLAggregateFunction)) {
      sawAggregate = true;
      const aggregate = parseAggregate(cursor);
      aggregates.push(aggregate.value);
      aggregateLocations.push(aggregate.location);
    } else {
      if (sawAggregate) cursor.fail("Grouped fields must appear before aggregate expressions in 'select'.");
      const field = cursor.fieldReference();
      fields.push(field.value);
      fieldLocations.push(field.location);
    }
    if (cursor.at("comma")) cursor.take();
    else if (!cursor.at("newline") && !cursor.at("eof")) cursor.fail("Separate selected fields with a newline or comma.");
    cursor.skipNewlines();
  }
}

function parseAggregate(cursor: TokenCursor): { readonly value: CocoQLAggregate; readonly location: CocoQLSourceLocation } {
  const functionToken = cursor.take();
  cursor.expect("left-paren", `Expected '(' after '${functionToken.value}'.`);
  const field = cursor.fieldReference();
  cursor.expect("right-paren", `Expected ')' after the '${functionToken.value}' field.`);
  const asToken = cursor.expect("word", "Aggregate expressions require 'as <alias>'.");
  if (asToken.value !== "as") cursor.fail("Aggregate expressions require 'as <alias>'.", asToken);
  const alias = cursor.expect("word", "Expected an alias after 'as'.");
  return {
    value: { function: functionToken.value as CocoQLAggregateFunction, field: field.value, alias: alias.value },
    location: spanLocation(functionToken, alias),
  };
}

function parseOperator(cursor: TokenCursor): CocoQLFilterOperator {
  if (cursor.at("operator")) return cursor.take().value as CocoQLFilterOperator;
  const token = cursor.expect("word", "Expected a filter operator.");
  if (token.value === "not") {
    const next = cursor.expect("word", "Expected 'in' after 'not'.");
    if (next.value === "in") return "not in";
    cursor.fail("Only 'not in' is a valid compound filter operator.", next);
  }
  if (FILTER_WORD_OPERATORS.has(token.value as CocoQLFilterOperator)) return token.value as CocoQLFilterOperator;
  cursor.fail(`Unknown filter operator '${token.value}'.`, token);
}

function parseValue(cursor: TokenCursor, operator: CocoQLFilterOperator): CocoQLValue {
  if (operator === "in" || operator === "not in" || operator === "before" || operator === "after") {
    const semanticDate = parseSemanticDate(cursor);
    if (semanticDate) return semanticDate;
  }
  if (operator === "in" || operator === "not in") {
    cursor.expect("left-bracket", `Operator '${operator}' requires a bracketed list.`);
    const values: CocoQLScalar[] = [];
    while (!cursor.at("right-bracket")) {
      values.push(parseScalar(cursor));
      if (!cursor.at("comma")) break;
      cursor.take();
    }
    cursor.expect("right-bracket", "Expected ']' after the filter list.");
    if (values.length === 0) cursor.fail("Filter lists cannot be empty.");
    return { kind: "list", values };
  }
  return { kind: "scalar", value: parseScalar(cursor) };
}

function parseSemanticDate(cursor: TokenCursor): CocoQLValue | undefined {
  if (!cursor.at("word")) return undefined;
  const first = cursor.peek();
  if (isCocoQLNamedDate(first.value)) {
    cursor.take();
    return { kind: "semantic-date", expression: { kind: "named", value: first.value } };
  }
  if (first.value !== "last" && first.value !== "next") return undefined;
  cursor.take();
  const amountToken = cursor.expect("number", `Expected a positive day count after '${first.value}'.`);
  const amount = Number(amountToken.value);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 10_000) {
    cocoQLError({ error: "INVALID_VALUE", stage: "parser", message: "Relative date amount must be an integer between 1 and 10000.", location: tokenLocation(amountToken) });
  }
  const unit = cursor.expect("word", "Expected 'day' or 'days' after the relative date amount.");
  if (unit.value !== "day" && unit.value !== "days") cursor.fail("CocoQL 0.1 relative dates support only 'day' or 'days'.", unit);
  return { kind: "semantic-date", expression: { kind: "relative", direction: first.value as "last" | "next", amount, unit: "days" } };
}

function parseScalar(cursor: TokenCursor): CocoQLScalar {
  const token = cursor.take();
  if (token.kind === "string") return token.value;
  if (token.kind === "number") return Number(token.value);
  if (token.kind === "word") {
    if (token.value === "true") return true;
    if (token.value === "false") return false;
    if (token.value === "null") return null;
    return token.value;
  }
  cursor.fail("Expected a string, number, boolean, null, or canonical bare value.", token);
}

class TokenCursor {
  readonly #tokens: readonly CocoQLToken[];
  #index = 0;
  constructor(tokens: readonly CocoQLToken[]) { this.#tokens = tokens; }
  peek(): CocoQLToken { return this.#tokens[this.#index] ?? this.#tokens[this.#tokens.length - 1]!; }
  at(kind: CocoQLTokenKind): boolean { return this.peek().kind === kind; }
  take(): CocoQLToken { const token = this.peek(); if (token.kind !== "eof") this.#index++; return token; }
  expect(kind: CocoQLTokenKind, message: string): CocoQLToken { const token = this.take(); if (token.kind !== kind) this.fail(message, token); return token; }
  skipNewlines(): void { while (this.at("newline")) this.take(); }
  expectLineEnd(): void { if (!this.at("newline") && !this.at("eof")) this.fail("Expected the clause to end on this line."); }
  fieldReference(): { readonly value: string; readonly location: CocoQLSourceLocation } {
    const first = this.expect("word", "Expected a field name.");
    let last = first;
    const segments = [first.value];
    while (this.at("dot")) { this.take(); last = this.expect("word", "Expected a field name after '.'."); segments.push(last.value); }
    return { value: segments.join("."), location: spanLocation(first, last) };
  }
  fail(message: string, token = this.peek()): never { return cocoQLError({ error: "SYNTAX_ERROR", stage: "parser", message, location: tokenLocation(token) }); }
}

function tokenLocation(token: CocoQLToken): CocoQLSourceLocation {
  return { line: token.line, column: token.column, endLine: token.line, endColumn: token.column + token.value.length };
}

function spanLocation(first: CocoQLToken, last: CocoQLToken): CocoQLSourceLocation {
  return { line: first.line, column: first.column, endLine: last.line, endColumn: last.column + last.value.length };
}
