import type { AuthError } from "../auth/session.ts";
import type { CalendarDay } from "../time/calendar-day.ts";
import { parseMinutes, type Minutes } from "../time/duration.ts";
import { noteIdentity, type EntryNote } from "./entry-note.ts";

export type TimeEntryId = string & { readonly __brand: "TimeEntryId" };
export type ServiceId = string & { readonly __brand: "ServiceId" };
export type TaskId = string & { readonly __brand: "TaskId" };
export type TimerId = string & { readonly __brand: "TimerId" };

export type TimesheetError = {
  kind: AuthError["kind"] | "rejected";
  message: string;
};

export type TimeEntry = {
  id: TimeEntryId;
  day: CalendarDay;
  note: EntryNote;
  service: { id: ServiceId; name: string };
  task?: { id: TaskId; title: string };
  logged: Minutes;
};

export type RunningTimer = {
  timerId: TimerId;
  entryId: TimeEntryId;
  day: CalendarDay;
  startedAt: number;
};

export type TimerSlot =
  | { kind: "idle" }
  | { kind: "starting"; entryId: TimeEntryId }
  | { kind: "running"; timer: RunningTimer }
  | { kind: "stopping"; timer: RunningTimer }
  | { kind: "switching"; from: RunningTimer; to: TimeEntryId }
  | { kind: "failed"; entryId: TimeEntryId; error: TimesheetError };

export type CopyOffer =
  | { kind: "checking" }
  | { kind: "unavailable" }
  | { kind: "available"; from: CalendarDay }
  | { kind: "copying"; from: CalendarDay }
  | { kind: "failed"; from: CalendarDay; error: TimesheetError };

export type PageCursor =
  | { kind: "complete" }
  | { kind: "more"; next: string }
  | { kind: "loadingMore"; next: string }
  | { kind: "moreFailed"; next: string; error: TimesheetError };

export type EntriesState =
  | { status: "loading" }
  | { status: "failed"; error: TimesheetError }
  | { status: "empty"; copy: CopyOffer }
  | { status: "ready"; rows: readonly TimeEntry[]; page: PageCursor };

export type DayTimesheet = {
  day: CalendarDay;
  entries: EntriesState;
  timer: TimerSlot;
};

export type TimesheetFact =
  | { kind: "daySelected"; day: CalendarDay }
  | {
      kind: "firstPageArrived";
      day: CalendarDay;
      rows: readonly TimeEntry[];
      next: string | undefined;
      running: readonly RunningTimer[];
    }
  | { kind: "firstPageFailed"; day: CalendarDay; error: TimesheetError }
  | { kind: "moreRequested" }
  | {
      kind: "pageArrived";
      day: CalendarDay;
      rows: readonly TimeEntry[];
      next: string | undefined;
      running: readonly RunningTimer[];
    }
  | { kind: "pageFailed"; day: CalendarDay; error: TimesheetError }
  | {
      kind: "copyOfferResolved";
      day: CalendarDay;
      from: CalendarDay;
      available: boolean;
    }
  | {
      kind: "copyOfferFailed";
      day: CalendarDay;
      from: CalendarDay;
      error: TimesheetError;
    }
  | { kind: "copyStarted"; day: CalendarDay; from: CalendarDay }
  | {
      kind: "copyFailed";
      day: CalendarDay;
      from: CalendarDay;
      error: TimesheetError;
    }
  | {
      kind: "dayReloaded";
      day: CalendarDay;
      rows: readonly TimeEntry[];
      next: string | undefined;
      running: readonly RunningTimer[];
    }
  | { kind: "entryCreated"; day: CalendarDay; entry: TimeEntry }
  | { kind: "playRequested"; entryId: TimeEntryId }
  | { kind: "stopRequested" }
  | { kind: "timerStarted"; timer: RunningTimer }
  | { kind: "timerStopped"; entryId: TimeEntryId; logged: Minutes }
  | { kind: "timerFailed"; entryId: TimeEntryId; error: TimesheetError }
  | {
      kind: "timerRecovered";
      day: CalendarDay;
      timer: RunningTimer | undefined;
    };

export function parseTimeEntryId(value: string): TimeEntryId | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed as TimeEntryId;
}

export function parseServiceId(value: string): ServiceId | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed as ServiceId;
}

export function parseTaskId(value: string): TaskId | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed as TaskId;
}

export function parseTimerId(value: string): TimerId | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed as TimerId;
}

export function initialDayTimesheet(day: CalendarDay): DayTimesheet {
  return {
    day,
    entries: { status: "loading" },
    timer: { kind: "idle" },
  };
}

export function reconstructTimerSlot(
  running: readonly RunningTimer[],
  previous: TimerSlot,
): TimerSlot {
  if (running.length === 0) {
    return previous;
  }
  let latest = running[0];
  if (!latest) {
    return previous;
  }
  for (const timer of running) {
    if (timer.startedAt > latest.startedAt) {
      latest = timer;
    }
  }
  return { kind: "running", timer: latest };
}

export function runningTimerFromSlot(
  slot: TimerSlot,
): RunningTimer | undefined {
  switch (slot.kind) {
    case "idle":
    case "starting":
    case "failed":
      return undefined;
    case "running":
      return slot.timer;
    case "stopping":
      return slot.timer;
    case "switching":
      return slot.from;
    default: {
      const _exhaustive: never = slot;
      return _exhaustive;
    }
  }
}

export function isTimerBusy(slot: TimerSlot): boolean {
  switch (slot.kind) {
    case "starting":
    case "stopping":
    case "switching":
      return true;
    case "idle":
    case "running":
    case "failed":
      return false;
    default: {
      const _exhaustive: never = slot;
      return _exhaustive;
    }
  }
}

export function runningEntryVisible(state: DayTimesheet): boolean {
  const running = runningTimerFromSlot(state.timer);
  if (!running || state.entries.status !== "ready") {
    return false;
  }
  return state.entries.rows.some((row) => row.id === running.entryId);
}

export function displayedMinutes(args: {
  logged: Minutes;
  entryId: TimeEntryId;
  timer: TimerSlot;
  now: number;
}): Minutes {
  const running = runningTimerFromSlot(args.timer);
  if (!running || running.entryId !== args.entryId) {
    return args.logged;
  }
  const elapsed = Math.max(
    0,
    Math.floor((args.now - running.startedAt) / 60_000),
  );
  return parseMinutes(args.logged + elapsed) ?? args.logged;
}

export function copyContentKey(entry: {
  service: { id: ServiceId };
  task?: { id: TaskId };
  note: EntryNote;
  logged: Minutes;
}): string {
  return JSON.stringify([
    entry.service.id,
    entry.task?.id ?? null,
    noteIdentity(entry.note),
    entry.logged,
  ]);
}

export function alreadyCopied(args: {
  source: {
    service: { id: ServiceId };
    task?: { id: TaskId };
    note: EntryNote;
    logged: Minutes;
  };
  existing: readonly {
    service: { id: ServiceId };
    task?: { id: TaskId };
    note: EntryNote;
    logged: Minutes;
  }[];
}): boolean {
  const key = copyContentKey(args.source);
  return args.existing.some((row) => copyContentKey(row) === key);
}

function factDay(fact: TimesheetFact): CalendarDay | undefined {
  switch (fact.kind) {
    case "daySelected":
    case "moreRequested":
    case "playRequested":
    case "stopRequested":
    case "timerStarted":
    case "timerStopped":
    case "timerFailed":
      return undefined;
    case "firstPageArrived":
    case "firstPageFailed":
    case "pageArrived":
    case "pageFailed":
    case "copyOfferResolved":
    case "copyOfferFailed":
    case "copyStarted":
    case "copyFailed":
    case "dayReloaded":
    case "entryCreated":
    case "timerRecovered":
      return fact.day;
    default: {
      const _exhaustive: never = fact;
      return _exhaustive;
    }
  }
}

function pageFromNext(next: string | undefined): PageCursor {
  if (next === undefined) {
    return { kind: "complete" };
  }
  return { kind: "more", next };
}

function withLogged(
  entries: EntriesState,
  entryId: TimeEntryId,
  logged: Minutes,
): EntriesState {
  if (entries.status !== "ready") {
    return entries;
  }
  return {
    ...entries,
    rows: entries.rows.map((row) =>
      row.id === entryId ? { ...row, logged } : row,
    ),
  };
}

function applyDaySelected(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "daySelected" }>,
): DayTimesheet {
  if (fact.day === state.day) {
    return state;
  }
  return {
    day: fact.day,
    entries: { status: "loading" },
    timer: state.timer,
  };
}

function entriesFromPage(
  state: DayTimesheet,
  fact: {
    rows: readonly TimeEntry[];
    next: string | undefined;
    running: readonly RunningTimer[];
  },
): DayTimesheet {
  const timer = reconstructTimerSlot(fact.running, state.timer);
  if (fact.rows.length === 0) {
    return {
      ...state,
      timer,
      entries: { status: "empty", copy: { kind: "checking" } },
    };
  }
  return {
    ...state,
    timer,
    entries: {
      status: "ready",
      rows: fact.rows,
      page: pageFromNext(fact.next),
    },
  };
}

function applyFirstPageArrived(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "firstPageArrived" }>,
): DayTimesheet {
  if (state.entries.status !== "loading") {
    return state;
  }
  return entriesFromPage(state, fact);
}

function applyDayReloaded(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "dayReloaded" }>,
): DayTimesheet {
  return entriesFromPage(state, fact);
}

function applyPageArrived(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "pageArrived" }>,
): DayTimesheet {
  if (state.entries.status !== "ready") {
    return state;
  }
  const page = state.entries.page;
  if (page.kind !== "loadingMore" && page.kind !== "more") {
    return state;
  }
  return {
    ...state,
    timer: reconstructTimerSlot(fact.running, state.timer),
    entries: {
      status: "ready",
      rows: [...state.entries.rows, ...fact.rows],
      page: pageFromNext(fact.next),
    },
  };
}

function applyMoreRequested(state: DayTimesheet): DayTimesheet {
  if (state.entries.status !== "ready") {
    return state;
  }
  const page = state.entries.page;
  if (page.kind !== "more" && page.kind !== "moreFailed") {
    return state;
  }
  return {
    ...state,
    entries: {
      ...state.entries,
      page: { kind: "loadingMore", next: page.next },
    },
  };
}

function applyPageFailed(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "pageFailed" }>,
): DayTimesheet {
  if (state.entries.status !== "ready") {
    return state;
  }
  if (state.entries.page.kind !== "loadingMore") {
    return state;
  }
  return {
    ...state,
    entries: {
      ...state.entries,
      page: {
        kind: "moreFailed",
        next: state.entries.page.next,
        error: fact.error,
      },
    },
  };
}

function applyCopyOfferResolved(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "copyOfferResolved" }>,
): DayTimesheet {
  if (state.entries.status !== "empty") {
    return state;
  }
  if (state.entries.copy.kind !== "checking") {
    return state;
  }
  if (!fact.available) {
    return {
      ...state,
      entries: { status: "empty", copy: { kind: "unavailable" } },
    };
  }
  return {
    ...state,
    entries: {
      status: "empty",
      copy: { kind: "available", from: fact.from },
    },
  };
}

function applyCopyOfferFailed(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "copyOfferFailed" }>,
): DayTimesheet {
  if (state.entries.status !== "empty") {
    return state;
  }
  if (state.entries.copy.kind !== "checking") {
    return state;
  }
  return {
    ...state,
    entries: {
      status: "empty",
      copy: { kind: "failed", from: fact.from, error: fact.error },
    },
  };
}

function applyCopyStarted(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "copyStarted" }>,
): DayTimesheet {
  if (state.entries.status !== "empty") {
    return state;
  }
  const copy = state.entries.copy;
  switch (copy.kind) {
    case "available":
    case "failed":
      if (copy.from !== fact.from) {
        return state;
      }
      return {
        ...state,
        entries: {
          status: "empty",
          copy: { kind: "copying", from: copy.from },
        },
      };
    case "checking":
    case "unavailable":
    case "copying":
      return state;
    default: {
      const _exhaustive: never = copy;
      return _exhaustive;
    }
  }
}

function applyCopyFailed(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "copyFailed" }>,
): DayTimesheet {
  if (state.entries.status !== "empty") {
    return state;
  }
  if (state.entries.copy.kind !== "copying") {
    return state;
  }
  return {
    ...state,
    entries: {
      status: "empty",
      copy: { kind: "failed", from: fact.from, error: fact.error },
    },
  };
}

function applyEntryCreated(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "entryCreated" }>,
): DayTimesheet {
  switch (state.entries.status) {
    case "empty":
    case "loading":
    case "failed":
      return {
        ...state,
        entries: {
          status: "ready",
          rows: [fact.entry],
          page: { kind: "complete" },
        },
      };
    case "ready":
      return {
        ...state,
        entries: {
          ...state.entries,
          rows: [fact.entry, ...state.entries.rows],
        },
      };
    default: {
      const _exhaustive: never = state.entries;
      return _exhaustive;
    }
  }
}

function applyPlayRequested(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "playRequested" }>,
): DayTimesheet {
  switch (state.timer.kind) {
    case "idle":
    case "failed":
      return {
        ...state,
        timer: { kind: "starting", entryId: fact.entryId },
      };
    case "running":
      if (state.timer.timer.entryId === fact.entryId) {
        return state;
      }
      return {
        ...state,
        timer: {
          kind: "switching",
          from: state.timer.timer,
          to: fact.entryId,
        },
      };
    case "starting":
    case "stopping":
    case "switching":
      return state;
    default: {
      const _exhaustive: never = state.timer;
      return _exhaustive;
    }
  }
}

function applyStopRequested(state: DayTimesheet): DayTimesheet {
  switch (state.timer.kind) {
    case "running":
      return {
        ...state,
        timer: { kind: "stopping", timer: state.timer.timer },
      };
    case "idle":
    case "starting":
    case "stopping":
    case "switching":
    case "failed":
      return state;
    default: {
      const _exhaustive: never = state.timer;
      return _exhaustive;
    }
  }
}

function applyTimerStarted(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "timerStarted" }>,
): DayTimesheet {
  switch (state.timer.kind) {
    case "starting":
      if (state.timer.entryId !== fact.timer.entryId) {
        return state;
      }
      return {
        ...state,
        timer: { kind: "running", timer: fact.timer },
      };
    case "switching":
      if (state.timer.to !== fact.timer.entryId) {
        return state;
      }
      return {
        ...state,
        timer: { kind: "running", timer: fact.timer },
      };
    case "idle":
    case "running":
    case "stopping":
    case "failed":
      return state;
    default: {
      const _exhaustive: never = state.timer;
      return _exhaustive;
    }
  }
}

function applyTimerStopped(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "timerStopped" }>,
): DayTimesheet {
  const entries = withLogged(state.entries, fact.entryId, fact.logged);
  switch (state.timer.kind) {
    case "switching":
      return {
        ...state,
        entries,
        timer: { kind: "starting", entryId: state.timer.to },
      };
    case "stopping":
    case "running":
      return { ...state, entries, timer: { kind: "idle" } };
    case "idle":
    case "starting":
    case "failed":
      return { ...state, entries };
    default: {
      const _exhaustive: never = state.timer;
      return _exhaustive;
    }
  }
}

function applyTimerFailed(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "timerFailed" }>,
): DayTimesheet {
  return {
    ...state,
    timer: {
      kind: "failed",
      entryId: fact.entryId,
      error: fact.error,
    },
  };
}

function applyTimerRecovered(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "timerRecovered" }>,
): DayTimesheet {
  if (!fact.timer) {
    switch (state.timer.kind) {
      case "starting":
      case "stopping":
      case "switching":
        return state;
      case "idle":
      case "running":
      case "failed":
        return { ...state, timer: { kind: "idle" } };
      default: {
        const _exhaustive: never = state.timer;
        return _exhaustive;
      }
    }
  }
  switch (state.timer.kind) {
    case "starting":
    case "stopping":
    case "switching":
      return state;
    case "idle":
    case "running":
    case "failed":
      return {
        ...state,
        timer: { kind: "running", timer: fact.timer },
      };
    default: {
      const _exhaustive: never = state.timer;
      return _exhaustive;
    }
  }
}

export function applyFact(
  state: DayTimesheet,
  fact: TimesheetFact,
): DayTimesheet {
  const day = factDay(fact);
  if (day !== undefined && day !== state.day) {
    return state;
  }
  switch (fact.kind) {
    case "daySelected":
      return applyDaySelected(state, fact);
    case "firstPageArrived":
      return applyFirstPageArrived(state, fact);
    case "firstPageFailed":
      return {
        ...state,
        entries: { status: "failed", error: fact.error },
      };
    case "moreRequested":
      return applyMoreRequested(state);
    case "pageArrived":
      return applyPageArrived(state, fact);
    case "pageFailed":
      return applyPageFailed(state, fact);
    case "copyOfferResolved":
      return applyCopyOfferResolved(state, fact);
    case "copyOfferFailed":
      return applyCopyOfferFailed(state, fact);
    case "copyStarted":
      return applyCopyStarted(state, fact);
    case "copyFailed":
      return applyCopyFailed(state, fact);
    case "dayReloaded":
      return applyDayReloaded(state, fact);
    case "entryCreated":
      return applyEntryCreated(state, fact);
    case "playRequested":
      return applyPlayRequested(state, fact);
    case "stopRequested":
      return applyStopRequested(state);
    case "timerStarted":
      return applyTimerStarted(state, fact);
    case "timerStopped":
      return applyTimerStopped(state, fact);
    case "timerFailed":
      return applyTimerFailed(state, fact);
    case "timerRecovered":
      return applyTimerRecovered(state, fact);
    default: {
      const _exhaustive: never = fact;
      return _exhaustive;
    }
  }
}
