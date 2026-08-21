import type { CocoQLQuery } from "./ast.ts";
import type { CocoQLSourceLocation } from "./errors.ts";

export interface CocoQLQuerySourceMap {
  readonly entity: CocoQLSourceLocation;
  readonly relations: readonly CocoQLSourceLocation[];
  readonly filters: readonly CocoQLSourceLocation[];
  readonly group: readonly CocoQLSourceLocation[];
  readonly select: readonly CocoQLSourceLocation[];
  readonly aggregates: readonly CocoQLSourceLocation[];
  readonly sort: readonly CocoQLSourceLocation[];
  readonly take?: CocoQLSourceLocation;
  readonly skip?: CocoQLSourceLocation;
}

const querySourceMaps = new WeakMap<CocoQLQuery, CocoQLQuerySourceMap>();

export function registerCocoQLSourceMap(query: CocoQLQuery, sourceMap: CocoQLQuerySourceMap): void {
  querySourceMaps.set(query, Object.freeze({
    ...sourceMap,
    entity: Object.freeze({ ...sourceMap.entity }),
    relations: freezeLocations(sourceMap.relations),
    filters: freezeLocations(sourceMap.filters),
    group: freezeLocations(sourceMap.group),
    select: freezeLocations(sourceMap.select),
    aggregates: freezeLocations(sourceMap.aggregates),
    sort: freezeLocations(sourceMap.sort),
    ...(sourceMap.take ? { take: Object.freeze({ ...sourceMap.take }) } : {}),
    ...(sourceMap.skip ? { skip: Object.freeze({ ...sourceMap.skip }) } : {}),
  }));
}

export function getCocoQLSourceMap(query: CocoQLQuery): CocoQLQuerySourceMap | undefined {
  return querySourceMaps.get(query);
}

function freezeLocations(locations: readonly CocoQLSourceLocation[]): readonly CocoQLSourceLocation[] {
  return Object.freeze(locations.map((location) => Object.freeze({ ...location })));
}
