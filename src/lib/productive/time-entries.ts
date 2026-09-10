import type { Credentials, PersonId } from "../auth/session.ts";
import { parseCalendarDay, type CalendarDay } from "../time/calendar-day.ts";
import { parseMinutes } from "../time/duration.ts";
import {
  parseServiceId,
  parseTaskId,
  parseTimeEntryId,
  parseTimerId,
  type RunningTimer,
  type ServiceId,
  type TimeEntry,
  type TimeEntryId,
  type TimesheetError,
} from "../timesheet/day-timesheet.ts";
import {
  parseEntryNote,
  serializeEntryNote,
  type EntryNote,
} from "../timesheet/entry-note.ts";
import { productiveBaseUrl } from "./authenticate.ts";
import {
  parseJsonApiDataList,
  parseJsonApiIncluded,
  parseJsonApiLinks,
  parseJsonApiResource,
  parseRelationshipId,
  productiveGet,
  productiveRequest,
  readNumberAttribute,
  readStringAttribute,
  readTimestampMs,
  uniqueJsonApiResource,
  type JsonApiResource,
} from "./json-api.ts";

function credentialsArgs(credentials: Credentials) {
  return {
    baseUrl: productiveBaseUrl(),
    organizationId: credentials.organizationId,
    accessToken: credentials.accessToken,
  };
}

function parseTask(
  resource: JsonApiResource,
  included: Map<string, JsonApiResource>,
): TimeEntry["task"] {
  const taskIdRaw = parseRelationshipId(resource, "task");
  if (!taskIdRaw) {
    return undefined;
  }
  const id = parseTaskId(taskIdRaw);
  if (!id) {
    return undefined;
  }
  const includedTask = included.get(`tasks:${id}`);
  return {
    id,
    title: includedTask
      ? readStringAttribute(includedTask.attributes, "title")
      : "",
  };
}

export function parseTimeEntry(
  resource: JsonApiResource,
  included: Map<string, JsonApiResource>,
): { entry: TimeEntry; running?: RunningTimer } | undefined {
  if (resource.type !== "time_entries") {
    return undefined;
  }
  const id = parseTimeEntryId(resource.id);
  const day = parseCalendarDay(
    readStringAttribute(resource.attributes, "date"),
  );
  const logged = parseMinutes(
    readNumberAttribute(resource.attributes, "time") ?? 0,
  );
  const serviceIdRaw = parseRelationshipId(resource, "service");
  const serviceId = serviceIdRaw ? parseServiceId(serviceIdRaw) : undefined;
  if (!id || !day || logged === undefined || !serviceId) {
    return undefined;
  }
  const includedService = included.get(`services:${serviceId}`);
  const task = parseTask(resource, included);
  const entry: TimeEntry = {
    id,
    day,
    note: parseEntryNote(readStringAttribute(resource.attributes, "note")),
    service: {
      id: serviceId,
      name: includedService
        ? readStringAttribute(includedService.attributes, "name")
        : "",
    },
    ...(task ? { task } : {}),
    logged,
  };
  const startedAt = readTimestampMs(resource.attributes, "timer_started_at");
  if (
    startedAt === undefined ||
    readTimestampMs(resource.attributes, "timer_stopped_at") !== undefined
  ) {
    return { entry };
  }
  const timerRel = parseRelationshipId(resource, "timer");
  const timerId = timerRel ? parseTimerId(timerRel) : undefined;
  if (!timerId) {
    return { entry };
  }
  return {
    entry,
    running: { timerId, entryId: id, day, startedAt },
  };
}

export function parseTimeEntriesPage(json: unknown): {
  rows: TimeEntry[];
  running: RunningTimer[];
  next: string | undefined;
} {
  const list = parseJsonApiDataList(json) ?? [];
  const included = parseJsonApiIncluded(json);
  const rows: TimeEntry[] = [];
  const running: RunningTimer[] = [];
  for (const item of list) {
    const resource = parseJsonApiResource(item);
    if (!resource) {
      continue;
    }
    const parsed = parseTimeEntry(resource, included);
    if (!parsed) {
      continue;
    }
    rows.push(parsed.entry);
    if (parsed.running) {
      running.push(parsed.running);
    }
  }
  return { rows, running, next: parseJsonApiLinks(json).next };
}

export function timeEntriesPagePath(args: {
  personId: PersonId;
  day: CalendarDay;
}): string {
  const person = encodeURIComponent(args.personId);
  const date = encodeURIComponent(args.day);
  return `/time_entries?filter[person_id]=${person}&filter[with_draft][eq]=true&filter[date][gt_eq]=${date}&filter[date][lt_eq]=${date}&include=service,task&page=1&per_page=200`;
}

export async function fetchTimeEntriesPage(args: {
  credentials: Credentials;
  personId: PersonId;
  day: CalendarDay;
  path?: string;
}): Promise<
  | {
      ok: true;
      rows: TimeEntry[];
      running: RunningTimer[];
      next: string | undefined;
    }
  | { ok: false; error: TimesheetError }
> {
  const result = await productiveGet({
    ...credentialsArgs(args.credentials),
    path: args.path ?? timeEntriesPagePath(args),
  });
  if (!result.ok) {
    return result;
  }
  return { ok: true, ...parseTimeEntriesPage(result.json) };
}

export async function fetchAllTimeEntries(args: {
  credentials: Credentials;
  personId: PersonId;
  day: CalendarDay;
}): Promise<
  { ok: true; rows: TimeEntry[] } | { ok: false; error: TimesheetError }
> {
  const rows: TimeEntry[] = [];
  let path: string | undefined = timeEntriesPagePath(args);
  while (path) {
    const page = await fetchTimeEntriesPage({ ...args, path });
    if (!page.ok) {
      return page;
    }
    rows.push(...page.rows);
    path = page.next;
  }
  return { ok: true, rows };
}

export async function createTimeEntry(args: {
  credentials: Credentials;
  personId: PersonId;
  day: CalendarDay;
  note: EntryNote;
  time: number;
  service: { id: ServiceId; name: string };
  task?: TimeEntry["task"];
}): Promise<
  { ok: true; entry: TimeEntry } | { ok: false; error: TimesheetError }
> {
  const relationships: Record<string, unknown> = {
    person: { data: { type: "people", id: args.personId } },
    service: { data: { type: "services", id: args.service.id } },
  };
  if (args.task) {
    relationships.task = { data: { type: "tasks", id: args.task.id } };
  }
  const result = await productiveRequest({
    ...credentialsArgs(args.credentials),
    path: "/time_entries?include=service,task",
    method: "POST",
    body: {
      data: {
        type: "time_entries",
        attributes: {
          note: serializeEntryNote(args.note),
          date: args.day,
          time: args.time,
        },
        relationships,
      },
    },
  });
  if (!result.ok) {
    return result;
  }
  const unique = uniqueJsonApiResource(result.json, "time_entries");
  if (!unique.ok) {
    return {
      ok: false,
      error: {
        kind: "invalid",
        message: "Productive returned a bad time entry.",
      },
    };
  }
  const included = parseJsonApiIncluded(result.json);
  if (!included.has(`services:${args.service.id}`)) {
    included.set(`services:${args.service.id}`, {
      id: args.service.id,
      type: "services",
      attributes: { name: args.service.name },
    });
  }
  const parsed = parseTimeEntry(unique.resource, included);
  if (!parsed) {
    return {
      ok: false,
      error: {
        kind: "invalid",
        message: "Productive returned a bad time entry.",
      },
    };
  }
  return { ok: true, entry: parsed.entry };
}

export async function deleteTimeEntry(args: {
  credentials: Credentials;
  entryId: TimeEntryId;
}): Promise<{ ok: true } | { ok: false; error: TimesheetError }> {
  const result = await productiveRequest({
    ...credentialsArgs(args.credentials),
    path: `/time_entries/${encodeURIComponent(args.entryId)}`,
    method: "DELETE",
  });
  if (result.ok) {
    return { ok: true };
  }
  if (result.status === 404) {
    return { ok: true };
  }
  if (result.status === 403) {
    return {
      ok: false,
      error: {
        kind: "rejected",
        message: "This time entry can't be deleted.",
      },
    };
  }
  return result;
}
