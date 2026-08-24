/** The persisted Product Design Quality profile version. */
export const DESIGN_PROFILE_VERSION = 1 as const;

const tokenNames = [
  "font-sans", "font-mono",
  "primary-600", "primary-500", "primary-400", "primary-300", "primary-100",
  "neutral-900", "neutral-700", "neutral-500", "neutral-300", "neutral-100", "neutral-0",
  "color-text", "color-muted", "color-surface", "color-subtle", "color-border",
  "color-primary", "color-primary-hover", "color-primary-contrast", "color-success",
  "color-warning", "color-danger", "color-info", "color-focus",
  "font-size-xs", "font-size-sm", "font-size-base", "font-size-lg", "font-size-xl",
  "font-size-2xl", "font-size-3xl", "line-xs", "line-sm", "line-base", "line-lg",
  "line-xl", "line-2xl", "line-3xl", "space-0", "space-1", "space-2", "space-3",
  "space-4", "space-5", "space-6", "space-7", "space-8", "radius-none", "radius-sm",
  "radius", "radius-lg", "radius-xl", "radius-full", "shadow-sm", "shadow-md",
  "shadow-lg", "shadow-xl",
] as const;

const tokenNameSet = new Set<string>(tokenNames);
const colorTokens = new Set<string>(tokenNames.filter((name) =>
  name.includes("color-") || name.startsWith("primary-") || name.startsWith("neutral-")));

export type DesignTokenName = typeof tokenNames[number];
export type DesignPrinciple = "reuse" | "tokens" | "spacing" | "color" | "contrast" |
  "typography" | "radius" | "elevation" | "iconography" | "overflow" | "responsive" |
  "accessibility" | "fidelity";
export type DesignDiagnosticCode = "INVALID_DESIGN_PROFILE" | "UNRESOLVED_TOKEN_REFERENCE" |
  "COMPONENT_REUSE_NOT_AUDITED" | "CONTRAST_FAILED" | "OVERFLOW_DETECTED" |
  "INCONSISTENT_SPACING" | "INCONSISTENT_ICONOGRAPHY" | "REFERENCE_UNAVAILABLE" |
  "VISUAL_FIDELITY_FAILED" | "EVIDENCE_UNAVAILABLE" | "SENSITIVE_VISUAL_EVIDENCE_BLOCKED" |
  "DESIGN_STATE_CONFLICT" | "COMPONENT_IMPACT_CONFLICT" | "DESIGN_GATE_TIMEOUT";

export interface DesignProfileTheme {
  readonly variables: Readonly<Partial<Record<DesignTokenName, string>>>;
}

export interface DesignIconPolicy {
  readonly package: "@cocoframe/icons";
  readonly family: "linear";
  readonly sizes: readonly number[];
}

export interface DesignProfile {
  readonly version: typeof DESIGN_PROFILE_VERSION;
  readonly id: string;
  readonly name: string;
  readonly extends?: string;
  readonly themes: Readonly<Record<string, DesignProfileTheme>>;
  readonly spacing: Readonly<Record<string, string>>;
  readonly radius: Readonly<Record<string, string>>;
  readonly typography: Readonly<Record<string, string>>;
  readonly elevation: Readonly<Record<string, string>>;
  readonly breakpoints: Readonly<Record<string, string>>;
  readonly icons: DesignIconPolicy;
  readonly updatedAt: string;
}

export interface DesignQaCriterion {
  readonly id: string;
  readonly description: string;
  readonly category: "visual" | "responsive" | "accessibility";
}

export interface DesignDiagnostic {
  readonly code: DesignDiagnosticCode;
  readonly message: string;
  readonly recovery: string;
  readonly target?: string;
  readonly measured?: number;
  readonly required?: number;
}

export interface ProductDesignAuditInput {
  readonly componentsAudited: boolean;
  readonly proposedComponents?: readonly string[];
  readonly referenceState?: "ready" | "missing" | "unavailable";
  readonly measurements?: readonly {
    readonly id: string;
    readonly principle: DesignPrinciple;
    readonly status: "passed" | "failed" | "blocked";
    readonly summary: string;
    readonly sanitized: boolean;
  }[];
}

export interface ProductDesignAuditResult {
  readonly passed: boolean;
  readonly diagnostics: readonly DesignDiagnostic[];
}

/** Defines and validates one provider-independent, server-first project design profile. */
export function defineDesignProfile(profile: DesignProfile): DesignProfile {
  return parseDesignProfile(profile);
}

/** Parses a persisted design profile without evaluating CSS or application code. */
export function parseDesignProfile(value: unknown): DesignProfile {
  if (!isRecord(value)) throw invalid("Design profile must be an object.");
  if (value.version !== DESIGN_PROFILE_VERSION) {
    throw invalid("Unsupported design profile version: " + String(value.version) + ".");
  }
  const id = slug(requiredString(value.id, "id"));
  const name = requiredString(value.name, "name");
  if (!isRecord(value.themes) || Object.keys(value.themes).length === 0 ||
      Object.keys(value.themes).length > 8) {
    throw invalid("Design profile themes must contain between one and eight themes.");
  }
  const themes = Object.fromEntries(Object.entries(value.themes).map(([themeName, raw]) => {
    if (!/^[a-z][a-z0-9-]{0,39}$/.test(themeName)) {
      throw invalid("Invalid design theme name: " + themeName + ".");
    }
    if (!isRecord(raw) || !isRecord(raw.variables)) {
      throw invalid("Design theme " + themeName + " must declare variables.");
    }
    const variables: Partial<Record<DesignTokenName, string>> = {};
    for (const [token, rawValue] of Object.entries(raw.variables)) {
      if (!tokenNameSet.has(token)) throw invalid("Unknown design token: " + token + ".");
      variables[token as DesignTokenName] = safeTokenValue(token, rawValue);
    }
    return [themeName, { variables: Object.freeze(variables) } satisfies DesignProfileTheme];
  }));
  return Object.freeze({
    version: DESIGN_PROFILE_VERSION,
    id,
    name,
    ...(value.extends === undefined ? {} : { extends: slug(requiredString(value.extends, "extends")) }),
    themes: Object.freeze(themes),
    spacing: tokenScale(value.spacing, "spacing", "space-"),
    radius: tokenScale(value.radius, "radius", "radius-", new Set(["radius"])),
    typography: namedTokenScale(
      value.typography,
      "typography",
      (token) => token.startsWith("font-") || token.startsWith("line-"),
    ),
    elevation: tokenScale(value.elevation, "elevation", "shadow-"),
    breakpoints: genericScale(value.breakpoints, "breakpoints"),
    icons: parseIcons(value.icons),
    updatedAt: timestamp(value.updatedAt, "updatedAt"),
  });
}

/** Returns allow-listed Coco UI variables for one approved profile theme. */
export function designThemeTokens(
  profile: DesignProfile,
  theme: string,
): Readonly<Partial<Record<DesignTokenName, string>>> {
  const parsed = parseDesignProfile(profile);
  const selected = parsed.themes[theme];
  if (!selected) throw invalid("Unknown design theme: " + theme + ".");
  return Object.freeze({
    ...selected.variables,
    ...prefixedScale(parsed.spacing, "space-"),
    ...prefixedScale(parsed.radius, "radius-", "default", "radius"),
    ...parsed.typography,
    ...prefixedScale(parsed.elevation, "shadow-"),
  });
}

/** Computes a stable SHA-256 fingerprint without persisting profile values. */
export async function hashDesignProfile(profile: DesignProfile): Promise<string> {
  const bytes = new TextEncoder().encode(stableJson(parseDesignProfile(profile)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Produces required Product Design Quality cases for CocoQA. */
export function productDesignCriteria(
  profile: DesignProfile,
  options: { readonly hasReference?: boolean } = {},
): readonly DesignQaCriterion[] {
  parseDesignProfile(profile);
  const items: DesignQaCriterion[] = [
    criterion("component-reuse", "Existing framework and application components are audited before a new component is proposed.", "visual"),
    criterion("semantic-tokens", "Project appearance is derived from the approved semantic design profile instead of duplicated hardcoded styles.", "visual"),
    criterion("spacing", "Spacing values follow the approved scale and produce a consistent layout rhythm.", "visual"),
    criterion("color", "Semantic color usage remains consistent across equivalent states and components.", "visual"),
    criterion("contrast", "Text, focus indicators, controls, and meaningful graphics satisfy the approved WCAG 2.2 AA contrast thresholds.", "accessibility"),
    criterion("typography", "Typography uses the approved family, scale, weight, line height, and readable wrapping.", "visual"),
    criterion("radius", "Corners use the approved radius scale consistently.", "visual"),
    criterion("elevation", "Shadows and elevation communicate hierarchy consistently without obscuring focus or contrast.", "visual"),
    criterion("iconography", "Icons use the approved catalog, family, sizes, alignment, and accessible labeling.", "accessibility"),
    criterion("overflow", "Approved viewports and text zoom have no unintended horizontal overflow, clipping, or overlapping controls.", "responsive"),
    criterion("responsive", "The interface reflows from 320 pixels through 4K at every approved viewport.", "responsive"),
    criterion("accessibility", "Keyboard, focus, semantic, announcement, forced-colors, and reduced-motion behavior satisfy the approved target.", "accessibility"),
  ];
  if (options.hasReference) {
    items.push(criterion("fidelity", "The rendered result satisfies every approved CocoRef visual criterion at its approved viewports.", "visual"));
  }
  return items;
}

/** Evaluates provider-supplied, sanitized measurements without crawling or rendering. */
export function auditProductDesign(
  profile: DesignProfile,
  input: ProductDesignAuditInput,
): ProductDesignAuditResult {
  const diagnostics: DesignDiagnostic[] = [...profileDiagnostics(parseDesignProfile(profile))];
  if (!input.componentsAudited && (input.proposedComponents?.length ?? 0) > 0) {
    diagnostics.push({
      code: "COMPONENT_REUSE_NOT_AUDITED",
      message: "A new component was proposed before the existing inventory was audited.",
      recovery: "Inspect framework and application components, then reuse or explicitly justify every missing component.",
    });
  }
  if (input.referenceState === "unavailable") {
    diagnostics.push({
      code: "REFERENCE_UNAVAILABLE",
      message: "The approved visual reference is unavailable.",
      recovery: "Restore or complete CocoRef before running fidelity checks.",
    });
  }
  for (const measurement of input.measurements ?? []) {
    if (!measurement.sanitized) {
      diagnostics.push({
        code: "SENSITIVE_VISUAL_EVIDENCE_BLOCKED",
        message: "Design evidence is not marked as sanitized.",
        recovery: "Redact sensitive content and record only declared evidence.",
        target: measurement.id,
      });
      continue;
    }
    if (measurement.status === "blocked") {
      diagnostics.push({
        code: "EVIDENCE_UNAVAILABLE",
        message: measurement.summary,
        recovery: "Restore the required evidence provider and rerun the bounded gate.",
        target: measurement.id,
      });
    }
    if (measurement.status === "failed") diagnostics.push(failedMeasurement(measurement));
  }
  return { passed: diagnostics.length === 0, diagnostics };
}

/** Measures WCAG contrast for two six-digit hexadecimal colors. */
export function contrastRatio(foreground: string, background: string): number {
  const ratio = (luminance(hex(foreground)) + .05) / (luminance(hex(background)) + .05);
  return Math.round(Math.max(ratio, 1 / ratio) * 100) / 100;
}

function profileDiagnostics(profile: DesignProfile): readonly DesignDiagnostic[] {
  const diagnostics: DesignDiagnostic[] = [];
  for (const [theme, { variables }] of Object.entries(profile.themes)) {
    const pairs = [
      ["color-text", "color-surface", 4.5],
      ["color-primary-contrast", "color-primary", 4.5],
      ["color-focus", "color-surface", 3],
    ] as const;
    for (const [foreground, background, required] of pairs) {
      const foregroundValue = variables[foreground];
      const backgroundValue = variables[background];
      if (!foregroundValue || !backgroundValue) continue;
      const measured = contrastRatio(foregroundValue, backgroundValue);
      if (measured < required) {
        diagnostics.push({
          code: "CONTRAST_FAILED",
          message: theme + " theme " + foreground + " against " + background +
            " measures " + measured + ":1.",
          recovery: "Choose approved semantic colors that meet at least " + required + ":1.",
          target: theme + ":" + foreground,
          measured,
          required,
        });
      }
    }
  }
  return diagnostics;
}

function failedMeasurement(
  measurement: NonNullable<ProductDesignAuditInput["measurements"]>[number],
): DesignDiagnostic {
  const code: DesignDiagnosticCode = measurement.principle === "overflow" ? "OVERFLOW_DETECTED"
    : measurement.principle === "spacing" ? "INCONSISTENT_SPACING"
      : measurement.principle === "iconography" ? "INCONSISTENT_ICONOGRAPHY"
        : measurement.principle === "fidelity" ? "VISUAL_FIDELITY_FAILED"
          : measurement.principle === "contrast" ? "CONTRAST_FAILED"
            : "COMPONENT_IMPACT_CONFLICT";
  return {
    code,
    message: measurement.summary,
    recovery: "Record a defect, correct the affected design target, and rerun the required gate.",
    target: measurement.id,
  };
}

function parseIcons(value: unknown): DesignIconPolicy {
  if (!isRecord(value) || value.package !== "@cocoframe/icons" ||
      value.family !== "linear" || !Array.isArray(value.sizes)) {
    throw invalid("Design icon policy must use the @cocoframe/icons linear family.");
  }
  const sizes = [...new Set(value.sizes.map((item) => {
    if (!Number.isSafeInteger(item) || Number(item) < 12 || Number(item) > 128) {
      throw invalid("Design icon sizes must be integers from 12 through 128.");
    }
    return Number(item);
  }))].sort((left, right) => left - right);
  if (sizes.length === 0 || sizes.length > 16) {
    throw invalid("Design icon policy requires between one and sixteen sizes.");
  }
  return Object.freeze({
    package: "@cocoframe/icons",
    family: "linear",
    sizes: Object.freeze(sizes),
  });
}

function tokenScale(
  value: unknown,
  label: string,
  prefix: string,
  extra = new Set<string>(),
): Readonly<Record<string, string>> {
  const scale = genericScale(value, label);
  for (const [key, tokenValue] of Object.entries(scale)) {
    const token = key === "default" && extra.has(prefix.slice(0, -1))
      ? prefix.slice(0, -1)
      : prefix + key;
    if (!tokenNameSet.has(token) && !extra.has(token)) {
      throw invalid("Unknown " + label + " token: " + key + ".");
    }
    safeTokenValue(token, tokenValue);
  }
  return scale;
}

function namedTokenScale(
  value: unknown,
  label: string,
  accepts: (token: string) => boolean,
): Readonly<Record<string, string>> {
  const scale = genericScale(value, label);
  for (const [token, tokenValue] of Object.entries(scale)) {
    if (!tokenNameSet.has(token) || !accepts(token)) {
      throw invalid("Unknown " + label + " token: " + token + ".");
    }
    safeTokenValue(token, tokenValue);
  }
  return scale;
}

function genericScale(value: unknown, label: string): Readonly<Record<string, string>> {
  if (!isRecord(value) || Object.keys(value).length === 0 || Object.keys(value).length > 32) {
    throw invalid("Design " + label + " must contain between one and thirty-two values.");
  }
  const result: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(key)) {
      throw invalid("Invalid " + label + " key: " + key + ".");
    }
    result[key] = safeCssValue(raw, label + "." + key);
  }
  return Object.freeze(result);
}

function safeTokenValue(token: string, value: unknown): string {
  const text = safeCssValue(value, token);
  if (colorTokens.has(token) && !/^#[0-9a-f]{6}$/i.test(text)) {
    throw invalid("Color token " + token + " must use six-digit hexadecimal notation.");
  }
  return text;
}

function safeCssValue(value: unknown, label: string): string {
  if (typeof value !== "string") throw invalid("Design token " + label + " must be a string.");
  const text = value.trim();
  if (!text || text.length > 160 || /[;{}<>]|url\s*\(|expression\s*\(|javascript:/i.test(text)) {
    throw invalid("Design token " + label + " contains an unsafe CSS value.");
  }
  return text;
}

function prefixedScale(
  scale: Readonly<Record<string, string>>,
  prefix: string,
  defaultKey?: string,
  defaultToken?: string,
): Partial<Record<DesignTokenName, string>> {
  const result: Partial<Record<DesignTokenName, string>> = {};
  for (const [key, value] of Object.entries(scale)) {
    const token = key === defaultKey ? defaultToken! : prefix + key;
    if (tokenNameSet.has(token)) result[token as DesignTokenName] = value;
  }
  return result;
}

function criterion(
  id: string,
  description: string,
  category: DesignQaCriterion["category"],
): DesignQaCriterion {
  return { id, description, category };
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw invalid("Design profile " + label + " is required.");
  }
  return value.trim();
}

function slug(value: string): string {
  const result = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!result || result.length > 80) throw invalid("Design profile identifier is invalid.");
  return result;
}

function timestamp(value: unknown, label: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw invalid("Design profile " + label + " must be an ISO timestamp.");
  }
  return new Date(value).toISOString();
}

function invalid(message: string): Error {
  return Object.assign(new Error(message), { code: "INVALID_DESIGN_PROFILE" as const });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  if (isRecord(value)) {
    return "{" + Object.keys(value).sort().map((key) =>
      JSON.stringify(key) + ":" + stableJson(value[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}

function hex(value: string): readonly [number, number, number] {
  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    throw invalid("Contrast colors must use six-digit hexadecimal notation.");
  }
  return [
    parseInt(value.slice(1, 3), 16),
    parseInt(value.slice(3, 5), 16),
    parseInt(value.slice(5, 7), 16),
  ];
}

function luminance(rgb: readonly number[]): number {
  const [red, green, blue] = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
  });
  return .2126 * red! + .7152 * green! + .0722 * blue!;
}