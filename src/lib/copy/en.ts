import type { PageId } from "../document/page.ts";
import type { FieldIssue } from "../forms/field-issue.ts";
import type { CalendarDay } from "../time/calendar-day.ts";
import type { AuthError } from "../auth/session.ts";
import type { TimesheetError } from "../../features/timesheet/timesheet-model.ts";
import { createFormatters } from "./formatters.ts";

const fmt = createFormatters("en", ["one", "other"] as const);

type NoticeKind =
  | "entryCreated"
  | "dayCopied"
  | "dayCopiedPartial"
  | "timerFailed"
  | "recoverTimerFailed"
  | "entryDeleted"
  | "entryDeleteFailed"
  | "entryUpdated"
  | "entryUpdateFailed"
  | "copyDayFailed"
  | "sessionExpired";

type NoticeText = string | ((from: CalendarDay) => string);

export const en = {
  dayLabel: (day: CalendarDay) => fmt.dayLabel(day),

  language: {
    pickerLabel: "Language",
  },

  page: {
    login: "Log in",
    home: "Home",
    editEntry: "Edit time entry",
  } satisfies Record<PageId, string>,

  document: {
    skipToContent: "Skip to content",
    loading: "Loading…",
  },

  login: {
    intro: "Enter your Productive API token and organization ID.",
    organizationLabel: "Organization ID",
    organizationPlaceholder: "12345…",
    tokenLabel: "API token",
    tokenPlaceholder: "Paste your token…",
    showToken: "Show token",
    hideToken: "Hide token",
    missingFields: "Enter an API token and an organization ID.",
    submit: "Log in",
    loading: "Loading…",
  },

  header: {
    logOut: "Log out",
  },

  home: {
    listLoading: (day: CalendarDay) =>
      `Loading time entries for ${fmt.dayLabel(day)}`,
    listEmpty: (day: CalendarDay) => `No tracked time for ${fmt.dayLabel(day)}`,
    listReady: (args: { count: number; day: CalendarDay }) =>
      `${fmt.plural(args.count, {
        one: `${fmt.count(args.count)} time entry`,
        other: `${fmt.count(args.count)} time entries`,
      })} for ${fmt.dayLabel(args.day)}`,
    emptyHeading: (day: CalendarDay) =>
      `There's no tracked time for ${fmt.dayLabel(day)}`,
    emptyHint: "Add a time entry to start this day.",
    copyPreviousDay: "Copy tasks from previous day",
    loadingEntries: "Loading time entries",
    loadingMore: "Loading more entries",
    newEntry: "New time entry",
    createNav: "Create time entry",
    region: "Time entries",
    regionFor: (day: CalendarDay) => `Time entries for ${fmt.dayLabel(day)}`,
    moreActions: (title: string) => `More actions for ${title}`,
    edit: "Edit",
    delete: "Delete",
    deleteTitle: "Delete this time entry?",
    deleteConfirm: "Delete entry",
    cancel: "Cancel",
    retry: "Retry",
    startTimer: (title: string) => `Start timer for ${title}`,
    stopTimer: (title: string) => `Stop timer for ${title}`,
  },

  form: {
    date: "Date",
    day: "Day",
    duration: "Duration",
    description: "Description",
    durationHint: "Minutes or hh:mm, like 90 or 1:30",
    durationPlaceholder: "Time",
    notePlaceholder: "Enter a description",
    noteHelper: "Enter a description",
    previousDay: "Previous day",
    today: "Today",
    nextDay: "Next day",
    openCalendar: "Open calendar",
    fixHighlighted: "Fix the highlighted fields.",
    loadingServices: "Loading services",
    loadingEntries: "Loading time entries",
    addEntry: "Add entry",
    close: "Close",
    noTrackableServices: "No services are available for time tracking.",
  },

  service: {
    label: "Service",
    select: "Select a service",
    search: "Search services",
    current: "Current service",
    loading: "Loading services",
    none: "No services",
    noMatches: "No matching services",
  },

  edit: {
    save: "Save changes",
    notFound: "This time entry was not found.",
    backHome: "Back to home",
    discardTitle: "Discard unsaved changes?",
    discardBody: "Your edits will be lost if you leave this page.",
    keepEditing: "Keep editing",
    discard: "Discard",
    loading: "Loading time entry",
  },

  notice: {
    entryCreated: "Time entry added",
    dayCopied: (from: CalendarDay) =>
      `Copied entries from ${fmt.dayLabel(from)}`,
    dayCopiedPartial: (from: CalendarDay) =>
      `Copied some entries from ${fmt.dayLabel(from)}`,
    dayCopiedPartialDetail: "Productive rejected the rest.",
    timerFailed: "Couldn't update the timer",
    recoverTimerFailed: "Couldn't refresh the timer",
    entryDeleted: "Time entry deleted",
    entryDeleteFailed: "Couldn't delete the time entry",
    entryUpdated: "Time entry updated",
    entryUpdateFailed: "Couldn't update the time entry",
    copyDayFailed: "Couldn't copy the previous day",
    sessionExpired: "Your session expired. Log in again.",
  } satisfies Record<NoticeKind | "dayCopiedPartialDetail", NoticeText>,

  fieldIssue: {
    blank: "Can't be blank",
    tooLong: "Must be less than 24 hours",
  } satisfies Record<FieldIssue, string>,

  failure: {
    unreachable: "Could not reach Productive.",
    badCredentials: "Invalid token or organization ID.",
    sessionRejected: "Your session is no longer valid.",
    requestRejected: "Productive rejected the request.",
    badResponse: "Productive returned a bad response.",
    manyUsers: "Productive returned more than one user.",
    noUser: "Could not load the current user.",
    noUserEmail: "The current user has no email.",
    manyPeople: "Productive returned more than one person.",
    noPerson: "Could not load the current person.",
    badTimeEntry: "Productive returned a bad time entry.",
    badTimer: "Productive returned a bad timer.",
    timerAlreadyStopped: "This timer was already stopped.",
    entryNotUpdatable: "This time entry can't be updated.",
    entryGone: "This time entry no longer exists.",
    entryNotDeletable: "This time entry can't be deleted.",
    dayStillLoading: "Wait until the day finishes loading.",
    dayChangedWhileSaving: "The day changed while this entry was saving.",
    dayChangedWhileDeleting: "The day changed while this entry was deleting.",
  } satisfies Record<TimesheetError, string>,
};

export type Copy = typeof en;

const _authFailures: Record<AuthError, string> = en.failure;
void _authFailures;
