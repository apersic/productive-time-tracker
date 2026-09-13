import {
  authFailureKind,
  type AuthError,
  type AuthErrorKind,
} from "../../lib/auth/session.ts";
import type { CalendarDay } from "../../lib/time/calendar-day.ts";
import { parseMinutes, type Minutes } from "../../lib/time/duration.ts";
import { noteIdentity, type EntryNote } from "./entry-note.ts";

export type TimeEntryId = string & { readonly __brand: "TimeEntryId" };
export type ServiceId = string & { readonly __brand: "ServiceId" };
export type TaskId = string & { readonly __brand: "TaskId" };
export type ProjectId = string & { readonly __brand: "ProjectId" };
export type TimerId = string & { readonly __brand: "TimerId" };

export type RejectedError =
  | "timerAlreadyStopped"
  | "entryNotUpdatable"
  | "entryGone"
  | "entryNotDeletable"
  | "dayStillLoading"
  | "dayChangedWhileSaving"
  | "dayChangedWhileDeleting";

export type TimesheetError = AuthError | RejectedError;

export type TimesheetErrorKind = AuthErrorKind | "rejected";

export function timesheetFailureKind(
  error: TimesheetError,
): TimesheetErrorKind {
  switch (error) {
    case "timerAlreadyStopped":
    case "entryNotUpdatable":
    case "entryGone":
    case "entryNotDeletable":
    case "dayStillLoading":
    case "dayChangedWhileSaving":
    case "dayChangedWhileDeleting":
      return "rejected";
    default:
      return authFailureKind(error);
  }
}

export type TimeEntry = {
  id: TimeEntryId;
  day: CalendarDay;
  note: EntryNote;
  service: { id: ServiceId; name: string };
  task?: { id: TaskId; title: string };
  project?: { id: ProjectId; name: string };
  logged: Minutes;
};

export type EntryListingCopy = {
  title: string;
  subtitle: string | undefined;
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
  | { kind: "entryRemoved"; day: CalendarDay; entryId: TimeEntryId }
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

export function parseProjectId(value: string): ProjectId | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed as ProjectId;
}

export function parseTimerId(value: string): TimerId | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed as TimerId;
}

function serviceLabel(service: { id: string; name: string }): string {
  return service.name.length > 0 ? service.name : service.id;
}

export function entryListingCopy(args: {
  service: { id: string; name: string };
  task?: { title: string };
  project?: { name: string };
}): EntryListingCopy {
  const taskTitle = args.task?.title;
  const projectName = args.project?.name;
  const serviceName = serviceLabel(args.service);
  if (taskTitle !== undefined && taskTitle.length > 0) {
    if (projectName !== undefined && projectName.length > 0) {
      return {
        title: taskTitle,
        subtitle: `${projectName}: ${serviceName}`,
      };
    }
    return {
      title: taskTitle,
      subtitle: serviceName.length > 0 ? serviceName : undefined,
    };
  }
  return {
    title: serviceName,
    subtitle:
      projectName !== undefined && projectName.length > 0
        ? projectName
        : undefined,
  };
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

export type TimerControl =
  | { kind: "play"; mode: "ready"; enabled: boolean }
  | { kind: "stop"; mode: "ready"; enabled: boolean }
  | { kind: "play"; mode: "pending" }
  | { kind: "stop"; mode: "pending" };

export function timerControl(args: {
  entryId: TimeEntryId;
  timer: TimerSlot;
}): TimerControl {
  const { entryId, timer } = args;
  switch (timer.kind) {
    case "idle":
    case "failed":
      return { kind: "play", mode: "ready", enabled: true };
    case "starting":
      if (timer.entryId === entryId) {
        return { kind: "play", mode: "pending" };
      }
      return { kind: "play", mode: "ready", enabled: false };
    case "running":
      if (timer.timer.entryId === entryId) {
        return { kind: "stop", mode: "ready", enabled: true };
      }
      return { kind: "play", mode: "ready", enabled: true };
    case "stopping":
      if (timer.timer.entryId === entryId) {
        return { kind: "stop", mode: "pending" };
      }
      return { kind: "play", mode: "ready", enabled: false };
    case "switching":
      if (timer.to === entryId) {
        return { kind: "play", mode: "pending" };
      }
      if (timer.from.entryId === entryId) {
        return { kind: "stop", mode: "pending" };
      }
      return { kind: "play", mode: "ready", enabled: false };
    default: {
      const _exhaustive: never = timer;
      return _exhaustive;
    }
  }
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
