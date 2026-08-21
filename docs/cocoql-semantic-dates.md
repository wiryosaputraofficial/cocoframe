# CocoQL Semantic Dates 0.1

Semantic dates let an agent express calendar intent without calculating or
embedding timestamps.

```cocoql
from orders

filter created_at in this_month
filter due_date before today

select
  id
  total
```

## Supported expressions

Named ranges:

```text
today       yesterday
this_week   last_week
this_month  last_month
this_year   last_year
```

Relative calendar-day ranges:

```text
last 7 days
last 30 days
next 7 days
next 30 days
```

Version 0.1 uses UTC and half-open ranges: the start is included and the end is
excluded. Weeks begin on Monday. `last N days` includes today and the preceding
`N - 1` UTC calendar days. `next N days` begins today and spans `N` UTC calendar
days.

## Operators

- `in range` compiles to `field >= start AND field < end`.
- `not in range` compiles to `field < start OR field >= end`.
- `before range` compiles to `field < start`.
- `after range` compiles to `field >= end`.

Semantic dates are accepted only for schema fields typed `date` or `datetime`.
Other fields fail with `INVALID_VALUE`.

## Deterministic planning

The AST stores the semantic expression. The Query Planner resolves it into an
explicit UTC range. Tests, jobs, and replay systems can inject the planning
clock:

```ts
const plan = planCocoQL(query, schema, {
  now: new Date("2026-08-21T13:45:00.000Z"),
});

// The high-level shortcut accepts the same option.
const compiled = compileCocoQL(source, schema, { now });
```

MySQL and PostgreSQL compilers convert range boundaries into dialect-appropriate
`date` or `datetime` parameters. Timestamp values are never concatenated into SQL.
