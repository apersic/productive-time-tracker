import type { CalendarDay } from "../../lib/time/calendar-day.ts";
import type { TimesheetError } from "./timesheet-model.ts";
import {
  catalogRows,
  catalogWithPinned,
  openedByDefault,
  serviceAvailability,
  serviceGroupId,
  toggleExpansion,
  type Expansion,
  type ServiceCatalog,
  type ServiceGroupId,
  type ServiceRow,
  type ServicesList,
  type TrackableService,
} from "./service-catalog.ts";

export type PickerContext =
  | { kind: "awaitingDay" }
  | { kind: "ready"; day: CalendarDay; pinned: TrackableService | undefined };

export type PickerLifecycle = { kind: "closed" } | { kind: "open" };

export type BaseCatalog =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "failed"; error: TimesheetError }
  | { kind: "ready"; day: CalendarDay; catalog: ServiceCatalog };

export type SearchState =
  | { kind: "off" }
  | { kind: "typing"; previous: ServiceCatalog | undefined }
  | { kind: "fetching"; previous: ServiceCatalog | undefined }
  | { kind: "ready"; catalog: ServiceCatalog }
  | {
      kind: "failed";
      error: TimesheetError;
      previous: ServiceCatalog | undefined;
    };

export type ServiceListing =
  | { kind: "loading" }
  | { kind: "failed"; error: TimesheetError }
  | { kind: "empty"; reason: "noServices" | "noMatches" }
  | { kind: "rows"; rows: readonly ServiceRow[]; stale: boolean }
  | {
      kind: "searchFailed";
      error: TimesheetError;
      rows: readonly ServiceRow[];
    };

export type ServicePickerState = {
  readonly context: PickerContext;
  readonly base: BaseCatalog;
  readonly input: string;
  readonly search: SearchState;
  readonly expansion: Expansion;
  readonly selection: TrackableService | undefined;
  readonly lifecycle: PickerLifecycle;
  readonly searchGeneration: number;
};

export type ServicePickerEvent =
  | { kind: "contextChanged"; context: PickerContext }
  | { kind: "baseRequested" }
  | { kind: "baseArrived"; day: CalendarDay; catalog: ServiceCatalog }
  | { kind: "baseFailed"; day: CalendarDay; error: TimesheetError }
  | { kind: "inputChanged"; input: string }
  | { kind: "searchRequested"; query: string; generation: number }
  | {
      kind: "searchArrived";
      query: string;
      catalog: ServiceCatalog;
      generation: number;
    }
  | {
      kind: "searchFailed";
      query: string;
      error: TimesheetError;
      generation: number;
    }
  | { kind: "groupToggled"; id: ServiceGroupId }
  | { kind: "selected"; service: TrackableService }
  | { kind: "opened" }
  | { kind: "closed" }
  | { kind: "resetRequested" };

export function initialPickerState(context: PickerContext): ServicePickerState {
  return {
    context,
    base:
      context.kind === "awaitingDay" ? { kind: "idle" } : { kind: "loading" },
    input: "",
    search: { kind: "off" },
    expansion: { mode: "collapsed", opened: new Set() },
    selection: context.kind === "ready" ? context.pinned : undefined,
    lifecycle: { kind: "closed" },
    searchGeneration: 0,
  };
}

function contextDay(context: PickerContext): CalendarDay | undefined {
  switch (context.kind) {
    case "awaitingDay":
      return undefined;
    case "ready":
      return context.day;
    default: {
      const _exhaustive: never = context;
      return _exhaustive;
    }
  }
}

function contextPinned(context: PickerContext): TrackableService | undefined {
  switch (context.kind) {
    case "awaitingDay":
      return undefined;
    case "ready":
      return context.pinned;
    default: {
      const _exhaustive: never = context;
      return _exhaustive;
    }
  }
}

function browseExpansion(
  catalog: ServiceCatalog,
  pinned: TrackableService | undefined,
): Expansion {
  const display = catalogWithPinned({ catalog, pinned });
  const opened = new Set(openedByDefault(display));
  const pinId = serviceGroupId(["pinned"]);
  if (display.roots[0]?.kind === "group" && display.roots[0].id === pinId) {
    opened.add(pinId);
  }
  return { mode: "collapsed", opened };
}

function expansionForState(state: ServicePickerState): Expansion {
  switch (state.base.kind) {
    case "idle":
    case "loading":
    case "failed":
      return { mode: "collapsed", opened: new Set() };
    case "ready":
      return browseExpansion(state.base.catalog, contextPinned(state.context));
    default: {
      const _exhaustive: never = state.base;
      return _exhaustive;
    }
  }
}

function displayCatalog(
  catalog: ServiceCatalog,
  context: PickerContext,
): ServiceCatalog {
  return catalogWithPinned({
    catalog,
    pinned: contextPinned(context),
  });
}

function shownCatalog(
  search: SearchState,
  base: BaseCatalog,
  context: PickerContext,
): ServiceCatalog | undefined {
  switch (search.kind) {
    case "off":
      switch (base.kind) {
        case "idle":
        case "loading":
        case "failed":
          return undefined;
        case "ready":
          return displayCatalog(base.catalog, context);
        default: {
          const _exhaustive: never = base;
          return _exhaustive;
        }
      }
    case "typing":
    case "fetching":
    case "failed":
      return search.previous === undefined
        ? undefined
        : displayCatalog(search.previous, context);
    case "ready":
      return displayCatalog(search.catalog, context);
    default: {
      const _exhaustive: never = search;
      return _exhaustive;
    }
  }
}

function searchIsCurrent(
  state: ServicePickerState,
  query: string,
  generation: number,
): boolean {
  return generation === state.searchGeneration && query === state.input.trim();
}

function backfillPrevious(
  search: SearchState,
  catalog: ServiceCatalog,
): SearchState {
  switch (search.kind) {
    case "off":
    case "ready":
      return search;
    case "typing":
    case "fetching":
    case "failed":
      if (search.previous !== undefined) {
        return search;
      }
      return { ...search, previous: catalog };
    default: {
      const _exhaustive: never = search;
      return _exhaustive;
    }
  }
}

export function availabilityFrom(
  base: BaseCatalog,
  context: PickerContext,
): ServicesList {
  if (context.kind === "awaitingDay") {
    return { status: "loading" };
  }
  switch (base.kind) {
    case "idle":
    case "loading":
      return { status: "loading" };
    case "failed":
      return { status: "failed", error: base.error };
    case "ready":
      if (base.day !== context.day) {
        return { status: "loading" };
      }
      return serviceAvailability({
        catalog: base.catalog,
        pinned: context.pinned,
      });
    default: {
      const _exhaustive: never = base;
      return _exhaustive;
    }
  }
}

export function listingFrom(state: ServicePickerState): ServiceListing {
  const selected = state.selection?.id;
  switch (state.search.kind) {
    case "off":
      return baseListing(state);
    case "typing":
    case "fetching": {
      const previous = state.search.previous;
      if (!previous) {
        return { kind: "loading" };
      }
      const rows = catalogRows({
        catalog: displayCatalog(previous, state.context),
        expansion: state.expansion,
        selected,
      });
      if (rows.length === 0) {
        return { kind: "empty", reason: "noMatches" };
      }
      return { kind: "rows", rows, stale: true };
    }
    case "ready": {
      const catalog = displayCatalog(state.search.catalog, state.context);
      if (catalog.serviceCount === 0) {
        return { kind: "empty", reason: "noMatches" };
      }
      return {
        kind: "rows",
        rows: catalogRows({
          catalog,
          expansion: state.expansion,
          selected,
        }),
        stale: false,
      };
    }
    case "failed": {
      const previous = state.search.previous;
      const rows = previous
        ? catalogRows({
            catalog: displayCatalog(previous, state.context),
            expansion: state.expansion,
            selected,
          })
        : [];
      return {
        kind: "searchFailed",
        error: state.search.error,
        rows,
      };
    }
    default: {
      const _exhaustive: never = state.search;
      return _exhaustive;
    }
  }
}

function baseListing(state: ServicePickerState): ServiceListing {
  const pinned = contextPinned(state.context);
  const selected = state.selection?.id;
  switch (state.base.kind) {
    case "idle":
    case "loading":
      return { kind: "loading" };
    case "failed":
      return { kind: "failed", error: state.base.error };
    case "ready": {
      const day = contextDay(state.context);
      if (day !== undefined && state.base.day !== day) {
        return { kind: "loading" };
      }
      const catalog = catalogWithPinned({
        catalog: state.base.catalog,
        pinned,
      });
      if (catalog.serviceCount === 0) {
        return { kind: "empty", reason: "noServices" };
      }
      return {
        kind: "rows",
        rows: catalogRows({
          catalog,
          expansion: state.expansion,
          selected,
        }),
        stale: false,
      };
    }
    default: {
      const _exhaustive: never = state.base;
      return _exhaustive;
    }
  }
}

export function servicePickerReducer(
  state: ServicePickerState,
  event: ServicePickerEvent,
): ServicePickerState {
  switch (event.kind) {
    case "contextChanged":
      return reduceContextChanged(state, event.context);
    case "baseRequested":
      return reduceBaseRequested(state);
    case "baseArrived":
      return reduceBaseArrived(state, event);
    case "baseFailed":
      return reduceBaseFailed(state, event);
    case "inputChanged":
      return reduceInputChanged(state, event.input);
    case "searchRequested":
      return reduceSearchRequested(state, event);
    case "searchArrived":
      return reduceSearchArrived(state, event);
    case "searchFailed":
      return reduceSearchFailed(state, event);
    case "groupToggled":
      return {
        ...state,
        expansion: toggleExpansion(state.expansion, event.id),
      };
    case "selected":
      return { ...state, selection: event.service };
    case "opened":
      return { ...state, lifecycle: { kind: "open" } };
    case "closed":
      return reduceClosed(state);
    case "resetRequested":
      return reduceReset(state);
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

function reduceContextChanged(
  state: ServicePickerState,
  context: PickerContext,
): ServicePickerState {
  const prevDay = contextDay(state.context);
  const nextDay = contextDay(context);
  if (prevDay === nextDay) {
    return {
      ...state,
      context,
      selection:
        state.selection ??
        (context.kind === "ready" ? context.pinned : undefined),
    };
  }
  return {
    ...state,
    context,
    base: nextDay === undefined ? { kind: "idle" } : { kind: "loading" },
    input: "",
    search: { kind: "off" },
    expansion: { mode: "collapsed", opened: new Set() },
    selection: context.kind === "ready" ? context.pinned : undefined,
    searchGeneration: state.searchGeneration + 1,
  };
}

function reduceBaseRequested(state: ServicePickerState): ServicePickerState {
  if (state.context.kind === "awaitingDay") {
    return state;
  }
  if (state.base.kind === "loading") {
    return state;
  }
  return { ...state, base: { kind: "loading" } };
}

function reduceBaseArrived(
  state: ServicePickerState,
  event: { day: CalendarDay; catalog: ServiceCatalog },
): ServicePickerState {
  if (contextDay(state.context) !== event.day) {
    return state;
  }
  return {
    ...state,
    base: { kind: "ready", day: event.day, catalog: event.catalog },
    search: backfillPrevious(state.search, event.catalog),
    expansion:
      state.search.kind === "off"
        ? browseExpansion(event.catalog, contextPinned(state.context))
        : state.expansion,
  };
}

function reduceBaseFailed(
  state: ServicePickerState,
  event: { day: CalendarDay; error: TimesheetError },
): ServicePickerState {
  if (contextDay(state.context) !== event.day) {
    return state;
  }
  return { ...state, base: { kind: "failed", error: event.error } };
}

function reduceInputChanged(
  state: ServicePickerState,
  input: string,
): ServicePickerState {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return {
      ...state,
      input,
      search: { kind: "off" },
      expansion: expansionForState(state),
    };
  }
  return {
    ...state,
    input,
    search: {
      kind: "typing",
      previous: shownCatalog(state.search, state.base, state.context),
    },
  };
}

function reduceSearchRequested(
  state: ServicePickerState,
  event: { query: string; generation: number },
): ServicePickerState {
  if (!searchIsCurrent(state, event.query, event.generation)) {
    return state;
  }
  if (event.query.length === 0) {
    return state;
  }
  return {
    ...state,
    search: {
      kind: "fetching",
      previous: shownCatalog(state.search, state.base, state.context),
    },
  };
}

function reduceSearchArrived(
  state: ServicePickerState,
  event: { query: string; catalog: ServiceCatalog; generation: number },
): ServicePickerState {
  if (!searchIsCurrent(state, event.query, event.generation)) {
    return state;
  }
  return {
    ...state,
    search: {
      kind: "ready",
      catalog: event.catalog,
    },
    expansion: { mode: "expanded", closed: new Set() },
  };
}

function reduceSearchFailed(
  state: ServicePickerState,
  event: { query: string; error: TimesheetError; generation: number },
): ServicePickerState {
  if (!searchIsCurrent(state, event.query, event.generation)) {
    return state;
  }
  return {
    ...state,
    search: {
      kind: "failed",
      error: event.error,
      previous: shownCatalog(state.search, state.base, state.context),
    },
  };
}

function reduceClosed(state: ServicePickerState): ServicePickerState {
  return {
    ...state,
    lifecycle: { kind: "closed" },
    searchGeneration: state.searchGeneration + 1,
    input: "",
    search: { kind: "off" },
    expansion: expansionForState(state),
  };
}

function reduceReset(state: ServicePickerState): ServicePickerState {
  return {
    ...state,
    input: "",
    search: { kind: "off" },
    expansion: expansionForState(state),
    selection:
      state.context.kind === "ready" ? state.context.pinned : undefined,
    lifecycle: { kind: "closed" },
    searchGeneration: state.searchGeneration + 1,
  };
}
