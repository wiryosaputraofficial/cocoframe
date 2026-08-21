import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";
import CodeSquareIcon from "@cocoframe/icons/linear/code-square";
import { SyntaxHighlighter } from "@cocoframe/ui";

type CocoQLExample = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly code: string;
  readonly outcome: string;
};

type CocoQLExampleGroup = {
  readonly id: string;
  readonly step: string;
  readonly title: string;
  readonly description: string;
  readonly examples: readonly CocoQLExample[];
};

const exampleGroups: readonly CocoQLExampleGroup[] = [
  {
    id: "examples-read",
    step: "01",
    title: "Read essentials",
    description: "Start with a small projection, then add bounded filters, text matching, sorting, and pagination.",
    examples: [
      {
        id: "example-basic-read",
        title: "Select only what you need",
        description: "A minimal bounded query for a user picker or directory.",
        code: `from users

select
  id
  name

sort name asc

take 25`,
        outcome: "Returns at most 25 users ordered by name.",
      },
      {
        id: "example-filter-list",
        title: "Combine filters",
        description: "Repeated filters are joined with AND; list values stay explicit.",
        code: `from users

filter status in [active, trial]
filter age >= 18

select
  id
  name
  status

take 20`,
        outcome: "Returns active or trial adult users, capped at 20 rows.",
      },
      {
        id: "example-text-search",
        title: "Match text safely",
        description: "Text operators compile to parameterized predicates, never string-built SQL.",
        code: `from customers

filter name starts_with "Acme"
filter email ends_with "@example.com"

select
  id
  name
  email

take 10`,
        outcome: "Matches both text conditions without exposing SQL wildcards.",
      },
      {
        id: "example-pagination",
        title: "Paginate a catalog",
        description: "Use a deterministic sort before take and skip for stable pages.",
        code: `from products

filter stock > 0

select
  id
  name
  price

sort price asc

take 24
skip 48`,
        outcome: "Reads the third 24-item page of in-stock products.",
      },
    ],
  },
  {
    id: "examples-context",
    step: "02",
    title: "Relations and time",
    description: "Traverse only registered relation paths and express calendar intent without timestamp arithmetic.",
    examples: [
      {
        id: "example-relation",
        title: "Include one relation",
        description: "The with clause authorizes a schema-known path before its fields are used.",
        code: `from projects

with client

filter client.name contains corp

select
  id
  name
  client.name

take 20`,
        outcome: "Compiles a deterministic LEFT JOIN using schema-owned keys.",
      },
      {
        id: "example-nested-relation",
        title: "Traverse a nested relation",
        description: "One nested path includes its parent joins in a stable order.",
        code: `from clients

with projects.invoices

filter projects.invoices.status = overdue

select
  id
  projects.name
  projects.invoices.amount

take 50`,
        outcome: "Includes projects before invoices and emits each join once.",
      },
      {
        id: "example-semantic-dates",
        title: "Use semantic dates",
        description: "The planner resolves relative dates into visible UTC half-open ranges.",
        code: `from orders

filter created_at in last 30 days
filter due_date before today

select
  id
  status
  total

sort created_at desc

take 50`,
        outcome: "All resolved date boundaries become database parameters.",
      },
      {
        id: "example-null-and-exclusion",
        title: "Find unfinished records",
        description: "Null and exclusion semantics are represented directly in the language.",
        code: `from orders

filter status not in [cancelled, refunded]
filter shipped_at = null

select
  id
  status
  created_at

take 25`,
        outcome: "Finds non-cancelled orders that have not shipped.",
      },
    ],
  },
  {
    id: "examples-analytics",
    step: "03",
    title: "Analytics",
    description: "Use typed aggregate functions and stable aliases that can also become sort targets.",
    examples: [
      {
        id: "example-aggregate-only",
        title: "Summarize one entity",
        description: "Aggregate-only reads do not need a group clause.",
        code: `from orders

filter status = paid

select
  count(id) as paid_orders
  sum(total) as revenue
  avg(total) as average_order`,
        outcome: "Produces one summary row with three stable output names.",
      },
      {
        id: "example-grouped-aggregate",
        title: "Rank grouped revenue",
        description: "Every ordinary selected field is declared as a group key.",
        code: `from orders

with customer

filter status = paid

group customer.name

select
  customer.name
  sum(total) as revenue
  count(id) as order_count

sort revenue desc

take 10`,
        outcome: "Returns the top 10 customers by paid revenue.",
      },
    ],
  },
  {
    id: "examples-writes",
    step: "04",
    title: "Previewed and guarded writes",
    description: "Keep write intent separate from reads: preview first, then compile only an explicitly confirmed mutation.",
    examples: [
      {
        id: "example-create",
        title: "Create one record",
        description: "Create permissions are independent from read and update permissions.",
        code: `create orders
  status = pending
  total = 125

confirm affected <= 1`,
        outcome: "Compiles an INSERT with bound values and a one-row guard.",
      },
      {
        id: "example-update-preview",
        title: "Preview an update",
        description: "Preview validates intent and returns a Mutation Plan without producing SQL.",
        code: `preview

from orders

filter status = pending
filter due_date before today

update
  status = overdue`,
        outcome: "Returns a database-free preview; no confirmation is required yet.",
      },
      {
        id: "example-update",
        title: "Confirm a bounded update",
        description: "The adapter must verify the real affected count in the same transaction.",
        code: `from orders

filter status = pending
filter due_date before today

update
  status = overdue

confirm affected <= 25`,
        outcome: "Compiles parameterized SQL with verifyBeforeCommit enabled.",
      },
      {
        id: "example-delete",
        title: "Delete by a precise filter",
        description: "Delete requires its own permission, a filter, and affected-row confirmation.",
        code: `from orders

filter id = 7

delete

confirm affected <= 1`,
        outcome: "Compiles a single-row guarded DELETE; it does not execute it.",
      },
    ],
  },
] as const;

function ExampleCard({ example, index }: { readonly example: CocoQLExample; readonly index: number }) {
  return <article class="cocoql-example-card reveal" id={example.id}>
    <header>
      <span>{String(index + 1).padStart(2, "0")}</span>
      <div><h4>{example.title}</h4><p>{example.description}</p></div>
    </header>
    <div class="cocoql-example-card__code">
      <div class="cocoql-panel-title"><CodeSquareIcon size={16} /><span>example.cocoql</span><small>copy-ready</small></div>
      <SyntaxHighlighter code={example.code} language="cocoql" label={`${example.title} CocoQL example`} />
    </div>
    <footer><strong>Expected</strong><span>{example.outcome}</span></footer>
  </article>;
}

export function CocoQLCookbook() {
  let exampleIndex = 0;
  return <section class="cocoql-cookbook section-shell" id="examples">
    <div class="cocoql-cookbook__intro reveal">
      <div><span class="eyebrow">COCOQL COOKBOOK · 14 EXAMPLES</span><h2>Learn from a small query.<br />Build toward safe writes.</h2></div>
      <div><p>Every snippet follows CocoQL 0.1 clause order and assumes the named entities and fields exist in your trusted schema. Start with reads, then move through relations, analytics, previews, and guarded mutations.</p><a href="/docs#cocoql">Read the complete API guide <ArrowRightIcon size={16} /></a></div>
    </div>
    <nav class="cocoql-cookbook__nav" aria-label="CocoQL example groups">
      {exampleGroups.map((group) => <a href={`#${group.id}`}><span>{group.step}</span>{group.title}</a>)}
    </nav>
    {exampleGroups.map((group) => <section class="cocoql-example-group" id={group.id}>
      <header><span>{group.step}</span><div><h3>{group.title}</h3><p>{group.description}</p></div></header>
      <div class="cocoql-example-grid">{group.examples.map((example) => {
        const index = exampleIndex;
        exampleIndex += 1;
        return <ExampleCard example={example} index={index} />;
      })}</div>
    </section>)}
  </section>;
}
