import QUnit from "qunit";
import {
  parseAccessToken,
  parseOrganizationId,
  parsePersonId,
} from "../../src/lib/auth";
import {
  fetchTimeEntry,
  updateTimeEntry,
} from "../../src/providers/productive";
import { parseCalendarDay, parseMinutes } from "../../src/lib/time";
import {
  noteFromText,
  parseServiceId,
  parseTaskId,
  parseTimeEntryId,
} from "../../src/features/timesheet";

function credentials() {
  const organizationId = parseOrganizationId("61648");
  const accessToken = parseAccessToken("token-value");
  if (!organizationId || !accessToken) {
    throw new Error("invalid credentials");
  }
  return { organizationId, accessToken };
}

function personId() {
  const parsed = parsePersonId("1439113");
  if (!parsed) {
    throw new Error("invalid person id");
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

const sampleEntry = {
  id: entryId("entry-1"),
  day: day("2026-09-09"),
  note: noteFromText("Wrote tests"),
  service: { id: serviceId("svc-1"), name: "Development" },
  task: { id: taskId("task-1"), title: "Ship edit" },
  logged: minutes(90),
};

const sampleDraft = {
  note: noteFromText("Updated note"),
  logged: minutes(120),
  service: { id: serviceId("svc-1"), name: "Development" },
};

QUnit.module("fetchTimeEntry", (hooks) => {
  const originalFetch = globalThis.fetch;
  let captured: { url: string; method: string } | undefined;

  hooks.afterEach(() => {
    globalThis.fetch = originalFetch;
    captured = undefined;
  });

  function stubFetch(status: number, body: string) {
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
      return new Response(body, {
        status,
        headers: { "Content-Type": "application/vnd.api+json" },
      });
    }) as typeof fetch;
  }

  QUnit.test("empty list is not found", async (assert) => {
    stubFetch(200, JSON.stringify({ data: [] }));
    const result = await fetchTimeEntry({
      credentials: credentials(),
      personId: personId(),
      entryId: entryId("entry-1"),
    });
    assert.deepEqual(result, { ok: true, found: false });
    assert.strictEqual(captured?.method, "GET");
    assert.ok(captured?.url.includes("filter[id]=entry-1"));
    assert.ok(captured?.url.includes("filter[person_id]=1439113"));
  });
});

QUnit.module("updateTimeEntry", (hooks) => {
  const originalFetch = globalThis.fetch;

  hooks.afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function stubFetch(status: number) {
    globalThis.fetch = (async (
      _input: RequestInfo | URL,
      _init?: RequestInit,
    ) => {
      return new Response(status === 204 ? null : "{}", {
        status,
        headers: { "Content-Type": "application/vnd.api+json" },
      });
    }) as typeof fetch;
  }

  QUnit.test("403 is rejected, not unauthorized", async (assert) => {
    stubFetch(403);
    const result = await updateTimeEntry({
      credentials: credentials(),
      personId: personId(),
      entry: sampleEntry,
      draft: sampleDraft,
    });
    assert.deepEqual(result, {
      ok: false,
      error: {
        kind: "rejected",
        message: "This time entry can't be updated.",
      },
    });
  });

  QUnit.test("404 is rejected", async (assert) => {
    stubFetch(404);
    const result = await updateTimeEntry({
      credentials: credentials(),
      personId: personId(),
      entry: sampleEntry,
      draft: sampleDraft,
    });
    assert.deepEqual(result, {
      ok: false,
      error: {
        kind: "rejected",
        message: "This time entry no longer exists.",
      },
    });
  });
});
