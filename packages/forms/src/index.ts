import { createContextKey, rerender, type ActionRender, type RequestContext } from "@cocoframe/core";
import { jsx, type CocoNode } from "@cocoframe/jsx";
import { ValidationError, type Schema } from "@cocoframe/schema";
import { csrfTokenKey } from "@cocoframe/security";

export type FormValue = string | readonly string[];

export interface FormState<Input> {
  readonly submitted: boolean;
  readonly values: Readonly<Partial<Record<Extract<keyof Input, string>, FormValue>>>;
  readonly errors: Readonly<Partial<Record<Extract<keyof Input, string> | "_form", readonly string[]>>>;
}

export interface FormFieldProps {
  readonly id: string;
  readonly name: string;
  readonly value?: string;
  readonly "aria-invalid"?: "true";
  readonly "aria-describedby"?: string;
}

export interface FieldOptions {
  readonly id?: string;
  readonly describedBy?: readonly string[];
}

export interface FormController<Input> {
  readonly action: (
    submit: (input: Input, context: RequestContext) => Response | ActionRender | void | Promise<Response | ActionRender | void>,
  ) => (context: RequestContext) => Promise<Response | ActionRender | void>;
  readonly state: (context: RequestContext) => FormState<Input>;
  readonly field: (name: Extract<keyof Input, string>, state: FormState<Input>, options?: FieldOptions) => FormFieldProps;
}

export interface CreateFormOptions<Input> {
  readonly sensitiveFields?: readonly Extract<keyof Input, string>[];
}

export function createForm<Input>(schema: Schema<Input>, options: CreateFormOptions<Input> = {}): FormController<Input> {
  const stateKey = createContextKey<FormState<Input>>("form-state");
  const sensitiveFields = new Set<string>(options.sensitiveFields ?? []);
  const empty: FormState<Input> = {
    submitted: false,
    values: {} as FormState<Input>["values"],
    errors: {} as FormState<Input>["errors"],
  };
  return {
    action(submit) {
      return async (context) => {
        let raw: Record<string, FormValue> = {};
        try {
          raw = await formValues(context.request);
          return await submit(schema.parse(raw), context);
        } catch (error) {
          if (!(error instanceof ValidationError)) throw error;
          context.set(stateKey, {
            submitted: true,
            values: retainedValues(raw, sensitiveFields) as FormState<Input>["values"],
            errors: formErrors<Input>(error),
          });
          return rerender(422);
        }
      };
    },
    state: (context) => context.get(stateKey) ?? empty,
    field(name, state, options = {}) {
      const id = options.id ?? `field-${name}`;
      const errors = state.errors[name];
      const raw = state.values[name];
      const descriptions = [...(options.describedBy ?? []), ...(errors?.length ? [`${id}-error`] : [])];
      return {
        id,
        name,
        ...(raw !== undefined ? { value: Array.isArray(raw) ? raw[0] ?? "" : raw as string } : {}),
        ...(errors?.length ? { "aria-invalid": "true" as const } : {}),
        ...(descriptions.length ? { "aria-describedby": descriptions.join(" ") } : {}),
      };
    },
  };
}

function retainedValues(values: Record<string, FormValue>, sensitiveFields: ReadonlySet<string>): Record<string, FormValue> {
  return Object.fromEntries(Object.entries(values).filter(([name]) =>
    !sensitiveFields.has(name) && !/(?:password|passcode|secret|token)/i.test(name),
  ));
}

export interface CsrfFieldProps {
  readonly context: RequestContext;
  readonly name?: string;
}

export function CsrfField({ context, name = "_csrf" }: CsrfFieldProps): CocoNode {
  const token = context.get(csrfTokenKey);
  return token ? jsx("input", { type: "hidden", name, value: token }) : null;
}

async function formValues(request: Request): Promise<Record<string, FormValue>> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/x-www-form-urlencoded") && !type.includes("multipart/form-data")) {
    throw new ValidationError([{ path: [], message: "Expected an HTML form body", expected: "form-data", received: type || "missing" }]);
  }
  const data = await request.formData();
  const output: Record<string, string | string[]> = {};
  for (const [name, value] of data) {
    if (typeof value !== "string") continue;
    const existing = output[name];
    if (existing === undefined) output[name] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else output[name] = [existing, value];
  }
  return output;
}

function formErrors<Input>(error: ValidationError): FormState<Input>["errors"] {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = typeof issue.path[0] === "string" ? issue.path[0] : "_form";
    (errors[field] ??= []).push(issue.message);
  }
  return errors as unknown as FormState<Input>["errors"];
}
