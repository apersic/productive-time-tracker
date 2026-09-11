import { durationFieldIssue, type FieldIssue } from "../../lib/forms";
import type {
  ServicesList,
  TrackableService,
} from "../../providers/productive/services-service.ts";
import {
  formatHhMm,
  parseDurationDraft,
  type Minutes,
} from "../../lib/time/duration.ts";
import type { TimeEntry } from "./timesheet-model.ts";
import { emptyNote, type EntryNote } from "./entry-note.ts";

export type EntryFields = {
  duration: string;
  service: TrackableService | undefined;
  note: EntryNote;
};

export type EntryDraft = {
  note: EntryNote;
  logged: Minutes;
  service: TrackableService;
};

export type EntryDraftResult =
  | { ok: true; draft: EntryDraft }
  | { ok: false; issues: { duration?: FieldIssue; service?: FieldIssue } };

export function blankEntryFields(): EntryFields {
  return {
    duration: "",
    service: undefined,
    note: emptyNote,
  };
}

export function entryFieldsFrom(entry: TimeEntry): EntryFields {
  return {
    duration: formatHhMm(entry.logged),
    service: entry.service,
    note: entry.note,
  };
}

function listedServices(services: ServicesList): readonly TrackableService[] {
  switch (services.status) {
    case "one":
      return [services.service];
    case "many":
      return services.services;
    case "loading":
    case "failed":
    case "none":
      return [];
    default: {
      const _exhaustive: never = services;
      return _exhaustive;
    }
  }
}

export function entryServiceOptions(args: {
  services: ServicesList;
  pinned: TrackableService | undefined;
}): readonly TrackableService[] {
  const listed = listedServices(args.services);
  const pinned = args.pinned;
  if (!pinned) {
    return listed;
  }
  if (listed.some((service) => service.id === pinned.id)) {
    return listed;
  }
  return [...listed, pinned];
}

function resolvedService(args: {
  fields: EntryFields;
  services: ServicesList;
}): TrackableService | undefined {
  if (args.fields.service) {
    return args.fields.service;
  }
  switch (args.services.status) {
    case "one":
      return args.services.service;
    case "many":
    case "loading":
    case "failed":
    case "none":
      return undefined;
    default: {
      const _exhaustive: never = args.services;
      return _exhaustive;
    }
  }
}

export function parseEntryDraft(args: {
  fields: EntryFields;
  services: ServicesList;
}): EntryDraftResult {
  const durationDraft = parseDurationDraft(args.fields.duration);
  const durationIssue = durationFieldIssue(durationDraft);
  const service = resolvedService(args);
  if (
    durationDraft.kind !== "ready" ||
    durationIssue !== undefined ||
    !service
  ) {
    return {
      ok: false,
      issues: {
        ...(durationIssue ? { duration: durationIssue } : {}),
        ...(!service ? { service: "blank" } : {}),
      },
    };
  }
  return {
    ok: true,
    draft: {
      note: args.fields.note,
      logged: durationDraft.minutes,
      service,
    },
  };
}
