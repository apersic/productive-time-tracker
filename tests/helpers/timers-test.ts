import QUnit from "qunit";
import { parseAccessToken, parseOrganizationId } from "../../src/lib/auth";
import {
  parseRunningTimerFromList,
  stopTimer,
} from "../../src/providers/productive";
import { parseCalendarDay } from "../../src/lib/time";
import { parseTimeEntryId, parseTimerId } from "../../src/features/timesheet";

function credentials() {
  const organizationId = parseOrganizationId("61648");
  const accessToken = parseAccessToken("token-value");
  if (!organizationId || !accessToken) {
    throw new Error("invalid credentials");
  }
  return { organizationId, accessToken };
}

function timerId(value: string) {
  const parsed = parseTimerId(value);
  if (!parsed) {
    throw new Error(`invalid timer id ${value}`);
  }
  return parsed;
}

function entryId(value: string) {
  const parsed = parseTimeEntryId(value);
  if (!parsed) {
    throw new Error(`invalid entry id ${value}`);
  }
  return parsed;
}

function day(value: string) {
  const parsed = parseCalendarDay(value);
  if (!parsed) {
    throw new Error(`invalid day ${value}`);
  }
  return parsed;
}

QUnit.module("parseRunningTimerFromList");

QUnit.test(
  "one running timer reads id, entry, day, and startedAt",
  (assert) => {
    const startedAt = Date.parse("2026-09-10T12:00:00.000Z");
    assert.deepEqual(
      parseRunningTimerFromList(
        {
          data: [
            {
              id: "t1",
              type: "timers",
              attributes: {
                started_at: "2026-09-10T12:00:00.000Z",
                stopped_at: null,
              },
              relationships: {
                time_entry: { data: { type: "time_entries", id: "e1" } },
              },
            },
          ],
          included: [
            {
              id: "e1",
              type: "time_entries",
              attributes: { date: "2026-09-10" },
            },
          ],
        },
        day("2026-09-11"),
      ),
      {
        timerId: timerId("t1"),
        entryId: entryId("e1"),
        day: "2026-09-10",
        startedAt,
      },
    );
  },
);

QUnit.module("stopTimer", (hooks) => {
  const originalFetch = globalThis.fetch;

  hooks.afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  QUnit.test("409 is rejected, not a network error", async (assert) => {
    globalThis.fetch = (async () => {
      return new Response("{}", {
        status: 409,
        headers: { "Content-Type": "application/vnd.api+json" },
      });
    }) as typeof fetch;
    const result = await stopTimer({
      credentials: credentials(),
      timerId: timerId("t1"),
    });
    assert.deepEqual(result, {
      ok: false,
      error: "timerAlreadyStopped",
    });
  });
});
