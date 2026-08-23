export type CocoQLErrorCode =
  | "SYNTAX_ERROR"
  | "UNSUPPORTED_COMMAND"
  | "UNKNOWN_ENTITY"
  | "UNKNOWN_FIELD"
  | "UNKNOWN_RELATION"
  | "RELATION_NOT_INCLUDED"
  | "INVALID_SCHEMA"
  | "INVALID_AGGREGATION"
  | "INVALID_PLAN"
  | "INVALID_PERMISSION_POLICY"
  | "PERMISSION_DENIED"
  | "INVALID_SAFETY_POLICY"
  | "SAFETY_VIOLATION"
  | "INVALID_MUTATION"
  | "PREVIEW_REQUIRED"
  | "INVALID_VALUE"
  | "INVALID_LIMIT"
  | "UNSAFE_MUTATION";

/**
 * Identifies the stable cocoql issue version contract used by @cocoframe/cocoql.
 */
export const COCOQL_ISSUE_VERSION = "0.1" as const;

export type CocoQLErrorStage = "lexer" | "parser" | "semantic" | "permission" | "safety" | "planner" | "compiler";

export type CocoQLPermissionTarget = "entity" | "field" | "relation" | "aggregate";

export interface CocoQLSourceLocation {
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;
}

export type CocoQLIssuePath = readonly (string | number)[];

export interface CocoQLIssue {
  readonly type: "CocoQLIssue";
  readonly version: typeof COCOQL_ISSUE_VERSION;
  readonly error: CocoQLErrorCode;
  readonly stage: CocoQLErrorStage;
  readonly message: string;
  readonly location?: CocoQLSourceLocation;
  readonly path?: CocoQLIssuePath;
  readonly entity?: string;
  readonly field?: string;
  readonly relation?: string;
  readonly operation?: "read" | "create" | "update" | "delete";
  readonly permission?: CocoQLPermissionTarget;
  readonly rule?: string;
  readonly suggestions?: readonly string[];
  readonly availableEntities?: readonly string[];
  readonly availableFields?: readonly string[];
  readonly availableRelations?: readonly string[];
}

export type CocoQLIssueInput = Omit<CocoQLIssue, "type" | "version">;

/**
 * Represents a versioned, structured CocoQL diagnostic with a stage, code, path, and source location.
 */
export class CocoQLError extends Error {
  readonly issue: CocoQLIssue;

  constructor(issue: CocoQLIssueInput) {
    super(issue.message);
    this.name = "CocoQLError";
    this.issue = Object.freeze({
      type: "CocoQLIssue",
      version: COCOQL_ISSUE_VERSION,
      error: issue.error,
      stage: issue.stage,
      message: issue.message,
      ...(issue.location ? { location: Object.freeze({ ...issue.location }) } : {}),
      ...(issue.path ? { path: Object.freeze([...issue.path]) } : {}),
      ...(issue.entity === undefined ? {} : { entity: issue.entity }),
      ...(issue.field === undefined ? {} : { field: issue.field }),
      ...(issue.relation === undefined ? {} : { relation: issue.relation }),
      ...(issue.operation === undefined ? {} : { operation: issue.operation }),
      ...(issue.permission === undefined ? {} : { permission: issue.permission }),
      ...(issue.rule === undefined ? {} : { rule: issue.rule }),
      ...(issue.suggestions ? { suggestions: Object.freeze([...issue.suggestions]) } : {}),
      ...(issue.availableEntities ? { availableEntities: Object.freeze([...issue.availableEntities]) } : {}),
      ...(issue.availableFields ? { availableFields: Object.freeze([...issue.availableFields]) } : {}),
      ...(issue.availableRelations ? { availableRelations: Object.freeze([...issue.availableRelations]) } : {}),
    });
  }

  toJSON(): CocoQLIssue { return this.issue; }
}

export function cocoQLError(issue: CocoQLIssueInput): never { throw new CocoQLError(issue); }
