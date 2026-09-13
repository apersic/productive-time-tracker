import QUnit from "qunit";
import { copyFor } from "../../src/lib/copy";
import { copyForNotice, noticeFromWrite } from "../../src/lib/notice/notice";
import { parseCalendarDay } from "../../src/lib/time";
import type { TimesheetError } from "../../src/features/timesheet";

function day(value: string) {
  const parsed = parseCalendarDay(value);
  if (!parsed) {
    throw new Error(`invalid day ${value}`);
  }
  return parsed;
}

const from = day("2026-09-09");
const en = copyFor("en");
const unreachable: TimesheetError = "unreachable";
const sessionRejected: TimesheetError = "sessionRejected";
const requestRejected: TimesheetError = "requestRejected";
const entryNotDeletable: TimesheetError = "entryNotDeletable";
const entryNotUpdatable: TimesheetError = "entryNotUpdatable";

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
      result: { ok: false, error: unreachable },
    }),
    undefined,
  );
  assert.strictEqual(
    noticeFromWrite({
      op: "createEntry",
      result: { ok: false, error: requestRejected },
    }),
    undefined,
  );
  assert.strictEqual(
    noticeFromWrite({
      op: "createEntry",
      result: { ok: false, error: entryNotDeletable },
    }),
    undefined,
  );
  assert.strictEqual(
    noticeFromWrite({
      op: "createEntry",
      result: { ok: false, error: sessionRejected },
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

QUnit.test("copy fail maps to copyDayFailed", (assert) => {
  assert.deepEqual(
    noticeFromWrite({
      op: "copyDay",
      result: { ok: false, error: unreachable },
    }),
    { kind: "copyDayFailed", error: unreachable },
  );
});

QUnit.test("copy fail unauthorized is a no-op", (assert) => {
  assert.strictEqual(
    noticeFromWrite({
      op: "copyDay",
      result: { ok: false, error: sessionRejected },
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
      result: { ok: false, error: unreachable },
    }),
    {
      kind: "timerFailed",
      error: unreachable,
    },
  );
});

QUnit.test("timer fail unauthorized is a no-op", (assert) => {
  assert.strictEqual(
    noticeFromWrite({
      op: "timer",
      result: { ok: false, error: sessionRejected },
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
      result: { ok: false, error: unreachable },
    }),
    {
      kind: "recoverTimerFailed",
      error: unreachable,
    },
  );
});

QUnit.test("recoverTimer fail unauthorized is a no-op", (assert) => {
  assert.strictEqual(
    noticeFromWrite({
      op: "recoverTimer",
      result: { ok: false, error: sessionRejected },
    }),
    undefined,
  );
});

QUnit.test("sessionExpired maps to sessionExpired", (assert) => {
  assert.deepEqual(noticeFromWrite({ op: "sessionExpired" }), {
    kind: "sessionExpired",
  });
});

QUnit.test("delete ok maps to entryDeleted", (assert) => {
  assert.deepEqual(
    noticeFromWrite({ op: "deleteEntry", result: { ok: true } }),
    { kind: "entryDeleted" },
  );
});

QUnit.test("delete fail network maps to entryDeleteFailed", (assert) => {
  assert.deepEqual(
    noticeFromWrite({
      op: "deleteEntry",
      result: { ok: false, error: unreachable },
    }),
    {
      kind: "entryDeleteFailed",
      error: unreachable,
    },
  );
});

QUnit.test("delete fail unauthorized is a no-op", (assert) => {
  assert.strictEqual(
    noticeFromWrite({
      op: "deleteEntry",
      result: { ok: false, error: sessionRejected },
    }),
    undefined,
  );
});

QUnit.test("update ok maps to entryUpdated", (assert) => {
  assert.deepEqual(
    noticeFromWrite({ op: "updateEntry", result: { ok: true } }),
    { kind: "entryUpdated" },
  );
});

QUnit.test("update fail network maps to entryUpdateFailed", (assert) => {
  assert.deepEqual(
    noticeFromWrite({
      op: "updateEntry",
      result: { ok: false, error: unreachable },
    }),
    {
      kind: "entryUpdateFailed",
      error: unreachable,
    },
  );
});

QUnit.test("update fail unauthorized is a no-op", (assert) => {
  assert.strictEqual(
    noticeFromWrite({
      op: "updateEntry",
      result: { ok: false, error: sessionRejected },
    }),
    undefined,
  );
});

QUnit.module("copyForNotice");

QUnit.test("entryCreated title is Time entry added", (assert) => {
  assert.deepEqual(copyForNotice({ kind: "entryCreated" }, en), {
    level: "title",
    title: "Time entry added",
  });
});

QUnit.test("dayCopied title names the source day", (assert) => {
  assert.deepEqual(copyForNotice({ kind: "dayCopied", from, created: 2 }, en), {
    level: "title",
    title: en.notice.dayCopied(from),
  });
});

QUnit.test("dayCopiedPartial uses the warning copy", (assert) => {
  assert.deepEqual(
    copyForNotice({ kind: "dayCopiedPartial", from, created: 1 }, en),
    {
      level: "detail",
      title: en.notice.dayCopiedPartial(from),
      description: "Productive rejected the rest.",
    },
  );
});

QUnit.test("timerFailed uses the failure catalog", (assert) => {
  assert.deepEqual(
    copyForNotice({ kind: "timerFailed", error: unreachable }, en),
    {
      level: "detail",
      title: "Couldn't update the timer",
      description: "Could not reach Productive.",
    },
  );
});

QUnit.test("recoverTimerFailed uses the failure catalog", (assert) => {
  assert.deepEqual(
    copyForNotice({ kind: "recoverTimerFailed", error: unreachable }, en),
    {
      level: "detail",
      title: "Couldn't refresh the timer",
      description: "Could not reach Productive.",
    },
  );
});

QUnit.test("copyDayFailed uses the failure catalog", (assert) => {
  assert.deepEqual(
    copyForNotice({ kind: "copyDayFailed", error: unreachable }, en),
    {
      level: "detail",
      title: "Couldn't copy the previous day",
      description: "Could not reach Productive.",
    },
  );
});

QUnit.test("sessionExpired title is the fixed session copy", (assert) => {
  assert.deepEqual(copyForNotice({ kind: "sessionExpired" }, en), {
    level: "title",
    title: "Your session expired. Log in again.",
  });
});

QUnit.test("entryDeleted title is Time entry deleted", (assert) => {
  assert.deepEqual(copyForNotice({ kind: "entryDeleted" }, en), {
    level: "title",
    title: "Time entry deleted",
  });
});

QUnit.test("entryDeleteFailed uses the failure catalog", (assert) => {
  assert.deepEqual(
    copyForNotice({ kind: "entryDeleteFailed", error: unreachable }, en),
    {
      level: "detail",
      title: "Couldn't delete the time entry",
      description: "Could not reach Productive.",
    },
  );
});

QUnit.test("entryUpdated title is Time entry updated", (assert) => {
  assert.deepEqual(copyForNotice({ kind: "entryUpdated" }, en), {
    level: "title",
    title: "Time entry updated",
  });
});

QUnit.test("entryUpdateFailed uses the failure catalog", (assert) => {
  assert.deepEqual(
    copyForNotice({ kind: "entryUpdateFailed", error: entryNotUpdatable }, en),
    {
      level: "detail",
      title: "Couldn't update the time entry",
      description: "This time entry can't be updated.",
    },
  );
});
