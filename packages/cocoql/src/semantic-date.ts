import type { CocoQLNamedDate, CocoQLSemanticDateExpression } from "./ast.ts";
import { cocoQLError } from "./errors.ts";

export interface CocoQLDateRange {
  readonly start: string;
  readonly end: string;
  readonly timeZone: "UTC";
}

/**
 * Identifies the stable cocoql named dates contract used by @cocoframe/cocoql.
 */
export const COCOQL_NAMED_DATES: readonly CocoQLNamedDate[] = Object.freeze([
  "today", "yesterday",
  "this_week", "last_week",
  "this_month", "last_month",
  "this_year", "last_year",
]);

const NAMED_DATE_SET = new Set<string>(COCOQL_NAMED_DATES);
const DAY_MS = 86_400_000;

export function isCocoQLNamedDate(value: string): value is CocoQLNamedDate {
  return NAMED_DATE_SET.has(value);
}

/**
 * Resolves Coco QL Date Range into its deterministic public value.
 */
export function resolveCocoQLDateRange(expression: CocoQLSemanticDateExpression, now: Date): CocoQLDateRange {
  if (!Number.isFinite(now.getTime())) cocoQLError({ error: "INVALID_VALUE", stage: "planner", message: "CocoQL planning requires a valid 'now' date.", path: ["options", "now"] });
  const today = startOfUtcDay(now);
  let start: Date;
  let end: Date;

  if (expression.kind === "relative") {
    if (!Number.isSafeInteger(expression.amount) || expression.amount < 1 || expression.amount > 10_000) {
      cocoQLError({ error: "INVALID_VALUE", stage: "planner", message: "Relative date amount must be an integer between 1 and 10000." });
    }
    if (expression.direction === "last") {
      start = addUtcDays(today, -(expression.amount - 1));
      end = addUtcDays(today, 1);
    } else {
      start = today;
      end = addUtcDays(today, expression.amount);
    }
  } else if (expression.value === "today") {
    start = today;
    end = addUtcDays(today, 1);
  } else if (expression.value === "yesterday") {
    start = addUtcDays(today, -1);
    end = today;
  } else if (expression.value === "this_week" || expression.value === "last_week") {
    const thisWeek = addUtcDays(today, -((today.getUTCDay() + 6) % 7));
    start = expression.value === "this_week" ? thisWeek : addUtcDays(thisWeek, -7);
    end = expression.value === "this_week" ? addUtcDays(thisWeek, 7) : thisWeek;
  } else if (expression.value === "this_month" || expression.value === "last_month") {
    const thisMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    start = expression.value === "this_month" ? thisMonth : new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    end = expression.value === "this_month" ? new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)) : thisMonth;
  } else {
    const thisYear = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
    start = expression.value === "this_year" ? thisYear : new Date(Date.UTC(today.getUTCFullYear() - 1, 0, 1));
    end = expression.value === "this_year" ? new Date(Date.UTC(today.getUTCFullYear() + 1, 0, 1)) : thisYear;
  }

  return Object.freeze({ start: start.toISOString(), end: end.toISOString(), timeZone: "UTC" });
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, amount: number): Date {
  return new Date(date.getTime() + amount * DAY_MS);
}
