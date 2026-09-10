import type { DurationDraft } from "../time/duration.ts";

export type FieldIssue = "blank" | "tooLong";

export function fieldIssueMessage(issue: FieldIssue): string {
  switch (issue) {
    case "blank":
      return "Can't be blank";
    case "tooLong":
      return "Must be less than 24 hours";
    default: {
      const _exhaustive: never = issue;
      return _exhaustive;
    }
  }
}

export function presenceIssue(
  value: string,
): Extract<FieldIssue, "blank"> | undefined {
  if (value.trim().length === 0) {
    return "blank";
  }
  return undefined;
}

export function durationFieldIssue(
  draft: DurationDraft,
): FieldIssue | undefined {
  switch (draft.kind) {
    case "empty":
    case "invalid":
      return "blank";
    case "tooLong":
      return "tooLong";
    case "ready":
      return undefined;
    default: {
      const _exhaustive: never = draft;
      return _exhaustive;
    }
  }
}
