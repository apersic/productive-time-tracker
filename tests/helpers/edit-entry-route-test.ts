import QUnit from "qunit";
import { parseCalendarDay, parseMinutes } from "../../src/lib/time";
import {
  parseServiceId,
  parseTaskId,
  parseTimeEntryId,
} from "../../src/lib/timesheet/day-timesheet";
import {
  noteFromText,
  serializeEntryNote,
} from "../../src/lib/timesheet/entry-note";
import {
  editEntryNavigationState,
  editEntryPath,
  homeReturnState,
  parseHomeReturn,
  resolveEditEntryRoute,
} from "../../src/pages/edit-entry-route";

function day(value: string) {
  const parsed = parseCalendarDay(value);
  if (!parsed) {
    throw new Error(`invalid day ${value}`);
  }
  return parsed;
}

function minutes(value: number) {
  const parsed = parseMinutes(value);
  if (parsed === undefined) {
    throw new Error(`invalid minutes ${value}`);
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

function serviceId(value: string) {
  const parsed = parseServiceId(value);
  if (!parsed) {
    throw new Error(`invalid service id ${value}`);
  }
  return parsed;
}

function taskId(value: string) {
  const parsed = parseTaskId(value);
  if (!parsed) {
    throw new Error(`invalid task id ${value}`);
  }
  return parsed;
}

const sampleEntry = {
  id: entryId("entry-1"),
  day: day("2026-09-09"),
  note: noteFromText("Wrote tests"),
  service: { id: serviceId("svc-1"), name: "Development" },
  task: { id: taskId("task-1"), title: "Ship edit" },
  logged: minutes(90),
};

QUnit.module("editEntryPath");

QUnit.test("encodes the id under /edit", (assert) => {
  assert.strictEqual(editEntryPath(entryId("entry-1")), "/edit/entry-1");
});

QUnit.module("resolveEditEntryRoute");

QUnit.test("undefined or whitespace is invalidId", (assert) => {
  assert.deepEqual(resolveEditEntryRoute(undefined, undefined), {
    kind: "invalidId",
  });
  assert.deepEqual(resolveEditEntryRoute("  ", undefined), {
    kind: "invalidId",
  });
});

QUnit.test("a valid id without state has no seed", (assert) => {
  assert.deepEqual(resolveEditEntryRoute("entry-1", undefined), {
    kind: "valid",
    entryId: entryId("entry-1"),
    seed: undefined,
  });
});

QUnit.test("a matching snapshot rebuilds the entry", (assert) => {
  const snapshot = editEntryNavigationState(sampleEntry);
  assert.strictEqual(snapshot.noteHtml, "<p>Wrote tests</p>");
  const route = resolveEditEntryRoute("entry-1", snapshot);
  assert.strictEqual(route.kind, "valid");
  if (route.kind !== "valid") {
    return;
  }
  assert.strictEqual(route.entryId, entryId("entry-1"));
  assert.ok(route.seed);
  assert.strictEqual(route.seed?.id, entryId("entry-1"));
  assert.strictEqual(route.seed?.day, day("2026-09-09"));
  assert.strictEqual(route.seed?.logged, minutes(90));
  assert.deepEqual(route.seed?.service, {
    id: serviceId("svc-1"),
    name: "Development",
  });
  assert.deepEqual(route.seed?.task, {
    id: taskId("task-1"),
    title: "Ship edit",
  });
  if (typeof DOMParser === "undefined") {
    return;
  }
  assert.strictEqual(
    serializeEntryNote(route.seed?.note ?? { kind: "empty" }),
    "<p>Wrote tests</p>",
  );
});

QUnit.test("a snapshot for a different id is ignored", (assert) => {
  assert.deepEqual(
    resolveEditEntryRoute("entry-2", editEntryNavigationState(sampleEntry)),
    {
      kind: "valid",
      entryId: entryId("entry-2"),
      seed: undefined,
    },
  );
});

QUnit.test("garbage history state is ignored", (assert) => {
  assert.deepEqual(resolveEditEntryRoute("entry-1", { seed: sampleEntry }), {
    kind: "valid",
    entryId: entryId("entry-1"),
    seed: undefined,
  });
});

QUnit.module("parseHomeReturn");

QUnit.test("reads a homeDay snapshot", (assert) => {
  assert.strictEqual(
    parseHomeReturn(homeReturnState(day("2026-09-09"))),
    day("2026-09-09"),
  );
  assert.strictEqual(
    parseHomeReturn({ kind: "homeDay", day: "2026-09-09" }),
    day("2026-09-09"),
  );
});

QUnit.test("rejects anything else", (assert) => {
  assert.strictEqual(parseHomeReturn(undefined), undefined);
  assert.strictEqual(parseHomeReturn({ kind: "editEntry" }), undefined);
  assert.strictEqual(
    parseHomeReturn({ kind: "homeDay", day: "nope" }),
    undefined,
  );
});
