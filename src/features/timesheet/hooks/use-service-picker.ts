import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { Credentials, PersonId } from "../../../lib/auth/session.ts";
import { debounce, type DebouncedFn } from "../../../lib/helpers/debounce.ts";
import { fetchServiceCatalog } from "../../../providers/productive/services-service.ts";
import type {
  ServiceGroupId,
  ServicesList,
  TrackableService,
} from "../service-catalog.ts";
import { timesheetFailureKind } from "../timesheet-model.ts";
import {
  availabilityFrom,
  initialPickerState,
  listingFrom,
  servicePickerReducer,
  type PickerContext,
  type PickerLifecycle,
  type ServiceListing,
} from "../service-picker-model.ts";

export type { PickerContext, PickerLifecycle, ServiceListing };

export type ServicePicker = {
  readonly availability: ServicesList;
  readonly selected: TrackableService | undefined;
  readonly query: string;
  readonly listing: ServiceListing;
  readonly lifecycle: PickerLifecycle;
  setQuery: (next: string) => void;
  toggleGroup: (id: ServiceGroupId) => void;
  select: (service: TrackableService) => void;
  open: () => void;
  close: () => void;
  reset: () => void;
};

export function useServicePicker(args: {
  credentials: Credentials;
  personId: PersonId;
  context: PickerContext;
  onUnauthorized: () => void;
}): ServicePicker {
  const [state, dispatch] = useReducer(
    servicePickerReducer,
    args.context,
    initialPickerState,
  );
  const argsRef = useRef(args);
  argsRef.current = args;
  const generationRef = useRef(state.searchGeneration);
  const searchDebouncedRef = useRef<DebouncedFn<[string, number]> | undefined>(
    undefined,
  );

  const day = args.context.kind === "ready" ? args.context.day : undefined;
  const pinnedId =
    args.context.kind === "ready" ? args.context.pinned?.id : undefined;
  const dayRef = useRef(day);

  useEffect(() => {
    generationRef.current = state.searchGeneration;
  }, [state.searchGeneration]);

  useEffect(() => {
    const searchDebounced = debounce((query: string, generation: number) => {
      const trimmed = query.trim();
      if (trimmed.length === 0) {
        return;
      }
      const { credentials, personId, context, onUnauthorized } =
        argsRef.current;
      if (context.kind !== "ready") {
        return;
      }
      if (generation !== generationRef.current) {
        return;
      }
      dispatch({ kind: "searchRequested", query: trimmed, generation });
      void fetchServiceCatalog({
        credentials,
        personId,
        day: context.day,
        query: trimmed,
      }).then((result) => {
        if (generation !== generationRef.current) {
          return;
        }
        if (!result.ok) {
          if (timesheetFailureKind(result.error) === "unauthorized") {
            onUnauthorized();
            return;
          }
          dispatch({
            kind: "searchFailed",
            query: trimmed,
            error: result.error,
            generation,
          });
          return;
        }
        dispatch({
          kind: "searchArrived",
          query: trimmed,
          catalog: result.catalog,
          generation,
        });
      });
    });
    searchDebouncedRef.current = searchDebounced;
    return () => {
      searchDebounced.cancel();
    };
  }, []);

  useEffect(() => {
    searchDebouncedRef.current?.cancel();
    if (dayRef.current !== day) {
      generationRef.current += 1;
      dayRef.current = day;
    }
    dispatch({ kind: "contextChanged", context: argsRef.current.context });
  }, [args.context.kind, day, pinnedId]);

  useEffect(() => {
    if (day === undefined) {
      return;
    }
    let cancelled = false;
    const { credentials, personId, onUnauthorized } = argsRef.current;
    dispatch({ kind: "baseRequested" });
    void fetchServiceCatalog({
      credentials,
      personId,
      day,
      query: undefined,
    }).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        if (timesheetFailureKind(result.error) === "unauthorized") {
          onUnauthorized();
          return;
        }
        dispatch({ kind: "baseFailed", day, error: result.error });
        return;
      }
      dispatch({ kind: "baseArrived", day, catalog: result.catalog });
    });
    return () => {
      cancelled = true;
    };
  }, [
    day,
    args.personId,
    args.credentials.accessToken,
    args.credentials.organizationId,
  ]);

  const setQuery = useCallback((next: string) => {
    dispatch({ kind: "inputChanged", input: next });
    searchDebouncedRef.current?.(next, generationRef.current);
  }, []);

  const toggleGroup = useCallback((id: ServiceGroupId) => {
    dispatch({ kind: "groupToggled", id });
  }, []);

  const select = useCallback((service: TrackableService) => {
    dispatch({ kind: "selected", service });
  }, []);

  const open = useCallback(() => {
    dispatch({ kind: "opened" });
  }, []);

  const close = useCallback(() => {
    searchDebouncedRef.current?.cancel();
    generationRef.current += 1;
    dispatch({ kind: "closed" });
  }, []);

  const reset = useCallback(() => {
    searchDebouncedRef.current?.cancel();
    generationRef.current += 1;
    dispatch({ kind: "resetRequested" });
  }, []);

  const availability = useMemo(
    () => availabilityFrom(state.base, state.context),
    [state.base, state.context],
  );
  const listing = useMemo(() => listingFrom(state), [state]);
  return useMemo(
    () => ({
      availability,
      selected: state.selection,
      query: state.input,
      listing,
      lifecycle: state.lifecycle,
      setQuery,
      toggleGroup,
      select,
      open,
      close,
      reset,
    }),
    [
      availability,
      state.selection,
      state.input,
      listing,
      state.lifecycle,
      setQuery,
      toggleGroup,
      select,
      open,
      close,
      reset,
    ],
  );
}
