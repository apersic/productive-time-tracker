import { useCallback, useEffect, useRef, useState } from "react";
import type { Credentials, Person } from "../../lib/auth/session.ts";
import {
  fetchAllTimeEntries,
  fetchTimeEntriesPage,
  createTimeEntry,
} from "../../lib/productive/time-entries.ts";
import {
  fetchTrackableServices,
  type ServicesList,
} from "../../lib/productive/services.ts";
import {
  fetchRunningTimer,
  startTimer,
  stopTimer,
} from "../../lib/productive/timers.ts";
import {
  alreadyCopied,
  applyFact,
  displayedMinutes,
  initialDayTimesheet,
  runningTimerFromSlot,
  type DayTimesheet,
  type ServiceId,
  type TimeEntry,
  type TimeEntryId,
  type TimesheetError,
  type TimesheetFact,
} from "../../lib/timesheet/day-timesheet.ts";
import type { EntryNote } from "../../lib/timesheet/entry-note.ts";
import {
  previousCalendarDay,
  todayLocal,
  type CalendarDay,
} from "../../lib/time/calendar-day.ts";
import { parseMinutes, type Minutes } from "../../lib/time/duration.ts";

const parsedZeroMinutes = parseMinutes(0);
if (parsedZeroMinutes === undefined) {
  throw new Error("parseMinutes(0) must succeed");
}
const ZERO_MINUTES: Minutes = parsedZeroMinutes;

function loggedAtStop(
  state: DayTimesheet,
  entryId: TimeEntryId,
  now: number,
): Minutes {
  if (state.entries.status !== "ready") {
    return ZERO_MINUTES;
  }
  const row = state.entries.rows.find((item) => item.id === entryId);
  if (!row) {
    return ZERO_MINUTES;
  }
  return displayedMinutes({
    logged: row.logged,
    entryId,
    timer: state.timer,
    now,
  });
}

function dayForEntry(state: DayTimesheet, entryId: TimeEntryId): CalendarDay {
  if (state.entries.status === "ready") {
    const row = state.entries.rows.find((item) => item.id === entryId);
    if (row) {
      return row.day;
    }
  }
  const running = runningTimerFromSlot(state.timer);
  if (running && running.entryId === entryId) {
    return running.day;
  }
  return state.day;
}

export function useDayTimesheet(args: {
  credentials: Credentials;
  person: Person;
  logout: () => void;
}) {
  const [timesheet, setTimesheet] = useState<DayTimesheet>(() =>
    initialDayTimesheet(todayLocal()),
  );
  const [services, setServices] = useState<ServicesList>({ status: "loading" });
  const [now, setNow] = useState(() => Date.now());
  const timesheetRef = useRef(timesheet);
  const argsRef = useRef(args);

  useEffect(() => {
    timesheetRef.current = timesheet;
  }, [timesheet]);

  useEffect(() => {
    argsRef.current = args;
  }, [args]);

  const commit = useCallback((fact: TimesheetFact): DayTimesheet => {
    const next = applyFact(timesheetRef.current, fact);
    if (next !== timesheetRef.current) {
      timesheetRef.current = next;
      setTimesheet(next);
    }
    return next;
  }, []);

  const onError = useCallback((error: TimesheetError): boolean => {
    if (error.kind === "unauthorized") {
      argsRef.current.logout();
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const ticking =
      timesheet.timer.kind === "running" ||
      timesheet.timer.kind === "stopping" ||
      timesheet.timer.kind === "switching";
    if (!ticking) {
      return;
    }
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [timesheet.timer.kind]);

  useEffect(() => {
    let cancelled = false;
    const { credentials, person } = argsRef.current;
    void fetchTrackableServices({
      credentials,
      personId: person.id,
    }).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        if (result.error.kind === "unauthorized") {
          argsRef.current.logout();
          return;
        }
        setServices({ status: "failed", error: result.error });
        return;
      }
      setServices(result.list);
    });
    return () => {
      cancelled = true;
    };
  }, [
    args.person.id,
    args.credentials.accessToken,
    args.credentials.organizationId,
  ]);

  useEffect(() => {
    let cancelled = false;
    const day = timesheet.day;
    const { credentials, person } = argsRef.current;

    async function load() {
      const from = previousCalendarDay(day);
      const [page, recovered, previous] = await Promise.all([
        fetchTimeEntriesPage({
          credentials,
          personId: person.id,
          day,
        }),
        fetchRunningTimer({
          credentials,
          personId: person.id,
          fallbackDay: day,
        }),
        fetchTimeEntriesPage({
          credentials,
          personId: person.id,
          day: from,
        }),
      ]);
      if (cancelled) {
        return;
      }
      if (!page.ok) {
        if (onError(page.error)) {
          return;
        }
        commit({ kind: "firstPageFailed", day, error: page.error });
        return;
      }
      commit({
        kind: "firstPageArrived",
        day,
        rows: page.rows,
        next: page.next,
        running: page.running,
      });

      if (!recovered.ok) {
        onError(recovered.error);
      } else {
        commit({ kind: "timerRecovered", day, timer: recovered.timer });
      }

      const after = timesheetRef.current;
      if (
        after.entries.status !== "empty" ||
        after.entries.copy.kind !== "checking"
      ) {
        return;
      }
      if (!previous.ok) {
        if (onError(previous.error)) {
          return;
        }
        commit({
          kind: "copyOfferFailed",
          day,
          from,
          error: previous.error,
        });
        return;
      }
      commit({
        kind: "copyOfferResolved",
        day,
        from,
        available: previous.rows.length > 0,
      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [timesheet.day, commit, onError]);

  const selectDay = useCallback(
    (day: CalendarDay) => {
      commit({ kind: "daySelected", day });
    },
    [commit],
  );

  const loadMore = useCallback(() => {
    const current = timesheetRef.current;
    if (current.entries.status !== "ready") {
      return;
    }
    if (
      current.entries.page.kind !== "more" &&
      current.entries.page.kind !== "moreFailed"
    ) {
      return;
    }
    const next = current.entries.page.next;
    const day = current.day;
    const after = commit({ kind: "moreRequested" });
    if (
      after.entries.status !== "ready" ||
      after.entries.page.kind !== "loadingMore"
    ) {
      return;
    }
    const { credentials, person } = argsRef.current;
    void fetchTimeEntriesPage({
      credentials,
      personId: person.id,
      day,
      path: next,
    }).then((page) => {
      if (timesheetRef.current.day !== day) {
        return;
      }
      if (!page.ok) {
        if (onError(page.error)) {
          return;
        }
        commit({ kind: "pageFailed", day, error: page.error });
        return;
      }
      commit({
        kind: "pageArrived",
        day,
        rows: page.rows,
        next: page.next,
        running: page.running,
      });
    });
  }, [commit, onError]);

  const play = useCallback(
    (entryId: TimeEntryId) => {
      const current = timesheetRef.current;
      const next = commit({ kind: "playRequested", entryId });
      if (next.timer === current.timer) {
        return;
      }
      const { credentials } = argsRef.current;
      switch (next.timer.kind) {
        case "starting": {
          void startTimer({
            credentials,
            entryId,
            day: dayForEntry(next, entryId),
          }).then((result) => {
            if (!result.ok) {
              if (onError(result.error)) {
                return;
              }
              commit({ kind: "timerFailed", entryId, error: result.error });
              return;
            }
            commit({ kind: "timerStarted", timer: result.timer });
          });
          return;
        }
        case "switching": {
          const from = next.timer.from;
          void (async () => {
            const stopped = await stopTimer({
              credentials,
              timerId: from.timerId,
            });
            if (!stopped.ok && stopped.error.kind !== "rejected") {
              if (onError(stopped.error)) {
                return;
              }
              commit({
                kind: "timerFailed",
                entryId: from.entryId,
                error: stopped.error,
              });
              return;
            }
            commit({
              kind: "timerStopped",
              entryId: from.entryId,
              logged: loggedAtStop(
                timesheetRef.current,
                from.entryId,
                Date.now(),
              ),
            });
            const started = await startTimer({
              credentials,
              entryId,
              day: dayForEntry(timesheetRef.current, entryId),
            });
            if (!started.ok) {
              if (onError(started.error)) {
                return;
              }
              commit({ kind: "timerFailed", entryId, error: started.error });
              return;
            }
            commit({ kind: "timerStarted", timer: started.timer });
          })();
          return;
        }
        case "idle":
        case "running":
        case "stopping":
        case "failed":
          return;
        default: {
          const _exhaustive: never = next.timer;
          return _exhaustive;
        }
      }
    },
    [commit, onError],
  );

  const pause = useCallback(() => {
    const current = timesheetRef.current;
    const next = commit({ kind: "stopRequested" });
    if (next.timer.kind !== "stopping") {
      return;
    }
    const timer = next.timer.timer;
    const { credentials } = argsRef.current;
    void stopTimer({ credentials, timerId: timer.timerId }).then(
      async (result) => {
        if (!result.ok && result.error.kind !== "rejected") {
          if (onError(result.error)) {
            return;
          }
          commit({
            kind: "timerFailed",
            entryId: timer.entryId,
            error: result.error,
          });
          return;
        }
        if (!result.ok && result.error.kind === "rejected") {
          const { credentials: creds, person } = argsRef.current;
          const day = current.day;
          const [page, recovered] = await Promise.all([
            fetchTimeEntriesPage({
              credentials: creds,
              personId: person.id,
              day,
            }),
            fetchRunningTimer({
              credentials: creds,
              personId: person.id,
              fallbackDay: day,
            }),
          ]);
          const storedRow =
            current.entries.status === "ready"
              ? current.entries.rows.find((item) => item.id === timer.entryId)
              : undefined;
          const logged = page.ok
            ? (page.rows.find((item) => item.id === timer.entryId)?.logged ??
              storedRow?.logged ??
              ZERO_MINUTES)
            : (storedRow?.logged ?? ZERO_MINUTES);
          commit({
            kind: "timerStopped",
            entryId: timer.entryId,
            logged,
          });
          if (page.ok) {
            if (timesheetRef.current.day === day) {
              commit({
                kind: "dayReloaded",
                day,
                rows: page.rows,
                next: page.next,
                running: page.running,
              });
            }
          } else {
            onError(page.error);
          }
          if (!recovered.ok) {
            onError(recovered.error);
            return;
          }
          commit({
            kind: "timerRecovered",
            day: timesheetRef.current.day,
            timer: recovered.timer,
          });
          return;
        }
        commit({
          kind: "timerStopped",
          entryId: timer.entryId,
          logged: loggedAtStop(current, timer.entryId, Date.now()),
        });
      },
    );
  }, [commit, onError]);

  const addEntry = useCallback(
    async (input: {
      note: EntryNote;
      logged: Minutes;
      service: { id: ServiceId; name: string };
      task?: TimeEntry["task"];
    }): Promise<{ ok: true } | { ok: false; error: TimesheetError }> => {
      const { credentials, person } = argsRef.current;
      const day = timesheetRef.current.day;
      if (timesheetRef.current.entries.status === "loading") {
        return {
          ok: false,
          error: {
            kind: "rejected",
            message: "Wait until the day finishes loading.",
          },
        };
      }
      const result = await createTimeEntry({
        credentials,
        personId: person.id,
        day,
        note: input.note,
        time: input.logged,
        service: input.service,
        task: input.task,
      });
      if (!result.ok) {
        onError(result.error);
        return result;
      }
      if (timesheetRef.current.day !== day) {
        return {
          ok: false,
          error: {
            kind: "rejected",
            message: "The day changed while this entry was saving.",
          },
        };
      }
      commit({ kind: "entryCreated", day, entry: result.entry });
      return { ok: true };
    },
    [commit, onError],
  );

  const copyPreviousDay = useCallback(() => {
    const current = timesheetRef.current;
    if (current.entries.status !== "empty") {
      return;
    }
    const copy = current.entries.copy;
    if (copy.kind !== "available" && copy.kind !== "failed") {
      return;
    }
    const from = copy.from;
    const day = current.day;
    const next = commit({ kind: "copyStarted", day, from });
    if (
      next.entries.status !== "empty" ||
      next.entries.copy.kind !== "copying"
    ) {
      return;
    }
    const { credentials, person } = argsRef.current;
    void (async () => {
      const source = await fetchAllTimeEntries({
        credentials,
        personId: person.id,
        day: from,
      });
      if (!source.ok) {
        if (onError(source.error)) {
          return;
        }
        commit({ kind: "copyFailed", day, from, error: source.error });
        return;
      }
      const existingResult = await fetchAllTimeEntries({
        credentials,
        personId: person.id,
        day,
      });
      if (!existingResult.ok) {
        if (onError(existingResult.error)) {
          return;
        }
        commit({ kind: "copyFailed", day, from, error: existingResult.error });
        return;
      }
      let existing = existingResult.rows;
      for (const row of source.rows) {
        if (alreadyCopied({ source: row, existing })) {
          continue;
        }
        const created = await createTimeEntry({
          credentials,
          personId: person.id,
          day,
          note: row.note,
          time: row.logged,
          service: row.service,
          task: row.task,
        });
        if (!created.ok) {
          if (onError(created.error)) {
            return;
          }
          const reloaded = await fetchTimeEntriesPage({
            credentials,
            personId: person.id,
            day,
          });
          if (timesheetRef.current.day !== day) {
            return;
          }
          if (reloaded.ok && reloaded.rows.length > 0) {
            commit({
              kind: "dayReloaded",
              day,
              rows: reloaded.rows,
              next: reloaded.next,
              running: reloaded.running,
            });
            return;
          }
          commit({ kind: "copyFailed", day, from, error: created.error });
          return;
        }
        existing = [...existing, created.entry];
      }
      const reloaded = await fetchTimeEntriesPage({
        credentials,
        personId: person.id,
        day,
      });
      if (!reloaded.ok) {
        if (onError(reloaded.error)) {
          return;
        }
        commit({ kind: "firstPageFailed", day, error: reloaded.error });
        return;
      }
      commit({
        kind: "dayReloaded",
        day,
        rows: reloaded.rows,
        next: reloaded.next,
        running: reloaded.running,
      });
    })();
  }, [commit, onError]);

  return {
    timesheet,
    now,
    services,
    selectDay,
    loadMore,
    play,
    pause,
    addEntry,
    copyPreviousDay,
  };
}
