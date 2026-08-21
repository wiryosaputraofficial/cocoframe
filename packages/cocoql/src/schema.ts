export type CocoQLFieldType = "id" | "string" | "number" | "boolean" | "date" | "datetime" | "enum" | "money";
export type CocoQLRelationType = "belongs_to" | "has_one" | "has_many";

export interface CocoQLFieldSchema {
  readonly type: CocoQLFieldType;
  readonly column?: string;
  readonly nullable?: boolean;
  readonly values?: readonly string[];
  readonly description?: string;
}

export interface CocoQLRelationSchema {
  readonly type: CocoQLRelationType;
  readonly entity: string;
  readonly foreignKey: string;
  readonly description?: string;
}

export interface CocoQLEntitySchema {
  readonly table: string;
  readonly description?: string;
  readonly fields: Readonly<Record<string, CocoQLFieldSchema>>;
  readonly relations?: Readonly<Record<string, CocoQLRelationSchema>>;
}

export interface CocoQLSchema {
  readonly version: "0.1";
  readonly entities: Readonly<Record<string, CocoQLEntitySchema>>;
}

export function defineCocoQLSchema(schema: CocoQLSchema): CocoQLSchema {
  return Object.freeze({ ...schema, entities: Object.freeze({ ...schema.entities }) });
}
