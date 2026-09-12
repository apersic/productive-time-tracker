import QUnit from "qunit";
import { parseCalendarDay } from "../../src/lib/time";
import {
  emptyServiceCatalog,
  parseServiceId,
  serviceGroupId,
  type ServiceCatalog,
} from "../../src/features/timesheet";
import {
  availabilityFrom,
  initialPickerState,
  listingFrom,
  servicePickerReducer,
} from "../../src/features/timesheet/service-picker-model.ts";

function serviceId(value: string) {
  const parsed = parseServiceId(value);
  if (!parsed) {
    throw new Error(`invalid service id ${value}`);
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

const development = { id: serviceId("svc-1"), name: "Development" };
const design = { id: serviceId("svc-2"), name: "Design" };
const monday = day("2026-09-07");
const tuesday = day("2026-09-08");

const manyCatalog: ServiceCatalog = {
  roots: [
    { kind: "service", service: development },
    { kind: "service", service: design },
  ],
  serviceCount: 2,
};

QUnit.module("servicePickerReducer");

QUnit.test(
  "searchArrived with empty leaves does not change availability from many to none",
  (assert) => {
    let state = initialPickerState({
      kind: "ready",
      day: monday,
      pinned: undefined,
    });
    state = servicePickerReducer(state, {
      kind: "baseArrived",
      day: monday,
      catalog: manyCatalog,
    });
    assert.deepEqual(availabilityFrom(state.base, state.context), {
      status: "many",
    });
    state = servicePickerReducer(state, {
      kind: "inputChanged",
      input: "zzz",
    });
    state = servicePickerReducer(state, {
      kind: "searchRequested",
      query: "zzz",
      generation: 0,
    });
    state = servicePickerReducer(state, {
      kind: "searchArrived",
      query: "zzz",
      catalog: emptyServiceCatalog,
      generation: 0,
    });
    assert.deepEqual(availabilityFrom(state.base, state.context), {
      status: "many",
    });
    assert.deepEqual(listingFrom(state), {
      kind: "empty",
      reason: "noMatches",
    });
  },
);

QUnit.test("stale searchArrived is ignored", (assert) => {
  let state = initialPickerState({
    kind: "ready",
    day: monday,
    pinned: undefined,
  });
  state = servicePickerReducer(state, {
    kind: "baseArrived",
    day: monday,
    catalog: manyCatalog,
  });
  state = servicePickerReducer(state, {
    kind: "inputChanged",
    input: "des",
  });
  const afterTyping = state;
  state = servicePickerReducer(state, {
    kind: "searchArrived",
    query: "zzz",
    catalog: emptyServiceCatalog,
    generation: 0,
  });
  assert.deepEqual(state, afterTyping);
});

QUnit.test("close then a late searchArrived is a no-op", (assert) => {
  let state = initialPickerState({
    kind: "ready",
    day: monday,
    pinned: undefined,
  });
  state = servicePickerReducer(state, {
    kind: "baseArrived",
    day: monday,
    catalog: manyCatalog,
  });
  state = servicePickerReducer(state, {
    kind: "inputChanged",
    input: "des",
  });
  state = servicePickerReducer(state, { kind: "opened" });
  state = servicePickerReducer(state, { kind: "closed" });
  const afterClose = state;
  assert.strictEqual(afterClose.searchGeneration, 1);
  assert.deepEqual(afterClose.search, { kind: "off" });
  state = servicePickerReducer(state, {
    kind: "searchArrived",
    query: "des",
    catalog: emptyServiceCatalog,
    generation: 0,
  });
  assert.deepEqual(state, afterClose);
});

QUnit.test("day mismatch makes availability loading", (assert) => {
  let state = initialPickerState({
    kind: "ready",
    day: monday,
    pinned: undefined,
  });
  state = servicePickerReducer(state, {
    kind: "baseArrived",
    day: monday,
    catalog: manyCatalog,
  });
  assert.deepEqual(
    availabilityFrom(state.base, {
      kind: "ready",
      day: tuesday,
      pinned: undefined,
    }),
    { status: "loading" },
  );
});

QUnit.test("select stores the full TrackableService", (assert) => {
  let state = initialPickerState({
    kind: "ready",
    day: monday,
    pinned: undefined,
  });
  state = servicePickerReducer(state, {
    kind: "selected",
    service: design,
  });
  assert.deepEqual(state.selection, { id: serviceId("svc-2"), name: "Design" });
});

QUnit.test(
  "day change bumps searchGeneration and drops the pending query",
  (assert) => {
    let state = initialPickerState({
      kind: "ready",
      day: monday,
      pinned: undefined,
    });
    state = servicePickerReducer(state, {
      kind: "baseArrived",
      day: monday,
      catalog: manyCatalog,
    });
    state = servicePickerReducer(state, {
      kind: "inputChanged",
      input: "des",
    });
    state = servicePickerReducer(state, {
      kind: "contextChanged",
      context: { kind: "ready", day: tuesday, pinned: undefined },
    });
    assert.strictEqual(state.searchGeneration, 1);
    assert.deepEqual(state.search, { kind: "off" });
    assert.strictEqual(state.input, "");

    state = servicePickerReducer(state, {
      kind: "inputChanged",
      input: "des",
    });
    const afterRetype = state;
    state = servicePickerReducer(state, {
      kind: "searchArrived",
      query: "des",
      catalog: emptyServiceCatalog,
      generation: 0,
    });
    assert.deepEqual(state, afterRetype);

    state = servicePickerReducer(state, {
      kind: "searchArrived",
      query: "des",
      catalog: emptyServiceCatalog,
      generation: 1,
    });
    assert.deepEqual(state.search, {
      kind: "ready",
      catalog: emptyServiceCatalog,
    });
    assert.deepEqual(listingFrom(state), {
      kind: "empty",
      reason: "noMatches",
    });
  },
);

QUnit.test(
  "baseArrived backfills previous so typing lists stale rows",
  (assert) => {
    let state = initialPickerState({
      kind: "ready",
      day: monday,
      pinned: undefined,
    });
    state = servicePickerReducer(state, {
      kind: "inputChanged",
      input: "des",
    });
    assert.deepEqual(listingFrom(state), { kind: "loading" });
    state = servicePickerReducer(state, {
      kind: "baseArrived",
      day: monday,
      catalog: manyCatalog,
    });
    assert.deepEqual(listingFrom(state), {
      kind: "rows",
      rows: [
        {
          kind: "service",
          service: development,
          depth: 0,
          selected: false,
        },
        {
          kind: "service",
          service: design,
          depth: 0,
          selected: false,
        },
      ],
      stale: true,
    });
  },
);

QUnit.test("search expands groups so a nested match is listed", (assert) => {
  const nested: ServiceCatalog = {
    roots: [
      {
        kind: "group",
        id: serviceGroupId(["company:c1"]),
        level: "company",
        label: "Co",
        children: [
          {
            kind: "group",
            id: serviceGroupId(["company:c1", "deal:d1"]),
            level: "deal",
            label: "Deal",
            children: [{ kind: "service", service: design }],
          },
        ],
      },
    ],
    serviceCount: 1,
  };
  let state = initialPickerState({
    kind: "ready",
    day: monday,
    pinned: undefined,
  });
  state = servicePickerReducer(state, {
    kind: "baseArrived",
    day: monday,
    catalog: nested,
  });
  const before = listingFrom(state);
  assert.equal(before.kind, "rows");
  if (before.kind === "rows") {
    assert.deepEqual(
      before.rows
        .filter((row) => row.kind === "service")
        .map((row) => {
          return row.kind === "service" ? row.service.name : "";
        }),
      [],
    );
  }
  state = servicePickerReducer(state, {
    kind: "inputChanged",
    input: "Des",
  });
  state = servicePickerReducer(state, {
    kind: "searchArrived",
    query: "Des",
    catalog: nested,
    generation: state.searchGeneration,
  });
  const after = listingFrom(state);
  assert.equal(after.kind, "rows");
  if (after.kind !== "rows") {
    return;
  }
  assert.deepEqual(
    after.rows
      .filter((row) => row.kind === "service")
      .map((row) => (row.kind === "service" ? row.service.name : "")),
    ["Design"],
  );
});

QUnit.test(
  "a pinned service missing from the catalog opens the Current service group",
  (assert) => {
    const pinned = { id: serviceId("svc-old"), name: "Old" };
    let state = initialPickerState({
      kind: "ready",
      day: monday,
      pinned,
    });
    state = servicePickerReducer(state, {
      kind: "baseArrived",
      day: monday,
      catalog: emptyServiceCatalog,
    });
    const listing = listingFrom(state);
    assert.equal(listing.kind, "rows");
    if (listing.kind !== "rows") {
      return;
    }
    assert.deepEqual(
      listing.rows.map((row) =>
        row.kind === "group" ? row.label : row.service.name,
      ),
      ["Current service", "Old"],
    );
  },
);

QUnit.test(
  "typing keeps a pinned service that is missing from the catalog",
  (assert) => {
    const pinned = { id: serviceId("svc-old"), name: "Old" };
    let state = initialPickerState({
      kind: "ready",
      day: monday,
      pinned,
    });
    state = servicePickerReducer(state, {
      kind: "baseArrived",
      day: monday,
      catalog: emptyServiceCatalog,
    });
    state = servicePickerReducer(state, {
      kind: "inputChanged",
      input: "zzz",
    });
    const listing = listingFrom(state);
    assert.equal(listing.kind, "rows");
    if (listing.kind !== "rows") {
      return;
    }
    assert.deepEqual(
      listing.rows
        .filter(
          (row) => row.kind === "group" && row.label === "Current service",
        )
        .map((row) => (row.kind === "group" ? row.label : "")),
      ["Current service"],
    );
  },
);
