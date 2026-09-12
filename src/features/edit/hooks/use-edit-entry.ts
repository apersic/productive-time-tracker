import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { Credentials, LogoutArgs, Person } from "../../../lib/auth";
import { announce } from "../../../lib/notice";
import type { CalendarDay } from "../../../lib/time/calendar-day.ts";
import { fetchTimeEntry, updateTimeEntry } from "../../../providers/productive";
import { useServicePicker } from "../../timesheet/hooks/use-service-picker.ts";
import type {
  EntryDraft,
  PickerContext,
  ServicePicker,
  TimeEntry,
  TimeEntryId,
  TimesheetError,
  TrackableService,
} from "../../timesheet";
import { homeReturnState, type EditEntryRoute } from "..";

export type EditSession = {
  readonly entry: TimeEntry;
  readonly day: CalendarDay;
  readonly service: TrackableService;
};

export type EditEntryPageState =
  | { kind: "invalidId" }
  | { kind: "loading"; entryId: TimeEntryId }
  | { kind: "missing"; entryId: TimeEntryId }
  | { kind: "failed"; entryId: TimeEntryId; error: TimesheetError }
  | { kind: "ready"; session: EditSession }
  | { kind: "saving"; session: EditSession };

export function beginSession(entry: TimeEntry): EditSession {
  return { entry, day: entry.day, service: entry.service };
}

export function dayMoved(page: EditEntryPageState): boolean {
  switch (page.kind) {
    case "ready":
    case "saving":
      return page.session.day !== page.session.entry.day;
    case "invalidId":
    case "loading":
    case "missing":
    case "failed":
      return false;
    default: {
      const _exhaustive: never = page;
      return _exhaustive;
    }
  }
}

export function pickerContext(page: EditEntryPageState): PickerContext {
  switch (page.kind) {
    case "ready":
    case "saving":
      return {
        kind: "ready",
        day: page.session.day,
        pinned: page.session.service,
      };
    case "invalidId":
    case "loading":
    case "missing":
    case "failed":
      return { kind: "awaitingDay" };
    default: {
      const _exhaustive: never = page;
      return _exhaustive;
    }
  }
}

export function selectDay(
  page: EditEntryPageState,
  day: CalendarDay,
): EditEntryPageState {
  if (page.kind !== "ready") {
    return page;
  }
  if (page.session.day === day) {
    return page;
  }
  return { kind: "ready", session: { ...page.session, day } };
}

export function selectService(
  page: EditEntryPageState,
  service: TrackableService,
): EditEntryPageState {
  if (page.kind !== "ready") {
    return page;
  }
  if (page.session.service.id === service.id) {
    return page;
  }
  return { kind: "ready", session: { ...page.session, service } };
}

function pageFromRoute(route: EditEntryRoute): EditEntryPageState {
  switch (route.kind) {
    case "invalidId":
      return { kind: "invalidId" };
    case "valid":
      if (route.seed) {
        return { kind: "ready", session: beginSession(route.seed) };
      }
      return { kind: "loading", entryId: route.entryId };
    default: {
      const _exhaustive: never = route;
      return _exhaustive;
    }
  }
}

function routeEntryId(route: EditEntryRoute): TimeEntryId | undefined {
  switch (route.kind) {
    case "invalidId":
      return undefined;
    case "valid":
      return route.entryId;
    default: {
      const _exhaustive: never = route;
      return _exhaustive;
    }
  }
}

function isStillSaving(
  page: EditEntryPageState,
  entryId: TimeEntryId,
): page is { kind: "saving"; session: EditSession } {
  return page.kind === "saving" && page.session.entry.id === entryId;
}

export function useEditEntry(args: {
  credentials: Credentials;
  person: Person;
  logout: (args?: LogoutArgs) => void;
  route: EditEntryRoute;
}): {
  page: EditEntryPageState;
  picker: ServicePicker;
  save: (draft: EntryDraft) => Promise<boolean>;
  selectDay: (day: CalendarDay) => void;
} {
  const navigate = useNavigate();
  const [page, setPage] = useState<EditEntryPageState>(() =>
    pageFromRoute(args.route),
  );
  const pageRef = useRef(page);
  const argsRef = useRef(args);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    argsRef.current = args;
  }, [args]);

  const picker = useServicePicker({
    credentials: args.credentials,
    personId: args.person.id,
    context: pickerContext(page),
    onUnauthorized: () => {
      announce({ op: "sessionExpired" });
      args.logout({ reason: "expired" });
    },
  });
  const selectPinned = picker.select;
  const onSelectService = useCallback(
    (service: TrackableService) => {
      selectPinned(service);
      setPage((current) => {
        const next = selectService(current, service);
        pageRef.current = next;
        return next;
      });
    },
    [selectPinned],
  );
  const editPicker = useMemo(
    (): ServicePicker => ({ ...picker, select: onSelectService }),
    [picker, onSelectService],
  );

  const entryId = routeEntryId(args.route);

  useEffect(() => {
    if (!entryId) {
      return;
    }
    const route = argsRef.current.route;
    if (route.kind === "valid" && route.seed) {
      return;
    }
    let cancelled = false;
    const { credentials, person } = argsRef.current;
    void fetchTimeEntry({
      credentials,
      personId: person.id,
      entryId,
    }).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        if (result.error.kind === "unauthorized") {
          announce({ op: "sessionExpired" });
          argsRef.current.logout({ reason: "expired" });
          return;
        }
        setPage({ kind: "failed", entryId, error: result.error });
        return;
      }
      if (!result.found) {
        setPage({ kind: "missing", entryId });
        return;
      }
      setPage({ kind: "ready", session: beginSession(result.entry) });
    });
    return () => {
      cancelled = true;
    };
  }, [
    entryId,
    args.person.id,
    args.credentials.accessToken,
    args.credentials.organizationId,
  ]);

  const save = useCallback(
    async (draft: EntryDraft): Promise<boolean> => {
      const current = pageRef.current;
      if (current.kind !== "ready") {
        return false;
      }
      const session = current.session;
      const saving: EditEntryPageState = { kind: "saving", session };
      pageRef.current = saving;
      setPage(saving);
      const { credentials, person } = argsRef.current;
      const result = await updateTimeEntry({
        credentials,
        personId: person.id,
        entry: { id: session.entry.id, task: session.entry.task },
        day: session.day,
        draft,
      });
      if (!isStillSaving(pageRef.current, session.entry.id)) {
        return false;
      }
      if (!result.ok) {
        if (result.error.kind === "unauthorized") {
          announce({ op: "sessionExpired" });
          argsRef.current.logout({ reason: "expired" });
          return false;
        }
        announce({ op: "updateEntry", result });
        const ready: EditEntryPageState = { kind: "ready", session };
        pageRef.current = ready;
        setPage(ready);
        return false;
      }
      announce({ op: "updateEntry", result: { ok: true } });
      void navigate("/", {
        replace: true,
        state: homeReturnState(result.entry.day),
      });
      return true;
    },
    [navigate],
  );

  const onSelectDay = useCallback((day: CalendarDay) => {
    setPage((current) => {
      const next = selectDay(current, day);
      pageRef.current = next;
      return next;
    });
  }, []);

  return { page, picker: editPicker, save, selectDay: onSelectDay };
}
