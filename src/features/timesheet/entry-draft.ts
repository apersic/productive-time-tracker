import { durationFieldIssue, type FieldIssue } from "../../lib/forms";
import {
  formatHhMm,
  parseDurationDraft,
  type Minutes,
} from "../../lib/time/duration.ts";
import type { TimeEntry } from "./timesheet-model.ts";
import { emptyNote, type EntryNote } from "./entry-note.ts";
import type { ServicesList, TrackableService } from "./service-catalog.ts";

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

function resolvedService(args: {
  fields: EntryFields;
  availability: ServicesList;
}): TrackableService | undefined {
  if (args.fields.service) {
    return args.fields.service;
  }
  switch (args.availability.status) {
    case "one":
      return args.availability.service;
    case "many":
    case "loading":
    case "failed":
    case "none":
      return undefined;
    default: {
      const _exhaustive: never = args.availability;
      return _exhaustive;
    }
  }
}

export function parseEntryDraft(args: {
  fields: EntryFields;
  availability: ServicesList;
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
