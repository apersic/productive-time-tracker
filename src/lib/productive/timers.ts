import type { Credentials, PersonId } from "../auth/session.ts";
import { parseCalendarDay, type CalendarDay } from "../time/calendar-day.ts";
import {
  parseTimeEntryId,
  parseTimerId,
  reconstructTimerSlot,
  type RunningTimer,
  type TimeEntryId,
  type TimerId,
  type TimesheetError,
} from "../timesheet/day-timesheet.ts";
import { productiveBaseUrl } from "./authenticate.ts";
import {
  parseJsonApiDataList,
  parseJsonApiIncluded,
  parseJsonApiResource,
  parseRelationshipId,
  productiveGet,
  productiveRequest,
  readNumberAttribute,
  readStringAttribute,
  readTimestampMs,
  uniqueJsonApiResource,
} from "./json-api.ts";

function credentialsArgs(credentials: Credentials) {
  return {
    baseUrl: productiveBaseUrl(),
    organizationId: credentials.organizationId,
    accessToken: credentials.accessToken,
  };
}

function relationshipOrAttributeId(
  resource: { attributes: Record<string, unknown>; relationships?: unknown },
  relationship: string,
  attribute: string,
): string | undefined {
  const fromRel = parseRelationshipId(resource, relationship);
  if (fromRel) {
    return fromRel;
  }
  const numeric = readNumberAttribute(resource.attributes, attribute);
  if (numeric !== undefined) {
    return String(numeric);
  }
  const asString = resource.attributes[attribute];
  return typeof asString === "string" && asString.length > 0
    ? asString
    : undefined;
}

export function parseRunningTimer(
  json: unknown,
  fallback: { entryId: TimeEntryId; day: CalendarDay },
): RunningTimer | undefined {
  const unique = uniqueJsonApiResource(json, "timers");
  if (!unique.ok) {
    return undefined;
  }
  const timerId = parseTimerId(unique.resource.id);
  if (!timerId) {
    return undefined;
  }
  const startedAt =
    readTimestampMs(unique.resource.attributes, "started_at") ?? Date.now();
  const entryRel = relationshipOrAttributeId(
    unique.resource,
    "time_entry",
    "time_entry_id",
  );
  const entryId = entryRel ? parseTimeEntryId(entryRel) : fallback.entryId;
  if (!entryId) {
    return undefined;
  }
  return {
    timerId,
    entryId,
    day: fallback.day,
    startedAt,
  };
}

export function parseRunningTimerFromList(
  json: unknown,
  fallbackDay: CalendarDay,
): RunningTimer | undefined {
  const list = parseJsonApiDataList(json) ?? [];
  const included = parseJsonApiIncluded(json);
  const running: RunningTimer[] = [];
  for (const item of list) {
    const resource = parseJsonApiResource(item);
    if (!resource || resource.type !== "timers") {
      continue;
    }
    if (readTimestampMs(resource.attributes, "stopped_at") !== undefined) {
      continue;
    }
    const timerId = parseTimerId(resource.id);
    const startedAt = readTimestampMs(resource.attributes, "started_at");
    const entryRel = relationshipOrAttributeId(
      resource,
      "time_entry",
      "time_entry_id",
    );
    const entryId = entryRel ? parseTimeEntryId(entryRel) : undefined;
    if (!timerId || startedAt === undefined || !entryId) {
      continue;
    }
    const includedEntry = included.get(`time_entries:${entryId}`);
    const day = includedEntry
      ? parseCalendarDay(readStringAttribute(includedEntry.attributes, "date"))
      : fallbackDay;
    if (!day) {
      continue;
    }
    running.push({ timerId, entryId, day, startedAt });
  }
  const slot = reconstructTimerSlot(running, { kind: "idle" });
  return slot.kind === "running" ? slot.timer : undefined;
}

export async function startTimer(args: {
  credentials: Credentials;
  entryId: TimeEntryId;
  day: CalendarDay;
}): Promise<
  { ok: true; timer: RunningTimer } | { ok: false; error: TimesheetError }
> {
  const result = await productiveRequest({
    ...credentialsArgs(args.credentials),
    path: "/timers",
    method: "POST",
    body: {
      data: {
        type: "timers",
        attributes: {},
        relationships: {
          time_entry: {
            data: { type: "time_entries", id: args.entryId },
          },
        },
      },
    },
  });
  if (!result.ok) {
    return result;
  }
  const timer = parseRunningTimer(result.json, {
    entryId: args.entryId,
    day: args.day,
  });
  if (!timer) {
    return {
      ok: false,
      error: {
        kind: "invalid",
        message: "Productive returned a bad timer.",
      },
    };
  }
  return { ok: true, timer };
}

export async function stopTimer(args: {
  credentials: Credentials;
  timerId: TimerId;
}): Promise<{ ok: true } | { ok: false; error: TimesheetError }> {
  const result = await productiveRequest({
    ...credentialsArgs(args.credentials),
    path: `/timers/${encodeURIComponent(args.timerId)}/stop`,
    method: "PATCH",
    body: {
      data: {
        type: "timers",
        id: args.timerId,
      },
    },
  });
  if (result.ok) {
    return { ok: true };
  }
  if (result.status === 404 || result.status === 409 || result.status === 422) {
    return {
      ok: false,
      error: {
        kind: "rejected",
        message: "This timer was already stopped.",
      },
    };
  }
  return result;
}

export async function fetchRunningTimer(args: {
  credentials: Credentials;
  personId: PersonId;
  fallbackDay: CalendarDay;
}): Promise<
  | { ok: true; timer: RunningTimer | undefined }
  | { ok: false; error: TimesheetError }
> {
  const person = encodeURIComponent(args.personId);
  const result = await productiveGet({
    ...credentialsArgs(args.credentials),
    path: `/timers?filter[person_id]=${person}&include=time_entry`,
  });
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    timer: parseRunningTimerFromList(result.json, args.fallbackDay),
  };
}
