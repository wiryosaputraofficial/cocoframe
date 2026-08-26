import { definePage } from "@cocoframe/core";
import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";
import CalendarIcon from "@cocoframe/icons/linear/calendar";
import CodeSquareIcon from "@cocoframe/icons/linear/code-square";
import DatabaseIcon from "@cocoframe/icons/linear/database";
import GraphUpIcon from "@cocoframe/icons/linear/graph-up";
import ShieldCheckIcon from "@cocoframe/icons/linear/shield-check";
import StarsMinimalisticIcon from "@cocoframe/icons/linear/stars-minimalistic";
import { SyntaxHighlighter } from "@cocoframe/ui";
import { CocoQLCookbook } from "../components/cocoql-cookbook.tsx";

const query = `from orders

with customer

filter created_at in this_month
filter status = paid
filter total >= 100

select
  id
  customer.name
  total

sort created_at desc

take 20`;

const sql = `SELECT
  \`t0\`.\`id\`,
  \`t1\`.\`name\` AS \`customer.name\`,
  \`t0\`.\`total\`
FROM \`orders\` AS \`t0\`
LEFT JOIN \`customers\` AS \`t1\` ON \`t0\`.\`customer_id\` = \`t1\`.\`id\`
WHERE (\`t0\`.\`created_at\` >= ? AND \`t0\`.\`created_at\` < ?)
  AND \`t0\`.\`status\` = ?
  AND \`t0\`.\`total\` >= ?
ORDER BY \`t0\`.\`created_at\` DESC
LIMIT ?;

parameters: ["2026-08-01 00:00:00.000", "2026-09-01 00:00:00.000", "paid", 100, 20]`;

const schema = `const commerce = defineCocoQLSchema({
  version: "0.1",
  entities: {
    orders: {
      table: "orders",
      fields: {
        id: { type: "id" },
        customer_id: { type: "id" },
        status: { type: "enum", values: ["paid", "pending"] },
        total: { type: "money" },
        created_at: { type: "datetime" }
      },
      relations: {
        customer: {
          type: "belongs_to",
          entity: "customers",
          foreignKey: "customer_id"
        }
      }
    },
    customers: {
      table: "customers",
      fields: { id: { type: "id" }, name: { type: "string" } }
    }
  }
});`;

const issue = `{
  "type": "CocoQLIssue",
  "version": "0.1",
  "error": "RELATION_NOT_INCLUDED",
  "stage": "semantic",
  "message": "Field 'customer.name' requires 'with customer'.",
  "location": {
    "line": 5,
    "column": 3,
    "endLine": 5,
    "endColumn": 16
  },
  "path": ["select", 1],
  "entity": "orders",
  "relation": "customer",
  "field": "customer.name",
  "suggestions": ["with customer"]
}`;

const invalidQuery = `from orders

select
  id
  customer.name`;

const permissionPolicy = `const analyst = defineCocoQLPermissions({
  version: "0.1",
  entities: {
    orders: {
      fields: ["id", "status", "customer_id"],
      relations: ["customer"],
      aggregates: ["count"],
      create: ["status", "total"],
      update: ["status"]
    },
    customers: {
      fields: ["id", "name"]
    }
  }
});`;

const permissionIssue = `{
  "type": "CocoQLIssue",
  "version": "0.1",
  "error": "PERMISSION_DENIED",
  "stage": "permission",
  "operation": "read",
  "permission": "field",
  "message": "Read access to field 'orders.total' is denied by the CocoQL policy.",
  "location": {
    "line": 5,
    "column": 3,
    "endLine": 5,
    "endColumn": 8
  },
  "path": ["select", 2],
  "entity": "orders",
  "field": "total"
}`;

const plan = `{
  "type": "QueryPlan",
  "version": "0.1",
  "operation": "select",
  "rootEntity": "orders",
  "joins": [
    {
      "path": "customer",
      "parentPath": null,
      "relation": "customer",
      "fromEntity": "orders",
      "targetEntity": "customers",
      "kind": "left"
    }
  ],
  "projection": [
    { "entity": "orders", "field": "id", "relationPath": null },
    { "entity": "customers", "field": "name", "relationPath": "customer" },
    { "entity": "orders", "field": "total", "relationPath": null }
  ],
  "filters": [
    {
      "field": { "entity": "orders", "field": "created_at", "relationPath": null },
      "operator": "in",
      "value": {
        "kind": "date-range",
        "start": "2026-08-01T00:00:00.000Z",
        "end": "2026-09-01T00:00:00.000Z",
        "timeZone": "UTC",
        "expression": { "kind": "named", "value": "this_month" }
      }
    },
    {
      "field": { "entity": "orders", "field": "status", "relationPath": null },
      "operator": "=",
      "value": { "kind": "scalar", "value": "paid" }
    },
    {
      "field": { "entity": "orders", "field": "total", "relationPath": null },
      "operator": ">=",
      "value": { "kind": "scalar", "value": 100 }
    }
  ],
  "groupBy": [],
  "aggregates": [],
  "orderBy": [
    {
      "by": {
        "kind": "field",
        "field": { "entity": "orders", "field": "created_at", "relationPath": null }
      },
      "direction": "desc"
    }
  ],
  "limit": 20
}`;

const dateRange = `filter created_at in this_month

→ Query Plan

start  2026-08-01T00:00:00.000Z
end    2026-09-01T00:00:00.000Z
zone   UTC

→ MySQL parameters

created_at >= ? AND created_at < ?`;

const namedDates = ["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "this_year", "last_year"] as const;

const aggregateQuery = `from orders

with customer

filter status = paid

group customer.name

select
  customer.name
  sum(total) as revenue
  count(id) as order_count

sort revenue desc

take 10`;

const aggregateSql = `SELECT
  \`t1\`.\`name\` AS \`customer.name\`,
  SUM(\`t0\`.\`total\`) AS \`revenue\`,
  COUNT(\`t0\`.\`id\`) AS \`order_count\`
FROM \`orders\` AS \`t0\`
LEFT JOIN \`customers\` AS \`t1\` ON \`t0\`.\`customer_id\` = \`t1\`.\`id\`
WHERE \`t0\`.\`status\` = ?
GROUP BY \`t1\`.\`name\`
ORDER BY \`revenue\` DESC
LIMIT ?;

parameters: ["paid", 10]`;

const safetyPolicy = `const safety = defineCocoQLSafetyPolicy({
  version: "0.1",
  read: {
    requireTake: true,
    maxTake: 100,
    maxSkip: 1000,
    maxFilters: 5,
    maxProjectedFields: 10,
    maxRelations: 2,
    maxRelationDepth: 2,
    maxGroupFields: 3,
    maxAggregates: 4
  },
  mutation: {
    requireFilterForUpdate: true,
    requireFilterForDelete: true,
    requireConfirmation: true,
    maxAffectedRows: 1000,
    maxFilters: 5,
    maxChanges: 10
  }
});`;

const mutationPreview = `preview

from orders

filter status = pending

update

  status = paid`;

const mutationPlan = `{
  "type": "MutationPreview",
  "version": "0.1",
  "operation": "update",
  "entity": "orders",
  "estimatedAffectedRows": null,
  "estimate": "database-required",
  "plan": {
    "type": "MutationPlan",
    "preview": true,
    "filters": ["status = pending"],
    "changes": ["status = paid"]
  }
}`;

const executableMutation = `from orders

filter status = pending

update

  status = paid

confirm affected <= 25`;

const mutationSql = `UPDATE \`orders\`
SET \`status\` = ?
WHERE \`status\` = ?;

parameters: ["paid", "pending"]
guard: {
  maxAffectedRows: 25,
  verifyBeforeCommit: true
}`;

const postgresQuery = `from clients

with projects.invoices

filter projects.invoices.status = paid

group projects.name

select
  projects.name
  sum(projects.invoices.amount) as revenue

sort revenue desc

take 5`;

const postgresSql = `SELECT
  "t1"."name" AS "projects.name",
  SUM("t2"."amount") AS "revenue"
FROM "clients" AS "t0"
LEFT JOIN "projects" AS "t1"
  ON "t1"."client_id" = "t0"."id"
LEFT JOIN "invoices" AS "t2"
  ON "t2"."project_id" = "t1"."id"
WHERE "t2"."status" = $1
GROUP BY "t1"."name"
ORDER BY "revenue" DESC
LIMIT $2;

parameters: ["paid", 5]`;

const pipeline = ["Source", "Lexer", "AST", "Schema", "Permission", "Safety", "Plan", "SQL dialect"] as const;

export default definePage({
  meta: {
    title: "CocoQL — AI-first database queries | CocoFrame",
    description: "CocoQL is a deterministic, schema-aware language for bounded AI-generated reads, mutation previews, and guarded parameterized SQL.",
    canonical: "https://cocoframe.dev/cocoql",
    image: "/assets/cocoframe-hero-isometric.png",
  },
  view: () => <main id="top" class="cocoql-page">
    <section class="cocoql-hero section-shell">
      <div class="cocoql-hero__copy reveal">
        <span class="eyebrow pill">COCOQL 0.1 · GUARDED READ + WRITE</span>
        <h1>A database language<br />designed for <span>AI.</span></h1>
        <p>CocoQL gives agents a small, deterministic language instead of raw SQL. Every query is parsed, checked, planned independently from the database, and compiled with parameterized values.</p>
        <div class="hero-actions">
          <a class="button button-primary" href="#examples">Explore 14 examples <ArrowRightIcon size={17} /></a>
          <a class="button button-ghost" href="#schema">Define a schema</a>
        </div>
        <ul class="cocoql-safety-list"><li>No database execution</li><li>No raw identifiers</li><li>Default-deny permissions</li><li>Mutation preview first</li></ul>
      </div>
      <div class="cocoql-hero__code reveal">
        <div class="cocoql-codebar"><span><i></i><i></i><i></i></span><b>orders.cocoql</b><em>AI input</em></div>
        <SyntaxHighlighter code={query} language="cocoql" label="CocoQL orders query" showLineNumbers />
      </div>
    </section>

    <section class="cocoql-pipeline" aria-label="CocoQL compilation pipeline">
      <div class="section-shell">{pipeline.map((step, index) => <><span>{step}</span>{index < pipeline.length - 1 ? <b aria-hidden="true">→</b> : null}</>)}</div>
    </section>

    <section class="cocoql-benefits section-shell">
      <header class="section-heading reveal"><span class="eyebrow">WHY COCOQL</span><h2>Predictable enough for code.<br />Simple enough for agents.</h2></header>
      <div class="cocoql-benefit-grid">
        <article class="reveal"><span><StarsMinimalisticIcon size={24} /></span><h3>Deterministic syntax</h3><p>One canonical clause order and a versioned AST make output easy to generate, diff, cache, and repair.</p></article>
        <article class="reveal"><span><DatabaseIcon size={24} /></span><h3>Schema-aware relations</h3><p>Explicit relation paths become deterministic joins. Agents never write table names, foreign keys, or ON expressions.</p></article>
        <article class="reveal"><span><ShieldCheckIcon size={24} /></span><h3>Safe compilation</h3><p>Identifiers come from the trusted schema and every user value becomes a SQL parameter.</p></article>
      </div>
    </section>

    <CocoQLCookbook />

    <section class="cocoql-dates section-shell" id="semantic-dates">
      <div class="cocoql-dates__copy reveal">
        <span class="eyebrow">SEMANTIC DATES</span>
        <h2>Calendar intent.<br />No timestamp math.</h2>
        <p>Agents express meaning while the planner creates an explicit UTC range. Every boundary remains visible in the Query Plan and reaches MySQL only as a parameter.</p>
        <div class="cocoql-date-tags">{namedDates.map((date) => <code>{date}</code>)}</div>
        <div class="cocoql-date-note"><CalendarIcon size={19} /><span><strong>Relative ranges included</strong><br /><code>last 7 days</code> · <code>next 30 days</code></span></div>
      </div>
      <div class="cocoql-dates__code reveal">
        <div class="cocoql-panel-title"><CalendarIcon size={17} /><span>range resolution</span><small>UTC · half-open</small></div>
        <SyntaxHighlighter code={dateRange} language="text" label="CocoQL semantic date range resolution" />
      </div>
    </section>

    <section class="cocoql-aggregate section-shell" id="aggregation">
      <header class="cocoql-section-copy reveal"><span class="eyebrow">TYPED AGGREGATION</span><h2>Ask for insight.<br />Keep the query explicit.</h2><p>Grouped fields and aggregate inputs resolve through the same schema and relation graph. Required aliases make every output and sort target stable for agents.</p></header>
      <div class="cocoql-compare reveal">
        <article><div class="cocoql-panel-title"><GraphUpIcon size={17} /><span>CocoQL aggregate</span><small>grouped intent</small></div><SyntaxHighlighter code={aggregateQuery} language="cocoql" label="CocoQL grouped aggregate query" /></article>
        <article><div class="cocoql-panel-title"><DatabaseIcon size={17} /><span>MySQL</span><small>schema compiled</small></div><SyntaxHighlighter code={aggregateSql} language="text" label="Compiled aggregate MySQL" /></article>
      </div>
    </section>

    <section class="cocoql-errors section-shell" id="structured-errors">
      <header class="cocoql-section-copy reveal"><span class="eyebrow">STRUCTURED ERRORS 0.1</span><h2>Every failure explains<br />how to repair it.</h2><p>One immutable JSON contract identifies the pipeline stage, exact source span, AST path, schema context, and safe correction candidates. Agents never need to parse error prose.</p></header>
      <div class="cocoql-compare reveal">
        <article><div class="cocoql-panel-title"><CodeSquareIcon size={17} /><span>invalid query</span><small>missing relation</small></div><SyntaxHighlighter code={invalidQuery} language="cocoql" label="Invalid CocoQL relation query" showLineNumbers /></article>
        <article><div class="cocoql-panel-title"><ShieldCheckIcon size={17} /><span>CocoQLIssue</span><small>self-correctable</small></div><SyntaxHighlighter code={issue} language="json" label="Versioned CocoQL structured error" /></article>
      </div>
      <div class="cocoql-error-flow reveal"><span><b>1</b> Branch on <code>error</code></span><span><b>2</b> Locate with <code>location</code> + <code>path</code></span><span><b>3</b> Apply a safe <code>suggestion</code></span><span><b>4</b> Revalidate the full query</span></div>
    </section>

    <section class="cocoql-permissions section-shell" id="permissions">
      <header class="cocoql-section-copy reveal"><span class="eyebrow">PERMISSIONS 0.1</span><h2>The agent asks.<br />Your policy decides.</h2><p>A trusted, immutable policy authorizes public entity, field, relation, and aggregate names after schema validation. Anything not listed is denied before a Query Plan can be created.</p></header>
      <div class="cocoql-permission-note reveal"><ShieldCheckIcon size={19} /><span><strong>Explicit by design</strong><br />No wildcard · no SQL identifiers · no policy from AI input</span><code>select id, status, total</code></div>
      <div class="cocoql-compare reveal">
        <article><div class="cocoql-panel-title"><ShieldCheckIcon size={17} /><span>analyst.policy.ts</span><small>trusted input</small></div><SyntaxHighlighter code={permissionPolicy} language="typescript" label="CocoQL analyst permission policy" /></article>
        <article><div class="cocoql-panel-title"><CodeSquareIcon size={17} /><span>CocoQLIssue</span><small>default denied</small></div><SyntaxHighlighter code={permissionIssue} language="json" label="CocoQL permission denied issue" /></article>
      </div>
    </section>

    <section class="cocoql-safety-policy section-shell" id="safety">
      <header class="cocoql-section-copy reveal"><span class="eyebrow">SAFETY POLICY · CQ-015</span><h2>Bound the work.<br />Before the database.</h2><p>One trusted immutable policy limits result windows, query complexity, mutation shape, and affected rows. Stable safety rules make every rejection machine-actionable.</p></header>
      <div class="cocoql-compare reveal">
        <article><div class="cocoql-panel-title"><ShieldCheckIcon size={17} /><span>safety.policy.ts</span><small>trusted limits</small></div><SyntaxHighlighter code={safetyPolicy} language="typescript" label="CocoQL safety policy" /></article>
        <article><div class="cocoql-panel-title"><CodeSquareIcon size={17} /><span>SafetyReport</span><small>deterministic metrics</small></div><SyntaxHighlighter code={`operation: update\nallowed: true\nfilters: 1\nchanges: 1\nconfirmedAffectedRows: 25\npreview: false`} language="text" label="CocoQL safety report" /></article>
      </div>
    </section>

    <section class="cocoql-mutation-preview section-shell" id="mutation-preview">
      <header class="cocoql-section-copy reveal"><span class="eyebrow">MUTATION PREVIEW · CQ-016</span><h2>Inspect write intent.<br />Generate no SQL.</h2><p>Preview validates schema, permissions, filters, values, and safety limits into a public Mutation Plan. Update and delete estimates stay explicitly database-required.</p></header>
      <div class="cocoql-compare reveal">
        <article><div class="cocoql-panel-title"><CodeSquareIcon size={17} /><span>CocoQL preview</span><small>no confirmation needed</small></div><SyntaxHighlighter code={mutationPreview} language="cocoql" label="CocoQL update preview" showLineNumbers /></article>
        <article><div class="cocoql-panel-title"><ShieldCheckIcon size={17} /><span>MutationPreview</span><small>public plan only</small></div><SyntaxHighlighter code={mutationPlan} language="json" label="CocoQL mutation preview plan" /></article>
      </div>
    </section>

    <section class="cocoql-mutations section-shell" id="mutations">
      <header class="cocoql-section-copy reveal"><span class="eyebrow">GUARDED MUTATIONS · CQ-017</span><h2>Explicit confirmation.<br />Parameterized writes.</h2><p>Create, update, and delete use independent permissions and safety checks. Compilation returns SQL, parameters, and a transaction guard—never execution.</p></header>
      <div class="cocoql-compare reveal">
        <article><div class="cocoql-panel-title"><CodeSquareIcon size={17} /><span>CocoQL mutation</span><small>confirmed intent</small></div><SyntaxHighlighter code={executableMutation} language="cocoql" label="Confirmed CocoQL update" /></article>
        <article><div class="cocoql-panel-title"><DatabaseIcon size={17} /><span>MySQL + guard</span><small>verify before commit</small></div><SyntaxHighlighter code={mutationSql} language="text" label="Guarded parameterized MySQL update" /></article>
      </div>
    </section>

    <section class="cocoql-postgres section-shell" id="postgresql">
      <header class="cocoql-section-copy reveal"><span class="eyebrow">POSTGRESQL DIALECT · 14–18 · MANAGED EXECUTION</span><h2>One safe intent.<br />A complete PostgreSQL path.</h2><p>The PostgreSQL path now goes beyond compilation: native UUID, JSONB, arrays and full-text search; CTE, HAVING, cursor and row-lock reads; RETURNING and UPSERT; plus bounded transactions, cancellation, retry, sanitized telemetry, and checksum-locked migrations.</p></header>
      <div class="cocoql-compare reveal">
        <article><div class="cocoql-panel-title"><CodeSquareIcon size={17} /><span>CocoQL</span><small>shared intent</small></div><SyntaxHighlighter code={postgresQuery} language="cocoql" label="CocoQL query compiled for PostgreSQL" /></article>
        <article><div class="cocoql-panel-title"><DatabaseIcon size={17} /><span>PostgreSQL</span><small>numbered parameters</small></div><SyntaxHighlighter code={postgresSql} language="text" label="Parameterized PostgreSQL output" /></article>
      </div>
    </section>

    <section class="cocoql-language section-shell" id="language">
      <header class="cocoql-section-copy reveal"><span class="eyebrow">FROM INTENT TO SQL</span><h2>Readable in. Safe SQL out.</h2><p>The compiler returns SQL and parameters as plain data. Your application remains responsible for authorization and execution.</p></header>
      <div class="cocoql-compare reveal">
        <article><div class="cocoql-panel-title"><CodeSquareIcon size={17} /><span>CocoQL</span><small>input</small></div><SyntaxHighlighter code={query} language="cocoql" label="CocoQL input" /></article>
        <article><div class="cocoql-panel-title"><DatabaseIcon size={17} /><span>MySQL</span><small>compiled</small></div><SyntaxHighlighter code={sql} language="text" label="Parameterized MySQL output" /></article>
      </div>
    </section>

    <section class="cocoql-plan section-shell" id="query-plan">
      <div class="cocoql-plan__copy reveal">
        <span class="eyebrow">QUERY PLAN 0.1</span>
        <h2>One logical plan.<br />Every future dialect.</h2>
        <p>The plan separates what a query means from how a database expresses it. It contains public schema references—not SQL, table names, or column names—so it stays deterministic, inspectable, and safe to hand to a compiler.</p>
        <ul>
          <li><strong>Dialect-independent</strong><span>MySQL and PostgreSQL consume the same public plan contract.</span></li>
          <li><strong>Validated twice</strong><span>Forged operators and invalid references fail before SQL output.</span></li>
          <li><strong>Explainable by default</strong><span>Canonical JSON is ready for logs, snapshots, and future policy checks.</span></li>
        </ul>
        <a class="button button-ghost" href="/docs#cocoql">Read the CocoQL docs <ArrowRightIcon size={16} /></a>
      </div>
      <div class="cocoql-plan__code reveal">
        <div class="cocoql-panel-title"><CodeSquareIcon size={17} /><span>query-plan.json</span><small>dialect independent</small></div>
        <SyntaxHighlighter code={plan} language="json" label="CocoQL Query Plan example" />
      </div>
    </section>

    <section class="cocoql-schema section-shell" id="schema">
      <div class="cocoql-schema__code reveal"><div class="cocoql-panel-title"><CodeSquareIcon size={17} /><span>schema.ts</span><small>trusted boundary</small></div><SyntaxHighlighter code={schema} language="typescript" label="CocoQL schema example" /></div>
      <div class="cocoql-schema__copy reveal"><span class="eyebrow">EXPLICIT SCHEMA</span><h2>Give AI a smaller world to reason about.</h2><p>The registry maps public CocoQL names to known tables and columns. Unknown names fail with structured, actionable issues.</p><div class="cocoql-error"><strong>Self-correcting error</strong><SyntaxHighlighter code={issue} language="json" label="CocoQL structured error" /></div></div>
    </section>

    <section class="cocoql-status section-shell reveal">
      <div><span class="eyebrow">COCOQL 0.2 · POSTGRESQL 14–18</span><h2>A managed AI database boundary.</h2><p>Reads and guarded writes compile from a trusted public plan and can execute through one permission-aware, safety-bounded PostgreSQL lifecycle.</p></div>
      <div class="cocoql-status__columns"><article><h3>Available now</h3><ul><li>MySQL read and mutation compiler</li><li>Managed PostgreSQL executor</li><li>Native UUID, JSONB, arrays, and full-text</li><li>CTE, HAVING, cursor, and row locks</li><li>RETURNING and ON CONFLICT</li><li>Timeout, cancellation, retry, and guard rollback</li><li>Checksum-locked migrations</li></ul></article><article><h3>Verified boundaries</h3><ul><li>PostgreSQL 14–18 CI matrix</li><li>Zero connections for rejected input</li><li>Parameterized values only</li><li>Sanitized errors and telemetry</li><li>Real-driver integration suite</li></ul></article></div>
    </section>
  </main>,
});
