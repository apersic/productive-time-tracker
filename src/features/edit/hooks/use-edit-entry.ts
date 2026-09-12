import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { Credentials, LogoutArgs, Person } from "../../../lib/auth";
import { announce } from "../../../lib/notice";
import { fetchTimeEntry, updateTimeEntry } from "../../../providers/productive";
import { useServicePicker } from "../../timesheet/hooks/use-service-picker.ts";
import type {
  EntryDraft,
  PickerContext,
  ServicePicker,
  TimeEntry,
  TimeEntryId,
  TimesheetError,
} from "../../timesheet";
import { homeReturnState, type EditEntryRoute } from "..";

export type EditEntryPageState =
  | { kind: "invalidId" }
  | { kind: "loading"; entryId: TimeEntryId }
  | { kind: "missing"; entryId: TimeEntryId }
  | { kind: "failed"; entryId: TimeEntryId; error: TimesheetError }
  | { kind: "ready"; entry: TimeEntry }
  | { kind: "saving"; entry: TimeEntry };

function pageFromRoute(route: EditEntryRoute): EditEntryPageState {
  switch (route.kind) {
    case "invalidId":
      return { kind: "invalidId" };
    case "valid":
      if (route.seed) {
        return { kind: "ready", entry: route.seed };
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

function pickerContext(page: EditEntryPageState): PickerContext {
  switch (page.kind) {
    case "ready":
    case "saving":
      return { kind: "ready", day: page.entry.day, pinned: page.entry.service };
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

export function useEditEntry(args: {
  credentials: Credentials;
  person: Person;
  logout: (args?: LogoutArgs) => void;
  route: EditEntryRoute;
}): {
  page: EditEntryPageState;
  picker: ServicePicker;
  save: (draft: EntryDraft) => Promise<boolean>;
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
    onUnauthorized: args.logout,
  });

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
      setPage({ kind: "ready", entry: result.entry });
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
      const entry = current.entry;
      const saving: EditEntryPageState = { kind: "saving", entry };
      pageRef.current = saving;
      setPage(saving);
      const { credentials, person } = argsRef.current;
      const result = await updateTimeEntry({
        credentials,
        personId: person.id,
        entry,
        draft,
      });
      if (
        pageRef.current.kind !== "saving" ||
        pageRef.current.entry.id !== entry.id
      ) {
        return false;
      }
      if (!result.ok) {
        if (result.error.kind === "unauthorized") {
          announce({ op: "sessionExpired" });
          argsRef.current.logout({ reason: "expired" });
          return false;
        }
        announce({ op: "updateEntry", result });
        const ready: EditEntryPageState = { kind: "ready", entry };
        pageRef.current = ready;
        setPage(ready);
        return false;
      }
      announce({ op: "updateEntry", result: { ok: true } });
      void navigate("/", {
        replace: true,
        state: homeReturnState(entry.day),
      });
      return true;
    },
    [navigate],
  );

  return { page, picker, save };
}
