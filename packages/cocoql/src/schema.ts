export type CocoQLFieldType =
  | "id" | "string" | "number" | "boolean" | "date" | "datetime" | "enum" | "money"
  | "uuid" | "json" | "jsonb"
  | "string_array" | "number_array" | "boolean_array" | "uuid_array";
export type CocoQLRelationType = "belongs_to" | "has_one" | "has_many";

export interface CocoQLFieldSchema {
  readonly type: CocoQLFieldType;
  readonly column?: string;
  readonly nullable?: boolean;
  readonly unique?: boolean;
  readonly searchConfig?: string;
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

/**
 * Defines the public entities, fields, types, and relations available to CocoQL.
 */
export function defineCocoQLSchema(schema: CocoQLSchema): CocoQLSchema {
  return Object.freeze({ ...schema, entities: Object.freeze({ ...schema.entities }) });
}
