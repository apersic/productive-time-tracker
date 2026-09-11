import QUnit from "qunit";
import { parseAccessToken, parseOrganizationId } from "../../src/lib/auth";
import {
  deleteTimeEntry,
  productiveRequestUrl,
} from "../../src/providers/productive";
import {
  alreadyCopied,
  applyFact,
  copyContentKey,
  displayedMinutes,
  emptyNote,
  entryNoteFromDoc,
  entryTitle,
  initialDayTimesheet,
  noteDocShowsPlaceholder,
  noteFromText,
  noteIdentity,
  noteSchema,
  parseEntryNote,
  parseServiceId,
  parseTaskId,
  parseTimeEntryId,
  parseTimerId,
  reconstructTimerSlot,
  runningEntryVisible,
  serializeEntryNote,
  type DayTimesheet,
  type RunningTimer,
  type TimeEntry,
} from "../../src/features/timesheet";
import { formatHhMm, parseCalendarDay, parseMinutes } from "../../src/lib/time";

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

function timerId(value: string) {
  const parsed = parseTimerId(value);
  if (!parsed) {
    throw new Error(`invalid timer id ${value}`);
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

function sampleEntry(): TimeEntry {
  return {
    id: entryId("e1"),
    day: day("2026-09-10"),
    note: noteFromText("Wrote tests"),
    service: { id: serviceId("s1"), name: "Dev" },
    logged: minutes(90),
  };
}

function sampleTimer(startedAt: number): RunningTimer {
  return {
    timerId: timerId("t1"),
    entryId: entryId("e1"),
    day: day("2026-09-10"),
    startedAt,
  };
}

QUnit.module("productiveRequestUrl");

QUnit.test("keeps an absolute URL and prefixes a path", (assert) => {
  assert.strictEqual(
    productiveRequestUrl(
      "https://api.productive.io/api/v2",
      "https://api.productive.io/api/v2/time_entries?page=2",
    ),
    "https://api.productive.io/api/v2/time_entries?page=2",
  );
  assert.strictEqual(
    productiveRequestUrl("https://api.productive.io/api/v2", "/time_entries"),
    "https://api.productive.io/api/v2/time_entries",
  );
});

QUnit.module("applyFact");

QUnit.test(
  "daySelected resets the list to loading and keeps a running timer from another day",
  (assert) => {
    const tenth = day("2026-09-10");
    const ninth = day("2026-09-09");
    const timer = sampleTimer(1_000);
    const state: DayTimesheet = {
      day: tenth,
      entries: {
        status: "ready",
        rows: [sampleEntry()],
        page: { kind: "complete" },
      },
      timer: { kind: "running", timer },
    };
    const next = applyFact(state, { kind: "daySelected", day: ninth });
    assert.strictEqual(next.day, "2026-09-09");
    assert.deepEqual(next.entries, { status: "loading" });
    assert.deepEqual(next.timer, { kind: "running", timer });
  },
);

QUnit.test(
  "firstPageArrived empty becomes empty with copy checking",
  (assert) => {
    const tenth = day("2026-09-10");
    const next = applyFact(initialDayTimesheet(tenth), {
      kind: "firstPageArrived",
      day: tenth,
      rows: [],
      next: undefined,
      running: [],
    });
    assert.deepEqual(next.entries, {
      status: "empty",
      copy: { kind: "checking" },
    });
  },
);

QUnit.test("firstPageArrived with rows becomes ready", (assert) => {
  const tenth = day("2026-09-10");
  const row = sampleEntry();
  const next = applyFact(initialDayTimesheet(tenth), {
    kind: "firstPageArrived",
    day: tenth,
    rows: [row],
    next: undefined,
    running: [],
  });
  assert.deepEqual(next.entries, {
    status: "ready",
    rows: [row],
    page: { kind: "complete" },
  });
});

QUnit.test(
  "stale firstPageArrived for a different day is ignored",
  (assert) => {
    const tenth = day("2026-09-10");
    const ninth = day("2026-09-09");
    const loading = initialDayTimesheet(tenth);
    const next = applyFact(loading, {
      kind: "firstPageArrived",
      day: ninth,
      rows: [sampleEntry()],
      next: undefined,
      running: [],
    });
    assert.strictEqual(next, loading);
    assert.deepEqual(next.entries, { status: "loading" });
  },
);

QUnit.test("play on an already running id is a noop", (assert) => {
  const tenth = day("2026-09-10");
  const timer = sampleTimer(1_000);
  const state: DayTimesheet = {
    day: tenth,
    entries: {
      status: "ready",
      rows: [sampleEntry()],
      page: { kind: "complete" },
    },
    timer: { kind: "running", timer },
  };
  const next = applyFact(state, {
    kind: "playRequested",
    entryId: timer.entryId,
  });
  assert.strictEqual(next, state);
  assert.deepEqual(next.timer, { kind: "running", timer });
});

QUnit.test("entryRemoved drops a row and keeps the page cursor", (assert) => {
  const tenth = day("2026-09-10");
  const first = sampleEntry();
  const second: TimeEntry = {
    ...first,
    id: entryId("e2"),
    note: noteFromText("Other"),
  };
  const state: DayTimesheet = {
    day: tenth,
    entries: {
      status: "ready",
      rows: [first, second],
      page: { kind: "more", next: "/time_entries?page=2" },
    },
    timer: { kind: "idle" },
  };
  const next = applyFact(state, {
    kind: "entryRemoved",
    day: tenth,
    entryId: first.id,
  });
  assert.deepEqual(next.entries, {
    status: "ready",
    rows: [second],
    page: { kind: "more", next: "/time_entries?page=2" },
  });
  assert.deepEqual(next.timer, { kind: "idle" });
});

QUnit.test(
  "entryRemoved on the last complete row becomes empty unavailable",
  (assert) => {
    const tenth = day("2026-09-10");
    const row = sampleEntry();
    const state: DayTimesheet = {
      day: tenth,
      entries: {
        status: "ready",
        rows: [row],
        page: { kind: "complete" },
      },
      timer: { kind: "idle" },
    };
    const next = applyFact(state, {
      kind: "entryRemoved",
      day: tenth,
      entryId: row.id,
    });
    assert.deepEqual(next.entries, {
      status: "empty",
      copy: { kind: "unavailable" },
    });
  },
);

QUnit.test(
  "entryRemoved on the last loaded row with more pages becomes loading and idles the timer",
  (assert) => {
    const tenth = day("2026-09-10");
    const row = sampleEntry();
    const timer = sampleTimer(1_000);
    const state: DayTimesheet = {
      day: tenth,
      entries: {
        status: "ready",
        rows: [row],
        page: { kind: "more", next: "/time_entries?page=2" },
      },
      timer: { kind: "running", timer },
    };
    const next = applyFact(state, {
      kind: "entryRemoved",
      day: tenth,
      entryId: row.id,
    });
    assert.deepEqual(next.entries, { status: "loading" });
    assert.deepEqual(next.timer, { kind: "idle" });
  },
);

QUnit.test("entryRemoved of a running id idles the timer", (assert) => {
  const tenth = day("2026-09-10");
  const first = sampleEntry();
  const second: TimeEntry = {
    ...first,
    id: entryId("e2"),
  };
  const timer = sampleTimer(1_000);
  const state: DayTimesheet = {
    day: tenth,
    entries: {
      status: "ready",
      rows: [first, second],
      page: { kind: "complete" },
    },
    timer: { kind: "running", timer },
  };
  const next = applyFact(state, {
    kind: "entryRemoved",
    day: tenth,
    entryId: first.id,
  });
  assert.strictEqual(next.entries.status, "ready");
  if (next.entries.status !== "ready") {
    return;
  }
  assert.deepEqual(
    next.entries.rows.map((row) => row.id),
    [second.id],
  );
  assert.deepEqual(next.timer, { kind: "idle" });
});

QUnit.test("entryRemoved twice is identity", (assert) => {
  const tenth = day("2026-09-10");
  const first = sampleEntry();
  const second: TimeEntry = {
    ...first,
    id: entryId("e2"),
  };
  const state: DayTimesheet = {
    day: tenth,
    entries: {
      status: "ready",
      rows: [first, second],
      page: { kind: "complete" },
    },
    timer: { kind: "idle" },
  };
  const once = applyFact(state, {
    kind: "entryRemoved",
    day: tenth,
    entryId: first.id,
  });
  const twice = applyFact(once, {
    kind: "entryRemoved",
    day: tenth,
    entryId: first.id,
  });
  assert.strictEqual(twice, once);
});

QUnit.test("entryCreated prepends onto a ready list", (assert) => {
  const tenth = day("2026-09-10");
  const first = sampleEntry();
  const created: TimeEntry = {
    ...first,
    id: entryId("e2"),
    note: noteFromText("Newer"),
  };
  const state: DayTimesheet = {
    day: tenth,
    entries: {
      status: "ready",
      rows: [first],
      page: { kind: "complete" },
    },
    timer: { kind: "idle" },
  };
  const next = applyFact(state, {
    kind: "entryCreated",
    day: tenth,
    entry: created,
  });
  assert.strictEqual(next.entries.status, "ready");
  if (next.entries.status !== "ready") {
    return;
  }
  assert.deepEqual(
    next.entries.rows.map((row) => row.id),
    [created.id, first.id],
  );
});

QUnit.test(
  "firstPageArrived is ignored after a create during loading",
  (assert) => {
    const tenth = day("2026-09-10");
    const created = sampleEntry();
    const afterCreate = applyFact(initialDayTimesheet(tenth), {
      kind: "entryCreated",
      day: tenth,
      entry: created,
    });
    const clobber = applyFact(afterCreate, {
      kind: "firstPageArrived",
      day: tenth,
      rows: [],
      next: undefined,
      running: [],
    });
    assert.strictEqual(clobber.entries.status, "ready");
    if (clobber.entries.status !== "ready") {
      return;
    }
    assert.deepEqual(clobber.entries.rows, [created]);
  },
);

QUnit.test("dayReloaded replaces rows on a ready day", (assert) => {
  const tenth = day("2026-09-10");
  const first = sampleEntry();
  const replacement: TimeEntry = {
    ...first,
    id: entryId("e2"),
    logged: minutes(15),
  };
  const state: DayTimesheet = {
    day: tenth,
    entries: {
      status: "ready",
      rows: [first],
      page: { kind: "complete" },
    },
    timer: { kind: "idle" },
  };
  const next = applyFact(state, {
    kind: "dayReloaded",
    day: tenth,
    rows: [replacement],
    next: undefined,
    running: [],
  });
  assert.strictEqual(next.entries.status, "ready");
  if (next.entries.status !== "ready") {
    return;
  }
  assert.deepEqual(next.entries.rows, [replacement]);
});

QUnit.test("timerStopped on switching starts the target entry", (assert) => {
  const tenth = day("2026-09-10");
  const from = sampleTimer(1_000);
  const to = entryId("e2");
  const state: DayTimesheet = {
    day: tenth,
    entries: {
      status: "ready",
      rows: [sampleEntry()],
      page: { kind: "complete" },
    },
    timer: { kind: "switching", from, to },
  };
  const next = applyFact(state, {
    kind: "timerStopped",
    entryId: from.entryId,
    logged: minutes(95),
  });
  assert.deepEqual(next.timer, { kind: "starting", entryId: to });
  assert.strictEqual(next.entries.status, "ready");
  if (next.entries.status !== "ready") {
    return;
  }
  assert.strictEqual(next.entries.rows[0]?.logged, 95);
});

QUnit.test(
  "timerStarted is ignored unless that entry is starting",
  (assert) => {
    const tenth = day("2026-09-10");
    const timer = sampleTimer(1_000);
    const idle: DayTimesheet = {
      day: tenth,
      entries: {
        status: "ready",
        rows: [sampleEntry()],
        page: { kind: "complete" },
      },
      timer: { kind: "idle" },
    };
    assert.strictEqual(applyFact(idle, { kind: "timerStarted", timer }), idle);
    const starting = applyFact(idle, {
      kind: "playRequested",
      entryId: timer.entryId,
    });
    const running = applyFact(starting, { kind: "timerStarted", timer });
    assert.deepEqual(running.timer, { kind: "running", timer });
  },
);

QUnit.test("timerRecovered with no timer idles a running slot", (assert) => {
  const tenth = day("2026-09-10");
  const timer = sampleTimer(1_000);
  const state: DayTimesheet = {
    day: tenth,
    entries: {
      status: "ready",
      rows: [sampleEntry()],
      page: { kind: "complete" },
    },
    timer: { kind: "running", timer },
  };
  const next = applyFact(state, {
    kind: "timerRecovered",
    day: tenth,
    timer: undefined,
  });
  assert.deepEqual(next.timer, { kind: "idle" });
});

QUnit.test("timerRecovered with no timer keeps a starting slot", (assert) => {
  const tenth = day("2026-09-10");
  const state: DayTimesheet = {
    day: tenth,
    entries: { status: "loading" },
    timer: { kind: "starting", entryId: entryId("e1") },
  };
  const next = applyFact(state, {
    kind: "timerRecovered",
    day: tenth,
    timer: undefined,
  });
  assert.deepEqual(next.timer, {
    kind: "starting",
    entryId: entryId("e1"),
  });
});

QUnit.test("timerRecovered for another day is ignored", (assert) => {
  const tenth = day("2026-09-10");
  const ninth = day("2026-09-09");
  const state = initialDayTimesheet(tenth);
  const next = applyFact(state, {
    kind: "timerRecovered",
    day: ninth,
    timer: sampleTimer(1_000),
  });
  assert.strictEqual(next, state);
});

QUnit.module("reconstructTimerSlot");

QUnit.test("two running rows keep the later startedAt", (assert) => {
  const earlier = sampleTimer(1_000);
  const later = {
    ...sampleTimer(2_000),
    timerId: timerId("t2"),
    entryId: entryId("e2"),
  };
  assert.deepEqual(reconstructTimerSlot([earlier, later], { kind: "idle" }), {
    kind: "running",
    timer: later,
  });
});

QUnit.module("displayedMinutes");

QUnit.test("90 logged minutes plus 90s elapsed adds one minute", (assert) => {
  const logged = minutes(90);
  const id = entryId("e1");
  const startedAt = 1_000_000;
  const shown = displayedMinutes({
    logged,
    entryId: id,
    now: startedAt + 90_000,
    timer: {
      kind: "running",
      timer: {
        timerId: timerId("t1"),
        entryId: id,
        day: day("2026-09-10"),
        startedAt,
      },
    },
  });
  assert.strictEqual(formatHhMm(logged), "01:30");
  assert.strictEqual(formatHhMm(shown), "01:31");
});

QUnit.test("moreRequested retries from moreFailed", (assert) => {
  const tenth = day("2026-09-10");
  const state: DayTimesheet = {
    day: tenth,
    entries: {
      status: "ready",
      rows: [sampleEntry()],
      page: {
        kind: "moreFailed",
        next: "/time_entries?page=2",
        error: { kind: "network", message: "Could not reach Productive." },
      },
    },
    timer: { kind: "idle" },
  };
  const next = applyFact(state, { kind: "moreRequested" });
  assert.deepEqual(next.entries, {
    status: "ready",
    rows: [sampleEntry()],
    page: { kind: "loadingMore", next: "/time_entries?page=2" },
  });
});

QUnit.test(
  "runningEntryVisible is false when the running timer is not in the list",
  (assert) => {
    const tenth = day("2026-09-10");
    const timer = {
      ...sampleTimer(1_000),
      entryId: entryId("other"),
      day: day("2026-09-09"),
    };
    const state: DayTimesheet = {
      day: tenth,
      entries: {
        status: "ready",
        rows: [sampleEntry()],
        page: { kind: "complete" },
      },
      timer: { kind: "running", timer },
    };
    assert.strictEqual(runningEntryVisible(state), false);
  },
);

QUnit.module("copy skip");

QUnit.test(
  "alreadyCopied matches service, task, note, and minutes",
  (assert) => {
    const source = sampleEntry();
    assert.strictEqual(
      copyContentKey(source),
      JSON.stringify(["s1", null, "<p>Wrote tests</p>", 90]),
    );
    assert.strictEqual(alreadyCopied({ source, existing: [source] }), true);
    assert.strictEqual(
      alreadyCopied({
        source,
        existing: [
          { ...source, note: noteFromText("Other"), logged: minutes(30) },
        ],
      }),
      false,
    );
    const withTask = {
      ...source,
      task: { id: taskId("task-1"), title: "Ship it" },
    };
    const otherTask = {
      ...source,
      task: { id: taskId("task-2"), title: "Other" },
    };
    assert.strictEqual(
      copyContentKey(withTask),
      JSON.stringify(["s1", "task-1", "<p>Wrote tests</p>", 90]),
    );
    assert.strictEqual(
      alreadyCopied({ source: withTask, existing: [otherTask] }),
      false,
    );
    assert.strictEqual(
      alreadyCopied({ source: withTask, existing: [withTask] }),
      true,
    );
  },
);

QUnit.module("entry note");

QUnit.test("noteIdentity is serializeEntryNote", (assert) => {
  assert.strictEqual(noteIdentity, serializeEntryNote);
  assert.strictEqual(serializeEntryNote({ kind: "empty" }), "");
  assert.strictEqual(
    serializeEntryNote(noteFromText("Wrote tests")),
    "<p>Wrote tests</p>",
  );
});

QUnit.test(
  "entryTitle is the service name when a note is present",
  (assert) => {
    const entry = sampleEntry();
    assert.strictEqual(entry.note.kind, "present");
    assert.strictEqual(entryTitle({ service: entry.service }), "Dev");
    assert.strictEqual(
      entryTitle({
        service: entry.service,
        task: { title: "Ship it" },
      }),
      "Dev · Ship it",
    );
  },
);

QUnit.test("noteFromText treats whitespace as empty", (assert) => {
  assert.deepEqual(noteFromText(""), { kind: "empty" });
  assert.deepEqual(noteFromText("   "), { kind: "empty" });
});

QUnit.test("parseEntryNote uses DOMParser when the host has one", (assert) => {
  if (typeof DOMParser === "undefined") {
    assert.ok(
      true,
      "DOMParser is missing in Node; HTML parse is covered in Playwright",
    );
    return;
  }
  assert.strictEqual(parseEntryNote("").kind, "empty");
  assert.strictEqual(parseEntryNote("   ").kind, "empty");
  const parsed = parseEntryNote("<p>Hello</p>");
  assert.strictEqual(parsed.kind, "present");
  if (parsed.kind !== "present") {
    return;
  }
  assert.strictEqual(parsed.doc.textContent, "Hello");
  assert.strictEqual(serializeEntryNote(parsed), "<p>Hello</p>");
});

QUnit.test("empty list editor doc still serializes as empty", (assert) => {
  const emptyList = noteSchema.node("doc", null, [
    noteSchema.node("bullet_list", null, [
      noteSchema.node("list_item", null, [noteSchema.node("paragraph")]),
    ]),
  ]);
  assert.deepEqual(entryNoteFromDoc(emptyList), emptyNote);
  assert.strictEqual(serializeEntryNote(entryNoteFromDoc(emptyList)), "");
  assert.strictEqual(noteDocShowsPlaceholder(emptyList), false);
});

QUnit.test("placeholder is only for a lone empty paragraph", (assert) => {
  const emptyParagraph = noteSchema.node("doc", null, [
    noteSchema.node("paragraph"),
  ]);
  assert.strictEqual(noteDocShowsPlaceholder(emptyParagraph), true);
  const withText = noteSchema.node("doc", null, [
    noteSchema.node("paragraph", null, [noteSchema.text("-")]),
  ]);
  assert.strictEqual(noteDocShowsPlaceholder(withText), false);
});

QUnit.test("present list serializes to ul/li/p HTML", (assert) => {
  const listDoc = noteSchema.node("doc", null, [
    noteSchema.node("bullet_list", null, [
      noteSchema.node("list_item", null, [
        noteSchema.node("paragraph", null, [noteSchema.text("Wrote tests")]),
      ]),
    ]),
  ]);
  assert.strictEqual(
    serializeEntryNote(entryNoteFromDoc(listDoc)),
    "<ul><li><p>Wrote tests</p></li></ul>",
  );
});

QUnit.test("strong mark serializes to strong", (assert) => {
  const doc = noteSchema.node("doc", null, [
    noteSchema.node("paragraph", null, [
      noteSchema.text("Bold", [noteSchema.mark("strong")]),
    ]),
  ]);
  assert.strictEqual(
    serializeEntryNote(entryNoteFromDoc(doc)),
    "<p><strong>Bold</strong></p>",
  );
});

function sampleCredentials() {
  const organizationId = parseOrganizationId("61648");
  const accessToken = parseAccessToken("token-value");
  if (!organizationId || !accessToken) {
    throw new Error("invalid credentials");
  }
  return { organizationId, accessToken };
}

QUnit.module("deleteTimeEntry", (hooks) => {
  const originalFetch = globalThis.fetch;
  let captured: { url: string; method: string } | undefined;

  hooks.afterEach(() => {
    globalThis.fetch = originalFetch;
    captured = undefined;
  });

  function stubFetch(status: number, body: string | null = "") {
    globalThis.fetch = (async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      captured = { url, method: init?.method ?? "GET" };
      return new Response(status === 204 ? null : body, {
        status,
        headers: { "Content-Type": "application/vnd.api+json" },
      });
    }) as typeof fetch;
  }

  QUnit.test("204 is ok and DELETEs the entry path", async (assert) => {
    stubFetch(204);
    const result = await deleteTimeEntry({
      credentials: sampleCredentials(),
      entryId: entryId("e1"),
    });
    assert.deepEqual(result, { ok: true });
    assert.strictEqual(captured?.method, "DELETE");
    assert.ok(captured?.url.endsWith("/time_entries/e1"));
  });

  QUnit.test("404 is ok", async (assert) => {
    stubFetch(404);
    const result = await deleteTimeEntry({
      credentials: sampleCredentials(),
      entryId: entryId("e1"),
    });
    assert.deepEqual(result, { ok: true });
  });

  QUnit.test("403 is rejected, not unauthorized", async (assert) => {
    stubFetch(403);
    const result = await deleteTimeEntry({
      credentials: sampleCredentials(),
      entryId: entryId("e1"),
    });
    assert.deepEqual(result, {
      ok: false,
      error: {
        kind: "rejected",
        message: "This time entry can't be deleted.",
      },
    });
  });
});
