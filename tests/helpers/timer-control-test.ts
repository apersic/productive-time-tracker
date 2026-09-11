import QUnit from "qunit";
import {
  parseTimeEntryId,
  parseTimerId,
  timerControl,
  type RunningTimer,
  type TimeEntryId,
  type TimerSlot,
} from "../../src/features/timesheet";
import { parseCalendarDay } from "../../src/lib/time";

function entryId(value: string): TimeEntryId {
  const parsed = parseTimeEntryId(value);
  if (!parsed) {
    throw new Error(`invalid entry id ${value}`);
  }
  return parsed;
}

function runningOn(id: TimeEntryId): RunningTimer {
  const timerId = parseTimerId("t1");
  const day = parseCalendarDay("2026-09-10");
  if (!timerId || !day) {
    throw new Error("invalid timer fixture");
  }
  return { timerId, entryId: id, day, startedAt: 1 };
}

const THIS = entryId("this");
const OTHER = entryId("other");
const TO = entryId("to");

const PLAY_READY = { kind: "play", mode: "ready", enabled: true } as const;
const PLAY_DISABLED = { kind: "play", mode: "ready", enabled: false } as const;
const PLAY_PENDING = { kind: "play", mode: "pending" } as const;
const STOP_READY = { kind: "stop", mode: "ready", enabled: true } as const;
const STOP_PENDING = { kind: "stop", mode: "pending" } as const;

QUnit.module("timerControl");

QUnit.test("idle is play ready on every row", (assert) => {
  const timer: TimerSlot = { kind: "idle" };
  assert.deepEqual(timerControl({ entryId: THIS, timer }), PLAY_READY);
  assert.deepEqual(timerControl({ entryId: OTHER, timer }), PLAY_READY);
});

QUnit.test("failed is play ready on every row", (assert) => {
  const timer: TimerSlot = {
    kind: "failed",
    entryId: THIS,
    error: { kind: "network", message: "nope" },
  };
  assert.deepEqual(timerControl({ entryId: THIS, timer }), PLAY_READY);
  assert.deepEqual(timerControl({ entryId: OTHER, timer }), PLAY_READY);
});

QUnit.test("starting pending only on the named row", (assert) => {
  const timer: TimerSlot = { kind: "starting", entryId: THIS };
  assert.deepEqual(timerControl({ entryId: THIS, timer }), PLAY_PENDING);
  assert.deepEqual(timerControl({ entryId: OTHER, timer }), PLAY_DISABLED);
});

QUnit.test("running stop only on the running row", (assert) => {
  const timer: TimerSlot = { kind: "running", timer: runningOn(THIS) };
  assert.deepEqual(timerControl({ entryId: THIS, timer }), STOP_READY);
  assert.deepEqual(timerControl({ entryId: OTHER, timer }), PLAY_READY);
});

QUnit.test("stopping pending only on the running row", (assert) => {
  const timer: TimerSlot = { kind: "stopping", timer: runningOn(THIS) };
  assert.deepEqual(timerControl({ entryId: THIS, timer }), STOP_PENDING);
  assert.deepEqual(timerControl({ entryId: OTHER, timer }), PLAY_DISABLED);
});

QUnit.test("switching pending on from and to, disabled elsewhere", (assert) => {
  const timer: TimerSlot = {
    kind: "switching",
    from: runningOn(THIS),
    to: TO,
  };
  assert.deepEqual(timerControl({ entryId: THIS, timer }), STOP_PENDING);
  assert.deepEqual(timerControl({ entryId: TO, timer }), PLAY_PENDING);
  assert.deepEqual(timerControl({ entryId: OTHER, timer }), PLAY_DISABLED);
});
