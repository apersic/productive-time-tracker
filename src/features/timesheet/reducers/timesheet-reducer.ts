import type { CalendarDay } from "../../../lib/time/calendar-day.ts";
import type { Minutes } from "../../../lib/time/duration.ts";
import {
  reconstructTimerSlot,
  type DayTimesheet,
  type EntriesState,
  type PageCursor,
  type RunningTimer,
  type TimeEntry,
  type TimeEntryId,
  type TimerSlot,
  type TimesheetFact,
} from "../timesheet-model.ts";

function factDay(fact: TimesheetFact): CalendarDay | undefined {
  switch (fact.kind) {
    case "daySelected":
    case "moreRequested":
    case "playRequested":
    case "stopRequested":
    case "timerStarted":
    case "timerStopped":
    case "timerFailed":
      return undefined;
    case "firstPageArrived":
    case "firstPageFailed":
    case "pageArrived":
    case "pageFailed":
    case "copyOfferResolved":
    case "copyOfferFailed":
    case "copyStarted":
    case "copyFailed":
    case "dayReloaded":
    case "entryCreated":
    case "entryRemoved":
    case "timerRecovered":
      return fact.day;
    default: {
      const _exhaustive: never = fact;
      return _exhaustive;
    }
  }
}

function pageFromNext(next: string | undefined): PageCursor {
  if (next === undefined) {
    return { kind: "complete" };
  }
  return { kind: "more", next };
}

function withLogged(
  entries: EntriesState,
  entryId: TimeEntryId,
  logged: Minutes,
): EntriesState {
  if (entries.status !== "ready") {
    return entries;
  }
  return {
    ...entries,
    rows: entries.rows.map((row) =>
      row.id === entryId ? { ...row, logged } : row,
    ),
  };
}

function applyDaySelected(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "daySelected" }>,
): DayTimesheet {
  if (fact.day === state.day) {
    return state;
  }
  return {
    day: fact.day,
    entries: { status: "loading" },
    timer: state.timer,
  };
}

function entriesFromPage(
  state: DayTimesheet,
  fact: {
    rows: readonly TimeEntry[];
    next: string | undefined;
    running: readonly RunningTimer[];
  },
): DayTimesheet {
  const timer = reconstructTimerSlot(fact.running, state.timer);
  if (fact.rows.length === 0) {
    return {
      ...state,
      timer,
      entries: { status: "empty", copy: { kind: "checking" } },
    };
  }
  return {
    ...state,
    timer,
    entries: {
      status: "ready",
      rows: fact.rows,
      page: pageFromNext(fact.next),
    },
  };
}

function applyFirstPageArrived(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "firstPageArrived" }>,
): DayTimesheet {
  if (state.entries.status !== "loading") {
    return state;
  }
  return entriesFromPage(state, fact);
}

function applyDayReloaded(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "dayReloaded" }>,
): DayTimesheet {
  return entriesFromPage(state, fact);
}

function applyPageArrived(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "pageArrived" }>,
): DayTimesheet {
  if (state.entries.status !== "ready") {
    return state;
  }
  const page = state.entries.page;
  if (page.kind !== "loadingMore" && page.kind !== "more") {
    return state;
  }
  return {
    ...state,
    timer: reconstructTimerSlot(fact.running, state.timer),
    entries: {
      status: "ready",
      rows: [...state.entries.rows, ...fact.rows],
      page: pageFromNext(fact.next),
    },
  };
}

function applyMoreRequested(state: DayTimesheet): DayTimesheet {
  if (state.entries.status !== "ready") {
    return state;
  }
  const page = state.entries.page;
  if (page.kind !== "more" && page.kind !== "moreFailed") {
    return state;
  }
  return {
    ...state,
    entries: {
      ...state.entries,
      page: { kind: "loadingMore", next: page.next },
    },
  };
}

function applyPageFailed(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "pageFailed" }>,
): DayTimesheet {
  if (state.entries.status !== "ready") {
    return state;
  }
  if (state.entries.page.kind !== "loadingMore") {
    return state;
  }
  return {
    ...state,
    entries: {
      ...state.entries,
      page: {
        kind: "moreFailed",
        next: state.entries.page.next,
        error: fact.error,
      },
    },
  };
}

function applyCopyOfferResolved(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "copyOfferResolved" }>,
): DayTimesheet {
  if (state.entries.status !== "empty") {
    return state;
  }
  if (state.entries.copy.kind !== "checking") {
    return state;
  }
  if (!fact.available) {
    return {
      ...state,
      entries: { status: "empty", copy: { kind: "unavailable" } },
    };
  }
  return {
    ...state,
    entries: {
      status: "empty",
      copy: { kind: "available", from: fact.from },
    },
  };
}

function applyCopyOfferFailed(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "copyOfferFailed" }>,
): DayTimesheet {
  if (state.entries.status !== "empty") {
    return state;
  }
  if (state.entries.copy.kind !== "checking") {
    return state;
  }
  return {
    ...state,
    entries: {
      status: "empty",
      copy: { kind: "failed", from: fact.from, error: fact.error },
    },
  };
}

function applyCopyStarted(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "copyStarted" }>,
): DayTimesheet {
  if (state.entries.status !== "empty") {
    return state;
  }
  const copy = state.entries.copy;
  switch (copy.kind) {
    case "available":
    case "failed":
      if (copy.from !== fact.from) {
        return state;
      }
      return {
        ...state,
        entries: {
          status: "empty",
          copy: { kind: "copying", from: copy.from },
        },
      };
    case "checking":
    case "unavailable":
    case "copying":
      return state;
    default: {
      const _exhaustive: never = copy;
      return _exhaustive;
    }
  }
}

function applyCopyFailed(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "copyFailed" }>,
): DayTimesheet {
  if (state.entries.status !== "empty") {
    return state;
  }
  if (state.entries.copy.kind !== "copying") {
    return state;
  }
  return {
    ...state,
    entries: {
      status: "empty",
      copy: { kind: "failed", from: fact.from, error: fact.error },
    },
  };
}

function timerAfterRemoved(slot: TimerSlot, entryId: TimeEntryId): TimerSlot {
  switch (slot.kind) {
    case "idle":
      return slot;
    case "starting":
    case "failed":
      return slot.entryId === entryId ? { kind: "idle" } : slot;
    case "running":
    case "stopping":
      return slot.timer.entryId === entryId ? { kind: "idle" } : slot;
    case "switching":
      return slot.from.entryId === entryId || slot.to === entryId
        ? { kind: "idle" }
        : slot;
    default: {
      const _exhaustive: never = slot;
      return _exhaustive;
    }
  }
}

function applyEntryRemoved(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "entryRemoved" }>,
): DayTimesheet {
  if (state.entries.status !== "ready") {
    return state;
  }
  if (!state.entries.rows.some((row) => row.id === fact.entryId)) {
    return state;
  }
  const rows = state.entries.rows.filter((row) => row.id !== fact.entryId);
  const timer = timerAfterRemoved(state.timer, fact.entryId);
  if (rows.length > 0) {
    return {
      ...state,
      timer,
      entries: {
        status: "ready",
        rows,
        page: state.entries.page,
      },
    };
  }
  switch (state.entries.page.kind) {
    case "complete":
      return {
        ...state,
        timer,
        entries: { status: "empty", copy: { kind: "unavailable" } },
      };
    case "more":
    case "loadingMore":
    case "moreFailed":
      return {
        ...state,
        timer,
        entries: { status: "loading" },
      };
    default: {
      const _exhaustive: never = state.entries.page;
      return _exhaustive;
    }
  }
}

function applyEntryCreated(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "entryCreated" }>,
): DayTimesheet {
  switch (state.entries.status) {
    case "empty":
    case "loading":
    case "failed":
      return {
        ...state,
        entries: {
          status: "ready",
          rows: [fact.entry],
          page: { kind: "complete" },
        },
      };
    case "ready":
      return {
        ...state,
        entries: {
          ...state.entries,
          rows: [fact.entry, ...state.entries.rows],
        },
      };
    default: {
      const _exhaustive: never = state.entries;
      return _exhaustive;
    }
  }
}

function applyPlayRequested(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "playRequested" }>,
): DayTimesheet {
  switch (state.timer.kind) {
    case "idle":
    case "failed":
      return {
        ...state,
        timer: { kind: "starting", entryId: fact.entryId },
      };
    case "running":
      if (state.timer.timer.entryId === fact.entryId) {
        return state;
      }
      return {
        ...state,
        timer: {
          kind: "switching",
          from: state.timer.timer,
          to: fact.entryId,
        },
      };
    case "starting":
    case "stopping":
    case "switching":
      return state;
    default: {
      const _exhaustive: never = state.timer;
      return _exhaustive;
    }
  }
}

function applyStopRequested(state: DayTimesheet): DayTimesheet {
  switch (state.timer.kind) {
    case "running":
      return {
        ...state,
        timer: { kind: "stopping", timer: state.timer.timer },
      };
    case "idle":
    case "starting":
    case "stopping":
    case "switching":
    case "failed":
      return state;
    default: {
      const _exhaustive: never = state.timer;
      return _exhaustive;
    }
  }
}

function applyTimerStarted(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "timerStarted" }>,
): DayTimesheet {
  switch (state.timer.kind) {
    case "starting":
      if (state.timer.entryId !== fact.timer.entryId) {
        return state;
      }
      return {
        ...state,
        timer: { kind: "running", timer: fact.timer },
      };
    case "switching":
      if (state.timer.to !== fact.timer.entryId) {
        return state;
      }
      return {
        ...state,
        timer: { kind: "running", timer: fact.timer },
      };
    case "idle":
    case "running":
    case "stopping":
    case "failed":
      return state;
    default: {
      const _exhaustive: never = state.timer;
      return _exhaustive;
    }
  }
}

function applyTimerStopped(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "timerStopped" }>,
): DayTimesheet {
  const entries = withLogged(state.entries, fact.entryId, fact.logged);
  switch (state.timer.kind) {
    case "switching":
      return {
        ...state,
        entries,
        timer: { kind: "starting", entryId: state.timer.to },
      };
    case "stopping":
    case "running":
      return { ...state, entries, timer: { kind: "idle" } };
    case "idle":
    case "starting":
    case "failed":
      return { ...state, entries };
    default: {
      const _exhaustive: never = state.timer;
      return _exhaustive;
    }
  }
}

function applyTimerFailed(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "timerFailed" }>,
): DayTimesheet {
  return {
    ...state,
    timer: {
      kind: "failed",
      entryId: fact.entryId,
      error: fact.error,
    },
  };
}

function applyTimerRecovered(
  state: DayTimesheet,
  fact: Extract<TimesheetFact, { kind: "timerRecovered" }>,
): DayTimesheet {
  if (!fact.timer) {
    switch (state.timer.kind) {
      case "starting":
      case "stopping":
      case "switching":
        return state;
      case "idle":
      case "running":
      case "failed":
        return { ...state, timer: { kind: "idle" } };
      default: {
        const _exhaustive: never = state.timer;
        return _exhaustive;
      }
    }
  }
  switch (state.timer.kind) {
    case "starting":
    case "stopping":
    case "switching":
      return state;
    case "idle":
    case "running":
    case "failed":
      return {
        ...state,
        timer: { kind: "running", timer: fact.timer },
      };
    default: {
      const _exhaustive: never = state.timer;
      return _exhaustive;
    }
  }
}

export function applyFact(
  state: DayTimesheet,
  fact: TimesheetFact,
): DayTimesheet {
  const day = factDay(fact);
  if (day !== undefined && day !== state.day) {
    return state;
  }
  switch (fact.kind) {
    case "daySelected":
      return applyDaySelected(state, fact);
    case "firstPageArrived":
      return applyFirstPageArrived(state, fact);
    case "firstPageFailed":
      return {
        ...state,
        entries: { status: "failed", error: fact.error },
      };
    case "moreRequested":
      return applyMoreRequested(state);
    case "pageArrived":
      return applyPageArrived(state, fact);
    case "pageFailed":
      return applyPageFailed(state, fact);
    case "copyOfferResolved":
      return applyCopyOfferResolved(state, fact);
    case "copyOfferFailed":
      return applyCopyOfferFailed(state, fact);
    case "copyStarted":
      return applyCopyStarted(state, fact);
    case "copyFailed":
      return applyCopyFailed(state, fact);
    case "dayReloaded":
      return applyDayReloaded(state, fact);
    case "entryCreated":
      return applyEntryCreated(state, fact);
    case "entryRemoved":
      return applyEntryRemoved(state, fact);
    case "playRequested":
      return applyPlayRequested(state, fact);
    case "stopRequested":
      return applyStopRequested(state);
    case "timerStarted":
      return applyTimerStarted(state, fact);
    case "timerStopped":
      return applyTimerStopped(state, fact);
    case "timerFailed":
      return applyTimerFailed(state, fact);
    case "timerRecovered":
      return applyTimerRecovered(state, fact);
    default: {
      const _exhaustive: never = fact;
      return _exhaustive;
    }
  }
}
