import type { CocoQLMutation } from "./ast.ts";
import type { CocoQLSourceLocation } from "./errors.ts";

export interface CocoQLMutationSourceMap {
  readonly entity: CocoQLSourceLocation;
  readonly operation: CocoQLSourceLocation;
  readonly preview?: CocoQLSourceLocation;
  readonly filters: readonly CocoQLSourceLocation[];
  readonly changes: readonly CocoQLSourceLocation[];
  readonly confirmation?: CocoQLSourceLocation;
}

const maps = new WeakMap<CocoQLMutation, CocoQLMutationSourceMap>();

export function registerCocoQLMutationSourceMap(mutation: CocoQLMutation, sourceMap: CocoQLMutationSourceMap): void {
  maps.set(mutation, Object.freeze({
    ...sourceMap,
    filters: Object.freeze([...sourceMap.filters]),
    changes: Object.freeze([...sourceMap.changes]),
  }));
}

export function getCocoQLMutationSourceMap(mutation: CocoQLMutation): CocoQLMutationSourceMap | undefined {
  return maps.get(mutation);
}
