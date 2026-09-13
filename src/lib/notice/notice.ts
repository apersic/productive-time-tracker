import type { Copy } from "../copy/en.ts";
import {
  timesheetFailureKind,
  type TimesheetError,
} from "../../features/timesheet/timesheet-model.ts";
import type { CalendarDay } from "../time/calendar-day.ts";

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
  | { kind: "timerFailed"; error: TimesheetError }
  | { kind: "recoverTimerFailed"; error: TimesheetError }
  | { kind: "entryDeleted" }
  | { kind: "entryDeleteFailed"; error: TimesheetError }
  | { kind: "entryUpdated" }
  | { kind: "entryUpdateFailed"; error: TimesheetError }
  | { kind: "copyDayFailed"; error: TimesheetError }
  | { kind: "sessionExpired" };

export type NoticeCopy =
  | { level: "title"; title: string }
  | { level: "detail"; title: string; description: string };

function failedNotice<
  K extends
    | "timerFailed"
    | "recoverTimerFailed"
    | "entryDeleteFailed"
    | "entryUpdateFailed"
    | "copyDayFailed",
>(
  kind: K,
  error: TimesheetError,
): { kind: K; error: TimesheetError } | undefined {
  if (timesheetFailureKind(error) === "unauthorized") {
    return undefined;
  }
  return { kind, error };
}

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
        return failedNotice("copyDayFailed", write.result.error);
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
      return failedNotice("timerFailed", write.result.error);
    }
    case "recoverTimer": {
      if (write.result.ok) {
        return undefined;
      }
      return failedNotice("recoverTimerFailed", write.result.error);
    }
    case "deleteEntry": {
      if (write.result.ok) {
        return { kind: "entryDeleted" };
      }
      return failedNotice("entryDeleteFailed", write.result.error);
    }
    case "updateEntry": {
      if (write.result.ok) {
        return { kind: "entryUpdated" };
      }
      return failedNotice("entryUpdateFailed", write.result.error);
    }
    case "sessionExpired":
      return { kind: "sessionExpired" };
    default: {
      const _exhaustive: never = write;
      return _exhaustive;
    }
  }
}

export function copyForNotice(notice: Notice, copy: Copy): NoticeCopy {
  switch (notice.kind) {
    case "entryCreated":
      return { level: "title", title: copy.notice.entryCreated };
    case "dayCopied":
      return {
        level: "title",
        title: copy.notice.dayCopied(notice.from),
      };
    case "dayCopiedPartial":
      return {
        level: "detail",
        title: copy.notice.dayCopiedPartial(notice.from),
        description: copy.notice.dayCopiedPartialDetail,
      };
    case "timerFailed":
      return {
        level: "detail",
        title: copy.notice.timerFailed,
        description: copy.failure[notice.error],
      };
    case "recoverTimerFailed":
      return {
        level: "detail",
        title: copy.notice.recoverTimerFailed,
        description: copy.failure[notice.error],
      };
    case "entryDeleted":
      return { level: "title", title: copy.notice.entryDeleted };
    case "entryDeleteFailed":
      return {
        level: "detail",
        title: copy.notice.entryDeleteFailed,
        description: copy.failure[notice.error],
      };
    case "entryUpdated":
      return { level: "title", title: copy.notice.entryUpdated };
    case "entryUpdateFailed":
      return {
        level: "detail",
        title: copy.notice.entryUpdateFailed,
        description: copy.failure[notice.error],
      };
    case "copyDayFailed":
      return {
        level: "detail",
        title: copy.notice.copyDayFailed,
        description: copy.failure[notice.error],
      };
    case "sessionExpired":
      return {
        level: "title",
        title: copy.notice.sessionExpired,
      };
    default: {
      const _exhaustive: never = notice;
      return _exhaustive;
    }
  }
}
