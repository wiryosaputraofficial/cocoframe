# CocoQL Mutations 0.1

Mutations use a parser separate from read queries. Supported forms are:

```cocoql
create orders
  status = pending
  total = 125
confirm affected <= 1
```

```cocoql
from orders
filter status = pending
update
  status = paid
confirm affected <= 25
```

```cocoql
from orders
filter id = 7
delete
confirm affected <= 1
```

`compileCocoQLMutation` runs the guarded pipeline for MySQL;
`compileCocoQLMutationPostgres` runs the same pipeline for PostgreSQL. Values are
parameters and physical identifiers come only from the schema. Compilation is
not execution: the adapter must run a transaction, verify actual affected rows
do not exceed `guard.maxAffectedRows`, and roll back otherwise.

CocoQL 0.1 does not write through relations and does not support arbitrary SQL expressions in assignments. Authentication, ownership, and tenant authorization remain application responsibilities.
