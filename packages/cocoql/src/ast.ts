/**
 * Identifies the stable cocoql version contract used by @cocoframe/cocoql.
 */
export const COCOQL_VERSION = "0.1" as const;

export type CocoQLScalar = string | number | boolean | null;
export type CocoQLParameter = CocoQLScalar | readonly CocoQLScalar[];
export type CocoQLNamedDate =
  | "today" | "yesterday"
  | "this_week" | "last_week"
  | "this_month" | "last_month"
  | "this_year" | "last_year";
export type CocoQLSemanticDateExpression =
  | { readonly kind: "named"; readonly value: CocoQLNamedDate }
  | { readonly kind: "relative"; readonly direction: "last" | "next"; readonly amount: number; readonly unit: "days" };
export type CocoQLValue =
  | { readonly kind: "scalar"; readonly value: CocoQLScalar }
  | { readonly kind: "list"; readonly values: readonly CocoQLScalar[] }
  | { readonly kind: "semantic-date"; readonly expression: CocoQLSemanticDateExpression };

export type CocoQLFilterOperator =
  | "=" | "!=" | ">" | ">=" | "<" | "<="
  | "in" | "not in"
  | "contains" | "starts_with" | "ends_with"
  | "ilike" | "not ilike" | "has_key" | "overlaps" | "contained_by" | "matches"
  | "before" | "after";

export interface CocoQLFilter {
  readonly field: string;
  readonly operator: CocoQLFilterOperator;
  readonly value: CocoQLValue;
}

export interface CocoQLSort {
  readonly field: string;
  readonly direction: "asc" | "desc";
}

export type CocoQLAggregateFunction = "count" | "sum" | "avg" | "min" | "max";

export interface CocoQLAggregate {
  readonly function: CocoQLAggregateFunction;
  readonly field: string;
  readonly alias: string;
}

export interface CocoQLQuery {
  readonly type: "Query";
  readonly version: typeof COCOQL_VERSION;
  readonly source: { readonly entity: string };
  readonly with: readonly string[];
  readonly filters: readonly CocoQLFilter[];
  readonly group: readonly string[];
  readonly select: readonly string[];
  readonly aggregates: readonly CocoQLAggregate[];
  readonly sort: readonly CocoQLSort[];
  readonly take?: number;
  readonly skip?: number;
}

export type CocoQLMutationOperation = "create" | "update" | "delete";

export interface CocoQLMutationAssignment {
  readonly field: string;
  readonly value: CocoQLParameter;
}

export interface CocoQLMutationConfirmation {
  readonly maxAffectedRows: number;
}

/** A parsed write intent. It is never executable until separately authorized and safety-checked. */
export interface CocoQLMutation {
  readonly type: "Mutation";
  readonly version: typeof COCOQL_VERSION;
  readonly operation: CocoQLMutationOperation;
  readonly entity: string;
  readonly preview: boolean;
  readonly filters: readonly CocoQLFilter[];
  readonly changes: readonly CocoQLMutationAssignment[];
  readonly confirmation?: CocoQLMutationConfirmation;
}
