import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { Credentials, Person } from "../../lib/auth/session.ts";
import { announce } from "../../lib/notice";
import {
  fetchTrackableServices,
  type ServicesList,
} from "../../lib/productive/services.ts";
import {
  fetchTimeEntry,
  updateTimeEntry,
} from "../../lib/productive/time-entries.ts";
import type { EntryDraft } from "../../lib/timesheet/entry-draft.ts";
import type {
  TimeEntry,
  TimeEntryId,
  TimesheetError,
} from "../../lib/timesheet/day-timesheet.ts";
import { homeReturnState, type EditEntryRoute } from "../edit-entry-route.ts";

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

export function useEditEntry(args: {
  credentials: Credentials;
  person: Person;
  logout: () => void;
  route: EditEntryRoute;
}): {
  page: EditEntryPageState;
  services: ServicesList;
  save: (draft: EntryDraft) => Promise<boolean>;
} {
  const navigate = useNavigate();
  const [page, setPage] = useState<EditEntryPageState>(() =>
    pageFromRoute(args.route),
  );
  const [services, setServices] = useState<ServicesList>({ status: "loading" });
  const pageRef = useRef(page);
  const argsRef = useRef(args);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    argsRef.current = args;
  }, [args]);

  const entryId = routeEntryId(args.route);

  useEffect(() => {
    let cancelled = false;
    const { credentials, person } = argsRef.current;
    void fetchTrackableServices({
      credentials,
      personId: person.id,
    }).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        if (result.error.kind === "unauthorized") {
          announce({ op: "sessionExpired" });
          argsRef.current.logout();
          return;
        }
        setServices({ status: "failed", error: result.error });
        return;
      }
      setServices(result.list);
    });
    return () => {
      cancelled = true;
    };
  }, [
    args.person.id,
    args.credentials.accessToken,
    args.credentials.organizationId,
  ]);

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
          argsRef.current.logout();
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
          argsRef.current.logout();
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

  return { page, services, save };
}
