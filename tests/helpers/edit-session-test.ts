import QUnit from "qunit";
import { parseCalendarDay, parseMinutes } from "../../src/lib/time";
import {
  noteFromText,
  parseServiceId,
  parseTaskId,
  parseTimeEntryId,
} from "../../src/features/timesheet";
import {
  beginSession,
  dayMoved,
  pickerContext,
  selectDay,
  selectService,
  type EditEntryPageState,
} from "../../src/features/edit/hooks/use-edit-entry.ts";

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
  day: day("2026-03-02"),
  note: noteFromText("Wrote tests"),
  service: { id: serviceId("svc-1"), name: "Development" },
  task: { id: taskId("task-1"), title: "Ship edit" },
  logged: minutes(90),
};

const moved = day("2026-03-04");

QUnit.module("beginSession");

QUnit.test("seeds day and service from the entry", (assert) => {
  assert.deepEqual(beginSession(sampleEntry), {
    entry: sampleEntry,
    day: day("2026-03-02"),
    service: sampleEntry.service,
  });
});

QUnit.module("dayMoved");

QUnit.test(
  "ready and saving compare session day to the entry day",
  (assert) => {
    const session = beginSession(sampleEntry);
    assert.strictEqual(dayMoved({ kind: "ready", session }), false);
    assert.strictEqual(dayMoved({ kind: "saving", session }), false);
    assert.strictEqual(
      dayMoved({ kind: "ready", session: { ...session, day: moved } }),
      true,
    );
    assert.strictEqual(
      dayMoved({ kind: "saving", session: { ...session, day: moved } }),
      true,
    );
  },
);

QUnit.test("other page kinds are not moved", (assert) => {
  assert.strictEqual(dayMoved({ kind: "invalidId" }), false);
  assert.strictEqual(
    dayMoved({ kind: "loading", entryId: entryId("entry-1") }),
    false,
  );
  assert.strictEqual(
    dayMoved({ kind: "missing", entryId: entryId("entry-1") }),
    false,
  );
  assert.strictEqual(
    dayMoved({
      kind: "failed",
      entryId: entryId("entry-1"),
      error: { kind: "rejected", message: "nope" },
    }),
    false,
  );
});

QUnit.module("pickerContext");

QUnit.test(
  "ready and saving use the pending day and pin the entry service",
  (assert) => {
    const session = {
      entry: sampleEntry,
      day: moved,
      service: sampleEntry.service,
    };
    assert.deepEqual(pickerContext({ kind: "ready", session }), {
      kind: "ready",
      day: day("2026-03-04"),
      pinned: sampleEntry.service,
    });
    assert.deepEqual(pickerContext({ kind: "saving", session }), {
      kind: "ready",
      day: day("2026-03-04"),
      pinned: sampleEntry.service,
    });
  },
);

QUnit.test(
  "a session service is pinned instead of the entry service",
  (assert) => {
    const design = { id: serviceId("svc-2"), name: "Design" };
    const session = { entry: sampleEntry, day: moved, service: design };
    assert.deepEqual(pickerContext({ kind: "ready", session }), {
      kind: "ready",
      day: day("2026-03-04"),
      pinned: design,
    });
  },
);

QUnit.test("other page kinds await a day", (assert) => {
  assert.deepEqual(pickerContext({ kind: "invalidId" }), {
    kind: "awaitingDay",
  });
  assert.deepEqual(
    pickerContext({ kind: "loading", entryId: entryId("entry-1") }),
    { kind: "awaitingDay" },
  );
  assert.deepEqual(
    pickerContext({ kind: "missing", entryId: entryId("entry-1") }),
    { kind: "awaitingDay" },
  );
  assert.deepEqual(
    pickerContext({
      kind: "failed",
      entryId: entryId("entry-1"),
      error: { kind: "rejected", message: "nope" },
    }),
    { kind: "awaitingDay" },
  );
});

QUnit.module("selectDay");

QUnit.test("ready with a new day returns a new session", (assert) => {
  const page: EditEntryPageState = {
    kind: "ready",
    session: beginSession(sampleEntry),
  };
  const design = { id: serviceId("svc-2"), name: "Design" };
  const picked: EditEntryPageState = {
    kind: "ready",
    session: { ...page.session, service: design },
  };
  assert.deepEqual(selectDay(page, day("2026-03-04")), {
    kind: "ready",
    session: {
      entry: sampleEntry,
      day: day("2026-03-04"),
      service: sampleEntry.service,
    },
  });
  assert.deepEqual(selectDay(picked, day("2026-03-04")), {
    kind: "ready",
    session: { entry: sampleEntry, day: day("2026-03-04"), service: design },
  });
});

QUnit.test("ready with the same day is identity", (assert) => {
  const page: EditEntryPageState = {
    kind: "ready",
    session: beginSession(sampleEntry),
  };
  assert.strictEqual(selectDay(page, day("2026-03-02")), page);
});

QUnit.test("identity outside ready", (assert) => {
  const pages: EditEntryPageState[] = [
    { kind: "invalidId" },
    { kind: "loading", entryId: entryId("entry-1") },
    { kind: "missing", entryId: entryId("entry-1") },
    {
      kind: "failed",
      entryId: entryId("entry-1"),
      error: { kind: "rejected", message: "nope" },
    },
    {
      kind: "saving",
      session: beginSession(sampleEntry),
    },
  ];
  for (const page of pages) {
    assert.strictEqual(selectDay(page, day("2026-03-04")), page);
  }
});

QUnit.module("selectService");

QUnit.test("ready with a new service returns a new session", (assert) => {
  const page: EditEntryPageState = {
    kind: "ready",
    session: beginSession(sampleEntry),
  };
  const design = { id: serviceId("svc-2"), name: "Design" };
  assert.deepEqual(selectService(page, design), {
    kind: "ready",
    session: { ...page.session, service: design },
  });
});

QUnit.test("ready with the same service id is identity", (assert) => {
  const page: EditEntryPageState = {
    kind: "ready",
    session: beginSession(sampleEntry),
  };
  assert.strictEqual(
    selectService(page, { id: sampleEntry.service.id, name: "Other" }),
    page,
  );
});

QUnit.test("identity outside ready", (assert) => {
  const design = { id: serviceId("svc-2"), name: "Design" };
  const pages: EditEntryPageState[] = [
    { kind: "invalidId" },
    { kind: "loading", entryId: entryId("entry-1") },
    { kind: "missing", entryId: entryId("entry-1") },
    {
      kind: "failed",
      entryId: entryId("entry-1"),
      error: { kind: "rejected", message: "nope" },
    },
    {
      kind: "saving",
      session: beginSession(sampleEntry),
    },
  ];
  for (const page of pages) {
    assert.strictEqual(selectService(page, design), page);
  }
});
