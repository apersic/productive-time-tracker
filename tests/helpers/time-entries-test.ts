import QUnit from "qunit";
import { parseTimeEntry } from "../../src/lib/productive/time-entries";
import type { JsonApiResource } from "../../src/lib/productive/json-api";

function serviceResource(): JsonApiResource {
  return {
    id: "svc-1",
    type: "services",
    attributes: { name: "App design" },
  };
}

function createdEntry(
  service: JsonApiResource["relationships"],
): JsonApiResource {
  return {
    id: "entry-1",
    type: "time_entries",
    attributes: {
      note: "<p>line a</p><p></p><p>line b</p>",
      date: "2026-09-10",
      time: 1,
    },
    relationships: {
      service,
    },
  };
}

QUnit.module("parseTimeEntry");

QUnit.test(
  "rejects a create payload whose service relationship was not included",
  (assert) => {
    const parsed = parseTimeEntry(
      createdEntry({ meta: { included: false } }),
      new Map(),
    );
    assert.strictEqual(parsed, undefined);
  },
);

QUnit.test(
  "reads an entry when the service relationship has an id",
  (assert) => {
    const service = serviceResource();
    const included = new Map([["services:svc-1", service]]);
    const parsed = parseTimeEntry(
      createdEntry({ data: { type: "services", id: "svc-1" } }),
      included,
    );
    assert.notStrictEqual(parsed, undefined);
    if (!parsed) {
      return;
    }
    assert.strictEqual(parsed.entry.id, "entry-1");
    assert.strictEqual(parsed.entry.service.id, "svc-1");
    assert.strictEqual(parsed.entry.service.name, "App design");
    assert.strictEqual(parsed.entry.logged, 1);
  },
);
