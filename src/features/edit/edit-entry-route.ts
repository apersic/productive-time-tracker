import { isRecord } from "../../lib/helpers/is-record.ts";
import {
  parseCalendarDay,
  type CalendarDay,
} from "../../lib/time/calendar-day.ts";
import { parseMinutes } from "../../lib/time/duration.ts";
import {
  parseEntryNote,
  parseServiceId,
  parseTaskId,
  parseTimeEntryId,
  serializeEntryNote,
  type TimeEntry,
  type TimeEntryId,
} from "../timesheet";

export type EditEntryNavigationState = {
  kind: "editEntry";
  id: string;
  day: string;
  noteHtml: string;
  logged: number;
  service: { id: string; name: string };
  task: { id: string; title: string } | null;
};

export type HomeReturn = { kind: "homeDay"; day: string };

export type EditEntryRoute =
  | { kind: "invalidId" }
  | { kind: "valid"; entryId: TimeEntryId; seed: TimeEntry | undefined };

export function editEntryPath(entryId: TimeEntryId): string {
  return `/edit/${encodeURIComponent(entryId)}`;
}

export function editEntryNavigationState(
  entry: TimeEntry,
): EditEntryNavigationState {
  return {
    kind: "editEntry",
    id: entry.id,
    day: entry.day,
    noteHtml: serializeEntryNote(entry.note),
    logged: entry.logged,
    service: { id: entry.service.id, name: entry.service.name },
    task: entry.task ? { id: entry.task.id, title: entry.task.title } : null,
  };
}

export function homeReturnState(day: CalendarDay): HomeReturn {
  return { kind: "homeDay", day };
}

export function parseHomeReturn(state: unknown): CalendarDay | undefined {
  if (!isRecord(state) || state.kind !== "homeDay") {
    return undefined;
  }
  if (typeof state.day !== "string") {
    return undefined;
  }
  return parseCalendarDay(state.day);
}

function parseEditEntrySeed(
  state: unknown,
  entryId: TimeEntryId,
): TimeEntry | undefined {
  if (!isRecord(state) || state.kind !== "editEntry") {
    return undefined;
  }
  if (typeof state.id !== "string" || state.id !== entryId) {
    return undefined;
  }
  if (typeof state.day !== "string" || typeof state.noteHtml !== "string") {
    return undefined;
  }
  const day = parseCalendarDay(state.day);
  const logged = parseMinutes(state.logged);
  if (!isRecord(state.service)) {
    return undefined;
  }
  if (
    typeof state.service.id !== "string" ||
    typeof state.service.name !== "string"
  ) {
    return undefined;
  }
  const serviceId = parseServiceId(state.service.id);
  if (!day || logged === undefined || !serviceId) {
    return undefined;
  }
  let task: TimeEntry["task"];
  if (state.task !== null) {
    if (!isRecord(state.task)) {
      return undefined;
    }
    if (
      typeof state.task.id !== "string" ||
      typeof state.task.title !== "string"
    ) {
      return undefined;
    }
    const taskId = parseTaskId(state.task.id);
    if (!taskId) {
      return undefined;
    }
    task = { id: taskId, title: state.task.title };
  }
  return {
    id: entryId,
    day,
    note: parseEntryNote(state.noteHtml),
    service: { id: serviceId, name: state.service.name },
    ...(task ? { task } : {}),
    logged,
  };
}

export function resolveEditEntryRoute(
  entryIdParam: string | undefined,
  locationState: unknown,
): EditEntryRoute {
  const entryId = parseTimeEntryId(entryIdParam ?? "");
  if (!entryId) {
    return { kind: "invalidId" };
  }
  return {
    kind: "valid",
    entryId,
    seed: parseEditEntrySeed(locationState, entryId),
  };
}
