import QUnit from "qunit";
import { copyForNotice, noticeFromWrite } from "../../src/lib/notice/notice";
import { formatCalendarDayLabel, parseCalendarDay } from "../../src/lib/time";
import type { TimesheetError } from "../../src/lib/timesheet/day-timesheet";

function day(value: string) {
  const parsed = parseCalendarDay(value);
  if (!parsed) {
    throw new Error(`invalid day ${value}`);
  }
  return parsed;
}

function error(kind: TimesheetError["kind"], message = "boom"): TimesheetError {
  return { kind, message };
}

const from = day("2026-09-09");

QUnit.module("noticeFromWrite");

QUnit.test("create ok maps to entryCreated", (assert) => {
  assert.deepEqual(
    noticeFromWrite({ op: "createEntry", result: { ok: true } }),
    { kind: "entryCreated" },
  );
});

QUnit.test("create fail any kind is a no-op", (assert) => {
  assert.strictEqual(
    noticeFromWrite({
      op: "createEntry",
      result: { ok: false, error: error("network") },
    }),
    undefined,
  );
  assert.strictEqual(
    noticeFromWrite({
      op: "createEntry",
      result: { ok: false, error: error("invalid") },
    }),
    undefined,
  );
  assert.strictEqual(
    noticeFromWrite({
      op: "createEntry",
      result: { ok: false, error: error("rejected") },
    }),
    undefined,
  );
  assert.strictEqual(
    noticeFromWrite({
      op: "createEntry",
      result: { ok: false, error: error("unauthorized") },
    }),
    undefined,
  );
});

QUnit.test("copy all with created > 0 maps to dayCopied", (assert) => {
  assert.deepEqual(
    noticeFromWrite({
      op: "copyDay",
      result: { ok: true, copied: "all", from, created: 2 },
    }),
    { kind: "dayCopied", from, created: 2 },
  );
});

QUnit.test("copy all with created 0 is a no-op", (assert) => {
  assert.strictEqual(
    noticeFromWrite({
      op: "copyDay",
      result: { ok: true, copied: "all", from, created: 0 },
    }),
    undefined,
  );
});

QUnit.test(
  "copy partial with created > 0 maps to dayCopiedPartial",
  (assert) => {
    assert.deepEqual(
      noticeFromWrite({
        op: "copyDay",
        result: { ok: true, copied: "partial", from, created: 1 },
      }),
      { kind: "dayCopiedPartial", from, created: 1 },
    );
  },
);

QUnit.test("copy partial with created 0 is a no-op", (assert) => {
  assert.strictEqual(
    noticeFromWrite({
      op: "copyDay",
      result: { ok: true, copied: "partial", from, created: 0 },
    }),
    undefined,
  );
});

QUnit.test("copy fail is a no-op", (assert) => {
  assert.strictEqual(
    noticeFromWrite({
      op: "copyDay",
      result: { ok: false, error: error("network") },
    }),
    undefined,
  );
});

QUnit.test("timer ok is a no-op", (assert) => {
  assert.strictEqual(
    noticeFromWrite({ op: "timer", result: { ok: true } }),
    undefined,
  );
});

QUnit.test("timer fail network maps to timerFailed", (assert) => {
  assert.deepEqual(
    noticeFromWrite({
      op: "timer",
      result: {
        ok: false,
        error: error("network", "Could not reach Productive."),
      },
    }),
    {
      kind: "timerFailed",
      message: "Could not reach Productive.",
    },
  );
});

QUnit.test("timer fail unauthorized is a no-op", (assert) => {
  assert.strictEqual(
    noticeFromWrite({
      op: "timer",
      result: { ok: false, error: error("unauthorized") },
    }),
    undefined,
  );
});

QUnit.test("recoverTimer ok is a no-op", (assert) => {
  assert.strictEqual(
    noticeFromWrite({ op: "recoverTimer", result: { ok: true } }),
    undefined,
  );
});

QUnit.test("recoverTimer fail network maps to recoverTimerFailed", (assert) => {
  assert.deepEqual(
    noticeFromWrite({
      op: "recoverTimer",
      result: {
        ok: false,
        error: error("network", "Could not reach Productive."),
      },
    }),
    {
      kind: "recoverTimerFailed",
      message: "Could not reach Productive.",
    },
  );
});

QUnit.test("recoverTimer fail unauthorized is a no-op", (assert) => {
  assert.strictEqual(
    noticeFromWrite({
      op: "recoverTimer",
      result: { ok: false, error: error("unauthorized") },
    }),
    undefined,
  );
});

QUnit.test("sessionExpired maps to sessionExpired", (assert) => {
  assert.deepEqual(noticeFromWrite({ op: "sessionExpired" }), {
    kind: "sessionExpired",
  });
});

QUnit.module("copyForNotice");

QUnit.test("entryCreated title is Time entry added", (assert) => {
  assert.deepEqual(copyForNotice({ kind: "entryCreated" }), {
    level: "title",
    title: "Time entry added",
  });
});

QUnit.test("dayCopied title names the source day", (assert) => {
  assert.deepEqual(copyForNotice({ kind: "dayCopied", from, created: 2 }), {
    level: "title",
    title: `Copied entries from ${formatCalendarDayLabel(from)}`,
  });
});

QUnit.test("dayCopiedPartial uses the warning copy", (assert) => {
  assert.deepEqual(
    copyForNotice({ kind: "dayCopiedPartial", from, created: 1 }),
    {
      level: "detail",
      title: `Copied some entries from ${formatCalendarDayLabel(from)}`,
      description: "Productive rejected the rest.",
    },
  );
});

QUnit.test("timerFailed uses the error message", (assert) => {
  assert.deepEqual(
    copyForNotice({
      kind: "timerFailed",
      message: "Could not reach Productive.",
    }),
    {
      level: "detail",
      title: "Couldn't update the timer",
      description: "Could not reach Productive.",
    },
  );
});

QUnit.test("recoverTimerFailed uses the error message", (assert) => {
  assert.deepEqual(
    copyForNotice({
      kind: "recoverTimerFailed",
      message: "Could not reach Productive.",
    }),
    {
      level: "detail",
      title: "Couldn't refresh the timer",
      description: "Could not reach Productive.",
    },
  );
});

QUnit.test("sessionExpired title is the fixed session copy", (assert) => {
  assert.deepEqual(copyForNotice({ kind: "sessionExpired" }), {
    level: "title",
    title: "Your session expired. Log in again.",
  });
});
