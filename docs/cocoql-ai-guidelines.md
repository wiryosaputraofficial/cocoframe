# CocoQL 0.1 AI Guidelines

Use the read parser only for `from`, `with`, `filter`, `group`, `select`, `sort`,
`take`, and `skip`.

1. Inspect the available entity and fields before generating a query.
2. Start with exactly one `from` clause.
3. Add one `with <relation.path>` line for every relation traversal. Use schema
   relation names exactly; never substitute entity or table names.
4. Write one deterministic condition per `filter` line. Repeated filters mean
   `AND`; do not invent natural-language connectors.
5. Select explicit fields. Never generate `*`.
6. Use only schema field names and enum values.
7. Use bracketed lists for `in` and `not in`.
8. For date or datetime fields, prefer `today`, `yesterday`, `this_week`,
   `last_week`, `this_month`, `last_month`, `this_year`, `last_year`, or an
   explicit `last N days` / `next N days` range. Do not calculate timestamps.
9. Add `take` for bounded agent reads.
10. For aggregate queries, group every ordinary selected field and give every
    aggregate a unique alias: `sum(total) as revenue`. Sort aggregates only by
    that alias.
11. Generate a mutation only when the application explicitly selects mutation
    mode. Use `preview` first, never omit update/delete filters, and never choose
    an affected-row confirmation above the application's stated limit.
12. Never generate permission or safety policies. They are trusted application
    inputs.

When an error is returned, branch on `error`, inspect `stage`, then use
`location` and `path` to identify the failing clause. Prefer `suggestions`, or
choose from the relevant `availableEntities`, `availableFields`, or
`availableRelations` list. Correct only the failing clause and reparse the complete query.
Do not bypass `UNKNOWN_FIELD`, `UNKNOWN_ENTITY`, `UNKNOWN_RELATION`, or
`RELATION_NOT_INCLUDED` by guessing a SQL identifier.

Do not branch on `message`; it is explanatory prose. Do not submit Query Plan
JSON when the failure points to CocoQL source. A missing `location` with a
planner-stage error means the generated Query Plan itself must be discarded or
rebuilt from validated CocoQL.

For `PERMISSION_DENIED`, remove the denied field, relation, or aggregate only
when the remaining query still answers the request. Never ask for, generate,
modify, or broaden a permission policy. Policy selection belongs to the
authenticated application boundary, not the agent.

Canonicalize output with `formatCocoQL` before storing, logging, or comparing it.
Agents should generate CocoQL source, not Query Plan JSON or SQL. Applications
create the plan with `planCocoQL` after parsing and schema validation.

For writes, agents generate source for `parseCocoQLMutation`. Applications
authorize and safety-check it before preview or compilation. A preview is not
approval to execute, and a successful compile is not authorization or a
database transaction.
