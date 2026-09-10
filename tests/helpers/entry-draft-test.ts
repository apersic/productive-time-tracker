import QUnit from "qunit";
import { emptyNote } from "../../src/lib/timesheet/entry-note";
import {
  parseEntryDraft,
  entryServiceOptions,
} from "../../src/lib/timesheet/entry-draft";
import { parseServiceId } from "../../src/lib/timesheet/day-timesheet";
import { parseMinutes } from "../../src/lib/time";

function serviceId(value: string) {
  const parsed = parseServiceId(value);
  if (!parsed) {
    throw new Error(`invalid service id ${value}`);
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

const development = { id: serviceId("svc-1"), name: "Development" };
const design = { id: serviceId("svc-2"), name: "Design" };

QUnit.module("parseEntryDraft");

QUnit.test("ready duration and one service yields a draft", (assert) => {
  assert.deepEqual(
    parseEntryDraft({
      fields: { duration: "1:30", service: undefined, note: emptyNote },
      services: { status: "one", service: development },
    }),
    {
      ok: true,
      draft: {
        note: emptyNote,
        logged: minutes(90),
        service: development,
      },
    },
  );
});

QUnit.test("empty duration is a blank duration issue", (assert) => {
  assert.deepEqual(
    parseEntryDraft({
      fields: { duration: "", service: development, note: emptyNote },
      services: { status: "one", service: development },
    }),
    { ok: false, issues: { duration: "blank" } },
  );
});

QUnit.test("24:00 is a tooLong duration issue", (assert) => {
  assert.deepEqual(
    parseEntryDraft({
      fields: { duration: "24:00", service: development, note: emptyNote },
      services: { status: "one", service: development },
    }),
    { ok: false, issues: { duration: "tooLong" } },
  );
});

QUnit.test(
  "many services with none selected is a blank service issue",
  (assert) => {
    assert.deepEqual(
      parseEntryDraft({
        fields: { duration: "1:30", service: undefined, note: emptyNote },
        services: { status: "many", services: [development, design] },
      }),
      { ok: false, issues: { service: "blank" } },
    );
  },
);

QUnit.test(
  "empty duration and missing service report both issues",
  (assert) => {
    assert.deepEqual(
      parseEntryDraft({
        fields: { duration: "", service: undefined, note: emptyNote },
        services: { status: "many", services: [development, design] },
      }),
      { ok: false, issues: { duration: "blank", service: "blank" } },
    );
  },
);

QUnit.test(
  "fields.service is kept when it is not in the trackable list",
  (assert) => {
    assert.deepEqual(
      parseEntryDraft({
        fields: { duration: "1:30", service: design, note: emptyNote },
        services: { status: "one", service: development },
      }),
      {
        ok: true,
        draft: {
          note: emptyNote,
          logged: minutes(90),
          service: design,
        },
      },
    );
  },
);

QUnit.test(
  "a pinned service still drafts when none are currently trackable",
  (assert) => {
    assert.deepEqual(
      parseEntryDraft({
        fields: { duration: "1:30", service: development, note: emptyNote },
        services: { status: "none" },
      }),
      {
        ok: true,
        draft: {
          note: emptyNote,
          logged: minutes(90),
          service: development,
        },
      },
    );
  },
);

QUnit.module("entryServiceOptions");

QUnit.test("pins a service that is no longer trackable", (assert) => {
  assert.deepEqual(
    entryServiceOptions({
      services: { status: "many", services: [development] },
      pinned: design,
    }),
    [development, design],
  );
});

QUnit.test("pins onto an empty trackable list", (assert) => {
  assert.deepEqual(
    entryServiceOptions({
      services: { status: "none" },
      pinned: development,
    }),
    [development],
  );
});
