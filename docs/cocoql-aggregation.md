# CocoQL Aggregation 0.1

CocoQL expresses grouped reads inside the existing deterministic query shape.
Grouped fields use `group`; aggregate expressions live in `select` and require a
stable alias.

```cocoql
from orders

with customer

filter status = paid

group customer.name

select
  customer.name
  sum(total) as revenue
  count(id) as order_count

sort revenue desc

take 10
```

## Supported functions

```text
count(field)
sum(field)
avg(field)
min(field)
max(field)
```

Every expression uses `as <alias>`. Aliases are canonical lowercase identifiers,
must be unique, and can be referenced by `sort`.

## Validation rules

- Every ordinary selected field must appear in `group` when aggregates exist.
- A `group` clause without an aggregate is rejected.
- `sum` and `avg` accept only `number` or `money` fields.
- `min` and `max` reject boolean fields.
- `count` accepts every declared field type.
- Group fields and aggregate inputs can traverse relations only when their
  relation path is explicitly included with `with`.
- Selected grouped fields appear before aggregate expressions in canonical
  `select` output.

Failures use `INVALID_AGGREGATION`; unknown fields and missing relations retain
their existing structured error codes.

## Query Plan and SQL

The Query Plan stores `groupBy`, `aggregates`, and a discriminated order target.
Sorting therefore identifies either a schema field or an aggregate alias without
guessing. MySQL and PostgreSQL compilers emit function names from a closed enum,
quote the validated alias for their dialect, and derive every input column from
the schema.

Aggregate-only queries do not require `group`:

```cocoql
from orders

select
  avg(total) as average_total
```
