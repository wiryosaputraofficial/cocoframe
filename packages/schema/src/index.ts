export interface ValidationIssue {
  readonly path: readonly (string | number)[];
  readonly message: string;
  readonly expected: string;
  readonly received: string;
}

export class ValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    super(issues.map((issue) => `${formatPath(issue.path)}: ${issue.message}`).join("; "));
    this.name = "ValidationError";
    this.issues = issues;
  }
}

export interface Schema<T> {
  readonly kind: string;
  readonly optional: boolean;
  readonly parse: (input: unknown) => T;
  readonly json: () => Readonly<Record<string, unknown>>;
  readonly _parse: (input: unknown, path: readonly (string | number)[]) => T;
  readonly _output?: T;
}

export interface OptionalSchema<T> extends Schema<T | undefined> {
  readonly optional: true;
}

export type Infer<Definition extends Schema<unknown>> = Definition extends Schema<infer Output> ? Output : never;

export interface StringOptions {
  readonly min?: number;
  readonly max?: number;
  readonly pattern?: RegExp;
  readonly format?: "email" | "url" | "uuid";
}

export interface NumberOptions {
  readonly min?: number;
  readonly max?: number;
  readonly integer?: boolean;
  readonly coerce?: boolean;
}

export interface BooleanOptions {
  readonly coerce?: boolean;
}

export interface DateOptions {
  readonly coerce?: boolean;
}

export function string(options: StringOptions = {}): Schema<string> {
  return makeSchema("string", false, (input, path) => {
    if (typeof input !== "string") fail(path, "Expected a string", "string", input);
    if (options.min !== undefined && input.length < options.min) fail(path, `Must contain at least ${options.min} characters`, `string(min:${options.min})`, input);
    if (options.max !== undefined && input.length > options.max) fail(path, `Must contain at most ${options.max} characters`, `string(max:${options.max})`, input);
    if (options.pattern && !options.pattern.test(input)) fail(path, "Does not match the required pattern", options.pattern.toString(), input);
    if (options.format === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) fail(path, "Must be a valid email address", "email", input);
    if (options.format === "url") {
      try { new URL(input); } catch { fail(path, "Must be a valid URL", "url", input); }
    }
    if (options.format === "uuid" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input)) {
      fail(path, "Must be a valid UUID", "uuid", input);
    }
    return input;
  }, () => compactJson({ type: "string", minLength: options.min, maxLength: options.max, pattern: options.pattern?.source, format: options.format }));
}

export function number(options: NumberOptions = {}): Schema<number> {
  return makeSchema("number", false, (input, path) => {
    const value = options.coerce && typeof input === "string" && input.trim() !== "" ? Number(input) : input;
    if (typeof value !== "number" || !Number.isFinite(value)) fail(path, "Expected a finite number", "number", input);
    if (options.integer && !Number.isInteger(value)) fail(path, "Expected an integer", "integer", input);
    if (options.min !== undefined && value < options.min) fail(path, `Must be at least ${options.min}`, `number(min:${options.min})`, input);
    if (options.max !== undefined && value > options.max) fail(path, `Must be at most ${options.max}`, `number(max:${options.max})`, input);
    return value;
  }, () => compactJson({ type: options.integer ? "integer" : "number", minimum: options.min, maximum: options.max, "x-coerce": options.coerce }));
}

export function boolean(options: BooleanOptions = {}): Schema<boolean> {
  return makeSchema("boolean", false, (input, path) => {
    if (options.coerce && (input === "true" || input === "1")) return true;
    if (options.coerce && (input === "false" || input === "0")) return false;
    if (typeof input !== "boolean") fail(path, "Expected a boolean", "boolean", input);
    return input;
  }, () => compactJson({ type: "boolean", "x-coerce": options.coerce }));
}

export function literal<const Value extends string | number | boolean | null>(value: Value): Schema<Value> {
  return makeSchema("literal", false, (input, path) => {
    if (!Object.is(input, value)) fail(path, `Expected literal ${JSON.stringify(value)}`, JSON.stringify(value), input);
    return value;
  }, () => ({ const: value }));
}

export function enumeration<const Values extends readonly [string, ...string[]]>(values: Values): Schema<Values[number]> {
  const allowed = new Set<string>(values);
  return makeSchema("enum", false, (input, path) => {
    if (typeof input !== "string" || !allowed.has(input)) fail(path, `Expected one of: ${values.join(", ")}`, "enum", input);
    return input as Values[number];
  }, () => ({ type: "string", enum: values }));
}

export function union<const Variants extends readonly [Schema<unknown>, ...Schema<unknown>[]]>(variants: Variants): Schema<Infer<Variants[number]>> {
  return makeSchema("union", false, (input, path) => {
    for (const variant of variants) {
      try { return variant._parse(input, path) as Infer<Variants[number]>; } catch (error) {
        if (!(error instanceof ValidationError)) throw error;
      }
    }
    fail(path, "Value does not match any union variant", variants.map((variant) => variant.kind).join(" | "), input);
  }, () => ({ anyOf: variants.map((variant) => variant.json()) }));
}

export function array<Item>(item: Schema<Item>): Schema<Item[]> {
  return makeSchema("array", false, (input, path) => {
    if (!Array.isArray(input)) fail(path, "Expected an array", "array", input);
    return input.map((value, index) => item._parse(value, [...path, index]));
  }, () => ({ type: "array", items: item.json() }));
}

export function record<Value>(valueSchema: Schema<Value>): Schema<Record<string, Value>> {
  return makeSchema("record", false, (input, path) => {
    if (typeof input !== "object" || input === null || Array.isArray(input)) fail(path, "Expected a record", "record", input);
    const output: Record<string, Value> = {};
    const issues: ValidationIssue[] = [];
    for (const [key, value] of Object.entries(input)) {
      try { output[key] = valueSchema._parse(value, [...path, key]); }
      catch (error) {
        if (error instanceof ValidationError) issues.push(...error.issues);
        else throw error;
      }
    }
    if (issues.length > 0) throw new ValidationError(issues);
    return output;
  }, () => ({ type: "object", additionalProperties: valueSchema.json() }));
}

export function date(options: DateOptions = {}): Schema<Date> {
  return makeSchema("date", false, (input, path) => {
    const value = options.coerce && typeof input === "string" ? new Date(input) : input;
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) fail(path, "Expected a valid date", "date", input);
    return value;
  }, () => compactJson({ type: "string", format: "date-time", "x-coerce": options.coerce, "x-runtime": "Date" }));
}

export function transform<Input, Output>(input: Schema<Input>, mapper: (value: Input) => Output): Schema<Output> {
  return makeSchema("transform", input.optional, (value, path) => mapper(input._parse(value, path)), () => ({ ...input.json(), "x-transform": true }));
}

export function optional<Value>(schema: Schema<Value>): OptionalSchema<Value> {
  return makeSchema("optional", true, (input, path) => input === undefined ? undefined : schema._parse(input, path), () => schema.json()) as OptionalSchema<Value>;
}

type Shape = Readonly<Record<string, Schema<unknown>>>;
type OptionalKeys<Definition extends Shape> = {
  [Key in keyof Definition]: Definition[Key] extends OptionalSchema<unknown> ? Key : never
}[keyof Definition];
type RequiredKeys<Definition extends Shape> = Exclude<keyof Definition, OptionalKeys<Definition>>;
export type ObjectOutput<Definition extends Shape> =
  { [Key in RequiredKeys<Definition>]: Infer<Definition[Key]> } &
  { [Key in OptionalKeys<Definition>]?: Exclude<Infer<Definition[Key]>, undefined> };

export function object<const Definition extends Shape>(shape: Definition): Schema<ObjectOutput<Definition>> {
  return makeSchema("object", false, (input, path) => {
    if (typeof input !== "object" || input === null || Array.isArray(input)) fail(path, "Expected an object", "object", input);
    const source = input as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    const issues: ValidationIssue[] = [];
    for (const [key, schema] of Object.entries(shape)) {
      try {
        const value = schema._parse(source[key], [...path, key]);
        if (value !== undefined) output[key] = value;
      } catch (error) {
        if (error instanceof ValidationError) issues.push(...error.issues);
        else throw error;
      }
    }
    if (issues.length > 0) throw new ValidationError(issues);
    return output as ObjectOutput<Definition>;
  }, () => ({
    type: "object",
    properties: Object.fromEntries(Object.entries(shape).map(([key, schema]) => [key, schema.json()])),
    required: Object.entries(shape).filter(([, schema]) => !schema.optional).map(([key]) => key),
    additionalProperties: false,
  }));
}

export const schema = {
  string,
  number,
  boolean,
  literal,
  enum: enumeration,
  union,
  array,
  record,
  date,
  transform,
  object,
  optional,
} as const;

function makeSchema<T>(
  kind: string,
  isOptional: boolean,
  parser: (input: unknown, path: readonly (string | number)[]) => T,
  describe: () => Readonly<Record<string, unknown>>,
): Schema<T> {
  return {
    kind,
    optional: isOptional,
    parse: (input) => parser(input, []),
    _parse: parser,
    json: describe,
  };
}

function fail(path: readonly (string | number)[], message: string, expected: string, input: unknown): never {
  throw new ValidationError([{ path, message, expected, received: describe(input) }]);
}

function describe(input: unknown): string {
  if (input === null) return "null";
  if (Array.isArray(input)) return "array";
  return typeof input;
}

function formatPath(path: readonly (string | number)[]): string {
  return path.length === 0 ? "$" : `$${path.map((segment) => typeof segment === "number" ? `[${segment}]` : `.${segment}`).join("")}`;
}

function compactJson(value: Record<string, unknown>): Readonly<Record<string, unknown>> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}
