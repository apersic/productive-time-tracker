import {
  formatCalendarDayLabel,
  type CalendarDay,
} from "../time/calendar-day.ts";
import type { TimesheetError } from "../../features/timesheet/timesheet-model.ts";

export type Write =
  | { op: "createEntry"; result: WriteResult }
  | { op: "copyDay"; result: CopyDayResult }
  | { op: "timer"; result: WriteResult }
  | { op: "recoverTimer"; result: WriteResult }
  | { op: "deleteEntry"; result: WriteResult }
  | { op: "updateEntry"; result: WriteResult }
  | { op: "sessionExpired" };

export type WriteResult = { ok: true } | { ok: false; error: TimesheetError };

export type CopyDayResult =
  | { ok: true; copied: "all"; from: CalendarDay; created: number }
  | { ok: true; copied: "partial"; from: CalendarDay; created: number }
  | { ok: false; error: TimesheetError };

export type Notice =
  | { kind: "entryCreated" }
  | { kind: "dayCopied"; from: CalendarDay; created: number }
  | { kind: "dayCopiedPartial"; from: CalendarDay; created: number }
  | { kind: "timerFailed"; message: string }
  | { kind: "recoverTimerFailed"; message: string }
  | { kind: "entryDeleted" }
  | { kind: "entryDeleteFailed"; message: string }
  | { kind: "entryUpdated" }
  | { kind: "entryUpdateFailed"; message: string }
  | { kind: "sessionExpired" };

export type NoticeCopy =
  | { level: "title"; title: string }
  | { level: "detail"; title: string; description: string };

export function noticeFromWrite(write: Write): Notice | undefined {
  switch (write.op) {
    case "createEntry": {
      if (!write.result.ok) {
        return undefined;
      }
      return { kind: "entryCreated" };
    }
    case "copyDay": {
      if (!write.result.ok) {
        return undefined;
      }
      if (write.result.created <= 0) {
        return undefined;
      }
      switch (write.result.copied) {
        case "all":
          return {
            kind: "dayCopied",
            from: write.result.from,
            created: write.result.created,
          };
        case "partial":
          return {
            kind: "dayCopiedPartial",
            from: write.result.from,
            created: write.result.created,
          };
        default: {
          const _exhaustive: never = write.result;
          return _exhaustive;
        }
      }
    }
    case "timer": {
      if (write.result.ok) {
        return undefined;
      }
      if (write.result.error.kind === "unauthorized") {
        return undefined;
      }
      return {
        kind: "timerFailed",
        message: write.result.error.message,
      };
    }
    case "recoverTimer": {
      if (write.result.ok) {
        return undefined;
      }
      if (write.result.error.kind === "unauthorized") {
        return undefined;
      }
      return {
        kind: "recoverTimerFailed",
        message: write.result.error.message,
      };
    }
    case "deleteEntry": {
      if (write.result.ok) {
        return { kind: "entryDeleted" };
      }
      if (write.result.error.kind === "unauthorized") {
        return undefined;
      }
      return {
        kind: "entryDeleteFailed",
        message: write.result.error.message,
      };
    }
    case "updateEntry": {
      if (write.result.ok) {
        return { kind: "entryUpdated" };
      }
      if (write.result.error.kind === "unauthorized") {
        return undefined;
      }
      return {
        kind: "entryUpdateFailed",
        message: write.result.error.message,
      };
    }
    case "sessionExpired":
      return { kind: "sessionExpired" };
    default: {
      const _exhaustive: never = write;
      return _exhaustive;
    }
  }
}

export function copyForNotice(notice: Notice): NoticeCopy {
  switch (notice.kind) {
    case "entryCreated":
      return { level: "title", title: "Time entry added" };
    case "dayCopied":
      return {
        level: "title",
        title: `Copied entries from ${formatCalendarDayLabel(notice.from)}`,
      };
    case "dayCopiedPartial":
      return {
        level: "detail",
        title: `Copied some entries from ${formatCalendarDayLabel(notice.from)}`,
        description: "Productive rejected the rest.",
      };
    case "timerFailed":
      return {
        level: "detail",
        title: "Couldn't update the timer",
        description: notice.message,
      };
    case "recoverTimerFailed":
      return {
        level: "detail",
        title: "Couldn't refresh the timer",
        description: notice.message,
      };
    case "entryDeleted":
      return { level: "title", title: "Time entry deleted" };
    case "entryDeleteFailed":
      return {
        level: "detail",
        title: "Couldn't delete the time entry",
        description: notice.message,
      };
    case "entryUpdated":
      return { level: "title", title: "Time entry updated" };
    case "entryUpdateFailed":
      return {
        level: "detail",
        title: "Couldn't update the time entry",
        description: notice.message,
      };
    case "sessionExpired":
      return {
        level: "title",
        title: "Your session expired. Log in again.",
      };
    default: {
      const _exhaustive: never = notice;
      return _exhaustive;
    }
  }
}
