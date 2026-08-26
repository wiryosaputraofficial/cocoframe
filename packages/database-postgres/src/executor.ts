import {
  authorizeCocoQL,
  authorizeCocoQLMutation,
  CocoQLError,
  compileCocoQLMutationToPostgres,
  compileCocoQLToPostgres,
  enforceCocoQLMutationSafety,
  enforceCocoQLSafety,
  parseCocoQL,
  parseCocoQLMutation,
  planCocoQL,
  planCocoQLMutation,
  type CocoQLPermissionPolicy,
  type CocoQLPostgresConflict,
  type CocoQLPostgresPredicate,
  type CocoQLPostgresReadOptions,
  type CocoQLPlanFieldRef,
  type CocoQLPlanOptions,
  type CocoQLQueryPlan,
  type CocoQLSafetyPolicy,
  type CocoQLSchema,
} from "@cocoframe/cocoql";
import type { PostgresPool, PostgresPoolClient, PostgresQueryResult } from "./index.ts";

export type PostgresExecutionOperation = "read" | "create" | "update" | "delete";
export type PostgresExecutionEventName =
  | "connection.acquire.start" | "connection.acquire.success" | "connection.acquire.failure"
  | "query.start" | "query.success" | "query.failure" | "query.cancel"
  | "transaction.begin" | "transaction.commit" | "transaction.rollback" | "transaction.indeterminate"
  | "guard.accept" | "guard.reject" | "retry.scheduled" | "retry.exhausted";

export interface PostgresExecutionEvent {
  readonly name: PostgresExecutionEventName;
  readonly operation: PostgresExecutionOperation;
  readonly fingerprint: string;
  readonly attempt: number;
  readonly durationMs?: number;
  readonly rowCount?: number;
  readonly maximumAffectedRows?: number;
  readonly sqlState?: string;
}

export interface PostgresExecutorOptions {
  readonly acquireTimeoutMs?: number;
  readonly queryTimeoutMs?: number;
  readonly maximumResultRows?: number;
  readonly maximumResultBytes?: number;
  readonly retryMaximum?: number;
  readonly onEvent?: (event: PostgresExecutionEvent) => void;
  readonly now?: () => number;
}

export interface PostgresExecutionInput {
  readonly source: string;
  readonly schema: CocoQLSchema;
  readonly permissions: CocoQLPermissionPolicy;
  readonly safety: CocoQLSafetyPolicy;
  readonly signal?: AbortSignal;
  readonly acquireTimeoutMs?: number;
  readonly queryTimeoutMs?: number;
  readonly fingerprint?: string;
  readonly plan?: CocoQLPlanOptions;
  readonly postgres?: CocoQLPostgresReadOptions;
}

export interface PostgresMutationExecutionInput extends PostgresExecutionInput {
  readonly returning?: readonly string[];
  readonly conflict?: CocoQLPostgresConflict;
  readonly retryMaximum?: number;
}

export interface PostgresExecutionResult<Row extends Record<string, unknown>> {
  readonly rows: readonly Row[];
  readonly rowCount: number;
  readonly durationMs: number;
  readonly attempts: number;
  readonly fingerprint: string;
}

export type PostgresExecutionErrorCode =
  | "ABORTED" | "ACQUIRE_TIMEOUT" | "QUERY_TIMEOUT" | "UNAVAILABLE"
  | "CONSTRAINT_VIOLATION" | "GUARD_REJECTED" | "RESULT_LIMIT"
  | "TRANSACTION_INDETERMINATE" | "DATABASE_ERROR";

/** A sanitized, typed failure from the managed PostgreSQL execution lifecycle. */
export class PostgresExecutionError extends Error {
  readonly code: PostgresExecutionErrorCode;
  readonly operation: PostgresExecutionOperation;
  readonly retryable: boolean;
  readonly sqlState?: string;
  readonly actualAffectedRows?: number;
  readonly maximumAffectedRows?: number;

  constructor(input: {
    readonly code: PostgresExecutionErrorCode;
    readonly operation: PostgresExecutionOperation;
    readonly message: string;
    readonly retryable?: boolean;
    readonly sqlState?: string;
    readonly actualAffectedRows?: number;
    readonly maximumAffectedRows?: number;
    readonly cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "PostgresExecutionError";
    this.code = input.code;
    this.operation = input.operation;
    this.retryable = input.retryable ?? false;
    if (input.sqlState !== undefined) this.sqlState = input.sqlState;
    if (input.actualAffectedRows !== undefined) this.actualAffectedRows = input.actualAffectedRows;
    if (input.maximumAffectedRows !== undefined) this.maximumAffectedRows = input.maximumAffectedRows;
  }

  toJSON(): Readonly<Record<string, unknown>> {
    return Object.freeze({
      type: "PostgresExecutionError",
      code: this.code,
      operation: this.operation,
      message: this.message,
      retryable: this.retryable,
      ...(this.sqlState ? { sqlState: this.sqlState } : {}),
      ...(this.actualAffectedRows === undefined ? {} : { actualAffectedRows: this.actualAffectedRows }),
      ...(this.maximumAffectedRows === undefined ? {} : { maximumAffectedRows: this.maximumAffectedRows }),
    });
  }
}

export interface CocoQLPostgresExecutor {
  readonly read: <Row extends Record<string, unknown> = Record<string, unknown>>(input: PostgresExecutionInput) => Promise<PostgresExecutionResult<Row>>;
  readonly mutate: <Row extends Record<string, unknown> = Record<string, unknown>>(input: PostgresMutationExecutionInput) => Promise<PostgresExecutionResult<Row>>;
}

const DEFAULTS = Object.freeze({
  acquireTimeoutMs: 5_000,
  queryTimeoutMs: 30_000,
  maximumResultRows: 10_000,
  maximumResultBytes: 10 * 1024 * 1024,
  retryMaximum: 2,
});

/** Creates a managed, permission-aware CocoQL executor for PostgreSQL pools. */
export function createCocoQLPostgresExecutor(pool: PostgresPool, options: PostgresExecutorOptions = {}): CocoQLPostgresExecutor {
  const policy = normalizeOptions(options);
  return Object.freeze({
    async read<Row extends Record<string, unknown>>(input: PostgresExecutionInput) {
      assertSourceSize(input.source);
      const query = parseCocoQL(input.source);
      authorizeCocoQL(query, input.schema, input.permissions);
      enforceCocoQLSafety(query, input.schema, input.safety);
      const plan = planCocoQL(query, input.schema, input.plan);
      authorizePostgresReadOptions(plan, input.permissions, input.postgres);
      enforcePostgresReadOptionsSafety(plan, input.safety, input.postgres);
      const compiled = compileCocoQLToPostgres(plan, input.schema, input.postgres);
      const fingerprint = input.fingerprint ?? fingerprintFor("read", compiled.sql);
      return executeAttempt<Row>({ pool, policy, input, operation: "read", fingerprint, text: compiled.sql, values: compiled.parameters });
    },
    async mutate<Row extends Record<string, unknown>>(input: PostgresMutationExecutionInput) {
      assertSourceSize(input.source);
      const mutation = parseCocoQLMutation(input.source);
      authorizeCocoQLMutation(mutation, input.schema, input.permissions);
      enforceCocoQLMutationSafety(mutation, input.schema, input.safety);
      authorizeMutationOutput(mutation.entity, mutation.operation, input.permissions, input);
      const plan = planCocoQLMutation(mutation, input.schema, input.plan);
      const compiled = compileCocoQLMutationToPostgres(plan, input.schema, {
        ...(input.returning ? { returning: input.returning } : {}),
        ...(input.conflict ? { conflict: input.conflict } : {}),
      });
      const fingerprint = input.fingerprint ?? fingerprintFor(mutation.operation, compiled.sql);
      const maximumRetries = boundedInteger(input.retryMaximum ?? policy.retryMaximum, "retryMaximum", 0, 10);
      for (let attempt = 1; ; attempt++) {
        try {
          return await executeAttempt<Row>({
            pool, policy, input, operation: mutation.operation, fingerprint, text: compiled.sql,
            values: compiled.parameters, guard: compiled.guard, attempt,
          });
        } catch (error) {
          const mapped = mapError(error, mutation.operation);
          if (!mapped.retryable || attempt > maximumRetries) {
            if (mapped.retryable) emit(policy, { name: "retry.exhausted", operation: mutation.operation, fingerprint, attempt, ...(mapped.sqlState ? { sqlState: mapped.sqlState } : {}) });
            throw mapped;
          }
          emit(policy, { name: "retry.scheduled", operation: mutation.operation, fingerprint, attempt, ...(mapped.sqlState ? { sqlState: mapped.sqlState } : {}) });
        }
      }
    },
  });
}

function authorizeMutationOutput(entity: string, operation: "create" | "update" | "delete", permissions: CocoQLPermissionPolicy, input: PostgresMutationExecutionInput): void {
  const rule = permissions.entities[entity];
  for (const field of input.returning ?? []) if (!rule?.fields.includes(field)) throw permissionDenied(entity, field, operation, `PostgreSQL RETURNING field '${entity}.${field}' is denied by the CocoQL policy.`);
  for (const field of input.conflict?.update ?? []) if (!rule?.update?.includes(field)) throw permissionDenied(entity, field, operation, `PostgreSQL ON CONFLICT update field '${entity}.${field}' is denied by the CocoQL policy.`);
}

function authorizePostgresReadOptions(plan: CocoQLQueryPlan, permissions: CocoQLPermissionPolicy, options: CocoQLPostgresReadOptions | undefined): void {
  if (!options) return;
  for (const filter of options.predicate ? collectPredicateFilters(options.predicate) : []) requireReadField(filter.field, permissions);
  if (options.cursor) requireReadField(options.cursor.field, permissions);
  for (const cte of options.ctes ?? []) authorizePlan(cte.plan, permissions);
  if (options.fromCte && !options.ctes?.some((cte) => cte.name === options.fromCte)) {
    throw invalidPostgresReadOption(`PostgreSQL fromCte '${options.fromCte}' is not declared.`);
  }
  authorizePlan(plan, permissions);
}

function authorizePlan(plan: CocoQLQueryPlan, permissions: CocoQLPermissionPolicy): void {
  if (!permissions.entities[plan.rootEntity]) throw entityDenied(plan.rootEntity);
  for (const join of plan.joins) {
    const rule = permissions.entities[join.fromEntity];
    if (!rule?.relations?.includes(join.relation)) {
      throw new CocoQLError({ error: "PERMISSION_DENIED", stage: "permission", operation: "read", permission: "relation", entity: join.fromEntity, relation: join.path, message: `Read access to relation '${join.path}' is denied by the CocoQL policy.` });
    }
    if (!permissions.entities[join.targetEntity]) throw entityDenied(join.targetEntity);
  }
  for (const field of planFieldRefs(plan)) requireReadField(field, permissions);
  for (const aggregate of plan.aggregates) {
    const rule = permissions.entities[aggregate.field.entity];
    if (!rule?.aggregates?.includes(aggregate.function)) {
      throw new CocoQLError({ error: "PERMISSION_DENIED", stage: "permission", operation: "read", permission: "aggregate", entity: aggregate.field.entity, field: aggregate.field.field, message: `Aggregate '${aggregate.function}' is denied on entity '${aggregate.field.entity}' by the CocoQL policy.` });
    }
  }
}

function requireReadField(field: CocoQLPlanFieldRef, permissions: CocoQLPermissionPolicy): void {
  const rule = permissions.entities[field.entity];
  if (!rule) throw entityDenied(field.entity);
  if (!rule.fields.includes(field.field)) throw permissionDenied(field.entity, field.field, "read", `Read access to field '${field.entity}.${field.field}' is denied by the CocoQL policy.`);
}

function entityDenied(entity: string): CocoQLError {
  return new CocoQLError({ error: "PERMISSION_DENIED", stage: "permission", operation: "read", permission: "entity", entity, message: `Read access to entity '${entity}' is denied by the CocoQL policy.` });
}

function permissionDenied(entity: string, field: string, operation: PostgresExecutionOperation, message: string): CocoQLError {
  return new CocoQLError({ error: "PERMISSION_DENIED", stage: "permission", operation, permission: "field", entity, field, message });
}

function planFieldRefs(plan: CocoQLQueryPlan): readonly CocoQLPlanFieldRef[] {
  return [
    ...plan.projection,
    ...plan.filters.map((filter) => filter.field),
    ...plan.groupBy,
    ...plan.aggregates.map((aggregate) => aggregate.field),
    ...plan.orderBy.flatMap((sort) => sort.by.kind === "field" ? [sort.by.field] : []),
  ];
}

function collectPredicateFilters(predicate: CocoQLPostgresPredicate, depth = 0): readonly { readonly field: CocoQLPlanFieldRef }[] {
  if (depth > 8) throw invalidPostgresReadOption("PostgreSQL boolean predicate depth cannot exceed 8.");
  if (predicate.kind === "condition") return [predicate.filter];
  if (predicate.kind === "not") return collectPredicateFilters(predicate.predicate, depth + 1);
  if (!Array.isArray(predicate.predicates) || predicate.predicates.length === 0) throw invalidPostgresReadOption(`PostgreSQL '${predicate.kind}' predicate cannot be empty.`);
  const filters = predicate.predicates.flatMap((item) => collectPredicateFilters(item, depth + 1));
  if (filters.length > 100) throw invalidPostgresReadOption("PostgreSQL boolean predicates cannot exceed 100 conditions.");
  return filters;
}

function enforcePostgresReadOptionsSafety(plan: CocoQLQueryPlan, safety: CocoQLSafetyPolicy, options: CocoQLPostgresReadOptions | undefined): void {
  if (!options) return;
  const extraFilters = options.predicate ? collectPredicateFilters(options.predicate).length : 0;
  if (plan.filters.length + extraFilters > safety.read.maxFilters) throw postgresSafetyViolation("read.maxFilters", `Query has ${plan.filters.length + extraFilters} filters; safety allows ${safety.read.maxFilters}.`);
  if ((options.ctes?.length ?? 0) > 8) throw postgresSafetyViolation("read.maxCtes", "PostgreSQL reads cannot declare more than 8 CTEs.");
  for (const cte of options.ctes ?? []) enforcePlanSafety(cte.plan, safety, `CTE '${cte.name}'`);
}

function enforcePlanSafety(plan: CocoQLQueryPlan, safety: CocoQLSafetyPolicy, label: string): void {
  const limits = safety.read;
  const depth = Math.max(0, ...plan.joins.map((join) => join.path.split(".").length));
  const checks: readonly [boolean, string, string][] = [
    [limits.requireTake && plan.limit === undefined, "read.requireTake", `${label} must include an explicit limit.`],
    [(plan.limit ?? 0) > limits.maxTake, "read.maxTake", `${label} exceeds the take limit.`],
    [(plan.offset ?? 0) > limits.maxSkip, "read.maxSkip", `${label} exceeds the skip limit.`],
    [plan.filters.length > limits.maxFilters, "read.maxFilters", `${label} exceeds the filter limit.`],
    [plan.projection.length > limits.maxProjectedFields, "read.maxProjectedFields", `${label} exceeds the projected-field limit.`],
    [plan.joins.length > limits.maxRelations, "read.maxRelations", `${label} exceeds the relation limit.`],
    [depth > limits.maxRelationDepth, "read.maxRelationDepth", `${label} exceeds the relation-depth limit.`],
    [plan.groupBy.length > limits.maxGroupFields, "read.maxGroupFields", `${label} exceeds the group-field limit.`],
    [plan.aggregates.length > limits.maxAggregates, "read.maxAggregates", `${label} exceeds the aggregate limit.`],
  ];
  for (const [failed, rule, message] of checks) if (failed) throw postgresSafetyViolation(rule, message);
}

function invalidPostgresReadOption(message: string): CocoQLError {
  return new CocoQLError({ error: "INVALID_PLAN", stage: "planner", operation: "read", message });
}

function postgresSafetyViolation(rule: string, message: string): CocoQLError {
  return new CocoQLError({ error: "SAFETY_VIOLATION", stage: "safety", operation: "read", rule, message });
}

interface NormalizedOptions {
  readonly acquireTimeoutMs: number;
  readonly queryTimeoutMs: number;
  readonly maximumResultRows: number;
  readonly maximumResultBytes: number;
  readonly retryMaximum: number;
  readonly onEvent?: (event: PostgresExecutionEvent) => void;
  readonly now: () => number;
}

interface AttemptInput {
  readonly pool: PostgresPool;
  readonly policy: NormalizedOptions;
  readonly input: PostgresExecutionInput;
  readonly operation: PostgresExecutionOperation;
  readonly fingerprint: string;
  readonly text: string;
  readonly values: readonly unknown[];
  readonly guard?: { readonly maxAffectedRows: number; readonly verifyBeforeCommit: true };
  readonly attempt?: number;
}

async function executeAttempt<Row extends Record<string, unknown>>(work: AttemptInput): Promise<PostgresExecutionResult<Row>> {
  const attempt = work.attempt ?? 1;
  const started = work.policy.now();
  const acquireTimeoutMs = boundedInteger(work.input.acquireTimeoutMs ?? work.policy.acquireTimeoutMs, "acquireTimeoutMs", 1, 300_000);
  const queryTimeoutMs = boundedInteger(work.input.queryTimeoutMs ?? work.policy.queryTimeoutMs, "queryTimeoutMs", 1, 3_600_000);
  emit(work.policy, { name: "connection.acquire.start", operation: work.operation, fingerprint: work.fingerprint, attempt });
  let client: PostgresPoolClient;
  try {
    client = await acquire(work.pool, acquireTimeoutMs, work.input.signal, work.operation);
    emit(work.policy, { name: "connection.acquire.success", operation: work.operation, fingerprint: work.fingerprint, attempt, durationMs: work.policy.now() - started });
  } catch (error) {
    emit(work.policy, { name: "connection.acquire.failure", operation: work.operation, fingerprint: work.fingerprint, attempt, durationMs: work.policy.now() - started });
    throw mapError(error, work.operation);
  }

  let transactionStarted = false;
  let released = false;
  const release = (error?: Error) => {
    if (released) return;
    released = true;
    client.release(error);
  };
  try {
    await throwIfAborted(work.input.signal, work.operation);
    await client.query("BEGIN");
    transactionStarted = true;
    emit(work.policy, { name: "transaction.begin", operation: work.operation, fingerprint: work.fingerprint, attempt });
    await client.query("SELECT set_config('statement_timeout', $1, true)", [`${queryTimeoutMs}ms`]);
    emit(work.policy, { name: "query.start", operation: work.operation, fingerprint: work.fingerprint, attempt });
    const result = await queryWithAbort<Row>(client, work.text, work.values, work.input.signal, work.operation, release);
    const rowCount = result.rowCount ?? result.rows.length;
    enforceResultLimits(result, work.policy, work.operation);
    if (work.guard && rowCount > work.guard.maxAffectedRows) {
      emit(work.policy, { name: "guard.reject", operation: work.operation, fingerprint: work.fingerprint, attempt, rowCount, maximumAffectedRows: work.guard.maxAffectedRows });
      throw new PostgresExecutionError({
        code: "GUARD_REJECTED", operation: work.operation,
        message: `PostgreSQL mutation affected ${rowCount} rows; the approved maximum is ${work.guard.maxAffectedRows}.`,
        actualAffectedRows: rowCount, maximumAffectedRows: work.guard.maxAffectedRows,
      });
    }
    if (work.guard) emit(work.policy, { name: "guard.accept", operation: work.operation, fingerprint: work.fingerprint, attempt, rowCount, maximumAffectedRows: work.guard.maxAffectedRows });
    try {
      await client.query("COMMIT");
      transactionStarted = false;
      emit(work.policy, { name: "transaction.commit", operation: work.operation, fingerprint: work.fingerprint, attempt });
    } catch (error) {
      const state = sqlState(error);
      if (state && !isConnectionFailure(state)) {
        try {
          await client.query("ROLLBACK");
          transactionStarted = false;
          emit(work.policy, { name: "transaction.rollback", operation: work.operation, fingerprint: work.fingerprint, attempt, sqlState: state });
        } catch {
          transactionStarted = false;
          release(mapError(error, work.operation));
        }
        throw mapError(error, work.operation);
      }
      transactionStarted = false;
      emit(work.policy, { name: "transaction.indeterminate", operation: work.operation, fingerprint: work.fingerprint, attempt, ...(state ? { sqlState: state } : {}) });
      const indeterminate = new PostgresExecutionError({ code: "TRANSACTION_INDETERMINATE", operation: work.operation, message: "PostgreSQL commit outcome is indeterminate.", ...(state ? { sqlState: state } : {}), cause: error });
      release(indeterminate);
      throw indeterminate;
    }
    const durationMs = work.policy.now() - started;
    emit(work.policy, { name: "query.success", operation: work.operation, fingerprint: work.fingerprint, attempt, durationMs, rowCount });
    return Object.freeze({ rows: Object.freeze([...result.rows]), rowCount, durationMs, attempts: attempt, fingerprint: work.fingerprint });
  } catch (error) {
    const mapped = mapError(error, work.operation);
    if (transactionStarted && !released) {
      try {
        await client.query("ROLLBACK");
        emit(work.policy, { name: "transaction.rollback", operation: work.operation, fingerprint: work.fingerprint, attempt, ...(mapped.sqlState ? { sqlState: mapped.sqlState } : {}) });
      } catch {
        release(mapped);
      }
    }
    emit(work.policy, { name: mapped.code === "ABORTED" ? "query.cancel" : "query.failure", operation: work.operation, fingerprint: work.fingerprint, attempt, durationMs: work.policy.now() - started, ...(mapped.sqlState ? { sqlState: mapped.sqlState } : {}) });
    throw mapped;
  } finally {
    release();
  }
}

async function acquire(pool: PostgresPool, timeoutMs: number, signal: AbortSignal | undefined, operation: PostgresExecutionOperation): Promise<PostgresPoolClient> {
  if (signal?.aborted) throw aborted(operation, signal.reason);
  let settled = false;
  const pending = pool.connect();
  const timeout = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => reject(new PostgresExecutionError({ code: "ACQUIRE_TIMEOUT", operation, message: `PostgreSQL connection acquisition exceeded ${timeoutMs}ms.`, retryable: true })), timeoutMs);
    timer.unref?.();
    pending.finally(() => clearTimeout(timer)).catch(() => undefined);
  });
  const abort = signal ? new Promise<never>((_, reject) => {
    const onAbort = () => reject(aborted(operation, signal.reason));
    signal.addEventListener("abort", onAbort, { once: true });
    pending.finally(() => signal.removeEventListener("abort", onAbort)).catch(() => undefined);
  }) : null;
  try {
    const client = await Promise.race(abort ? [pending, timeout, abort] : [pending, timeout]);
    settled = true;
    return client;
  } finally {
    if (!settled) pending.then((client) => client.release(new Error("PostgreSQL acquisition completed after cancellation."))).catch(() => undefined);
  }
}

async function queryWithAbort<Row extends Record<string, unknown>>(
  client: PostgresPoolClient,
  text: string,
  values: readonly unknown[],
  signal: AbortSignal | undefined,
  operation: PostgresExecutionOperation,
  release: (error?: Error) => void,
): Promise<PostgresQueryResult<Row>> {
  if (!signal) return client.query<Row>(text, values);
  if (signal.aborted) throw aborted(operation, signal.reason);
  const query = client.query<Row>(text, values);
  let onAbort: (() => void) | undefined;
  const cancellation = new Promise<never>((_, reject) => {
    onAbort = () => {
      const error = aborted(operation, signal.reason);
      release(error);
      reject(error);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([query, cancellation]);
  } finally {
    if (onAbort) signal.removeEventListener("abort", onAbort);
    query.catch(() => undefined);
  }
}

function enforceResultLimits(result: PostgresQueryResult, policy: NormalizedOptions, operation: PostgresExecutionOperation): void {
  if (result.rows.length > policy.maximumResultRows) throw new PostgresExecutionError({ code: "RESULT_LIMIT", operation, message: `PostgreSQL result exceeds the ${policy.maximumResultRows}-row execution limit.` });
  let bytes = 0;
  for (const row of result.rows) {
    bytes += Buffer.byteLength(JSON.stringify(row));
    if (bytes > policy.maximumResultBytes) throw new PostgresExecutionError({ code: "RESULT_LIMIT", operation, message: `PostgreSQL result exceeds the ${policy.maximumResultBytes}-byte execution limit.` });
  }
}

function normalizeOptions(options: PostgresExecutorOptions): NormalizedOptions {
  return Object.freeze({
    acquireTimeoutMs: boundedInteger(options.acquireTimeoutMs ?? DEFAULTS.acquireTimeoutMs, "acquireTimeoutMs", 1, 300_000),
    queryTimeoutMs: boundedInteger(options.queryTimeoutMs ?? DEFAULTS.queryTimeoutMs, "queryTimeoutMs", 1, 3_600_000),
    maximumResultRows: boundedInteger(options.maximumResultRows ?? DEFAULTS.maximumResultRows, "maximumResultRows", 1, 10_000),
    maximumResultBytes: boundedInteger(options.maximumResultBytes ?? DEFAULTS.maximumResultBytes, "maximumResultBytes", 1_024, 100 * 1024 * 1024),
    retryMaximum: boundedInteger(options.retryMaximum ?? DEFAULTS.retryMaximum, "retryMaximum", 0, 10),
    ...(options.onEvent ? { onEvent: options.onEvent } : {}),
    now: options.now ?? Date.now,
  });
}

function boundedInteger(value: number, name: string, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new TypeError(`${name} must be an integer between ${minimum} and ${maximum}.`);
  return value;
}

function assertSourceSize(source: string): void {
  if (Buffer.byteLength(source) > 65_536) throw new TypeError("CocoQL source cannot exceed 65536 bytes.");
}

function fingerprintFor(operation: PostgresExecutionOperation, sql: string): string {
  let hash = 2_166_136_261;
  for (const character of `${operation}\0${sql}`) hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619);
  return `cocoql-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function emit(policy: NormalizedOptions, event: PostgresExecutionEvent): void {
  try { policy.onEvent?.(Object.freeze({ ...event })); } catch { /* Observability must not break execution. */ }
}

function sqlState(error: unknown): string | undefined {
  return error && typeof error === "object" && typeof (error as { code?: unknown }).code === "string" ? (error as { code: string }).code : undefined;
}

function mapError(error: unknown, operation: PostgresExecutionOperation): PostgresExecutionError {
  if (error instanceof PostgresExecutionError) return error;
  const state = sqlState(error);
  if (state === "57014") return new PostgresExecutionError({ code: "QUERY_TIMEOUT", operation, message: "PostgreSQL query was cancelled or exceeded its statement timeout.", sqlState: state, cause: error });
  if (state === "40001" || state === "40P01") return new PostgresExecutionError({ code: "DATABASE_ERROR", operation, message: "PostgreSQL transaction may be retried.", retryable: true, sqlState: state, cause: error });
  if (state?.startsWith("23")) return new PostgresExecutionError({ code: "CONSTRAINT_VIOLATION", operation, message: "PostgreSQL rejected the operation because a data constraint was violated.", sqlState: state, cause: error });
  if (state?.startsWith("08") || state === "57P01" || state === "57P02" || state === "57P03") return new PostgresExecutionError({ code: "UNAVAILABLE", operation, message: "PostgreSQL is unavailable.", retryable: true, sqlState: state, cause: error });
  return new PostgresExecutionError({ code: "DATABASE_ERROR", operation, message: "PostgreSQL operation failed.", ...(state ? { sqlState: state } : {}), cause: error });
}

function isConnectionFailure(state: string): boolean {
  return state.startsWith("08") || state === "57P01" || state === "57P02" || state === "57P03";
}

function aborted(operation: PostgresExecutionOperation, reason: unknown): PostgresExecutionError {
  return new PostgresExecutionError({ code: "ABORTED", operation, message: "PostgreSQL operation was aborted.", cause: reason });
}

async function throwIfAborted(signal: AbortSignal | undefined, operation: PostgresExecutionOperation): Promise<void> {
  if (signal?.aborted) throw aborted(operation, signal.reason);
}
