import QUnit from "qunit";
import {
  parseAccessToken,
  parseOrganizationId,
  parsePersonId,
} from "../../src/lib/auth";
import {
  createTimeEntry,
  fetchTimeEntry,
  parseTimeEntriesPage,
  timeEntriesPagePath,
  updateTimeEntry,
} from "../../src/providers/productive";
import { parseCalendarDay, parseMinutes } from "../../src/lib/time";
import {
  entryListingCopy,
  noteFromText,
  parseProjectId,
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

function projectId(value: string) {
  const parsed = parseProjectId(value);
  if (!parsed) {
    throw new Error(`invalid project id ${value}`);
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
    assert.ok(
      captured?.url.includes("include=service,task,service.deal.project"),
    );
  });
});

QUnit.module("updateTimeEntry", (hooks) => {
  const originalFetch = globalThis.fetch;
  let capturedUrl: string | undefined;

  hooks.afterEach(() => {
    globalThis.fetch = originalFetch;
    capturedUrl = undefined;
  });

  function stubFetch(status: number) {
    globalThis.fetch = (async (
      input: RequestInfo | URL,
      _init?: RequestInit,
    ) => {
      capturedUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
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
      day: sampleEntry.day,
      draft: sampleDraft,
    });
    assert.deepEqual(result, {
      ok: false,
      error: {
        kind: "rejected",
        message: "This time entry can't be updated.",
      },
    });
    assert.ok(
      capturedUrl?.includes("include=service,task,service.deal.project"),
    );
  });

  QUnit.test("404 is rejected", async (assert) => {
    stubFetch(404);
    const result = await updateTimeEntry({
      credentials: credentials(),
      personId: personId(),
      entry: sampleEntry,
      day: sampleEntry.day,
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

const TIME_ENTRY_INCLUDE = "include=service,task,service.deal.project";

function entryResource(args?: { taskId?: string }) {
  return {
    id: "e1",
    type: "time_entries",
    attributes: {
      note: "",
      date: "2026-09-10",
      time: 90,
    },
    relationships: {
      service: { data: { type: "services", id: "s1" } },
      ...(args?.taskId
        ? { task: { data: { type: "tasks", id: args.taskId } } }
        : {}),
    },
  };
}

function serviceResource(args?: { dealId?: string; name?: string }) {
  return {
    id: "s1",
    type: "services",
    attributes: { name: args?.name ?? "Dev" },
    ...(args?.dealId
      ? {
          relationships: {
            deal: { data: { type: "deals", id: args.dealId } },
          },
        }
      : {}),
  };
}

function listingFrom(json: unknown) {
  const entry = parseTimeEntriesPage(json).rows[0];
  if (!entry) {
    throw new Error("expected a parsed time entry");
  }
  return {
    entry,
    copy: entryListingCopy({
      service: entry.service,
      task: entry.task,
      project: entry.project,
    }),
  };
}

QUnit.module("time entry include");

QUnit.test("list path includes service.deal.project", (assert) => {
  assert.ok(
    timeEntriesPagePath({
      personId: personId(),
      day: day("2026-09-10"),
    }).includes(TIME_ENTRY_INCLUDE),
  );
});

QUnit.test("create path includes service.deal.project", async (assert) => {
  const originalFetch = globalThis.fetch;
  let url = "";
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    return new Response("{}", {
      status: 400,
      headers: { "Content-Type": "application/vnd.api+json" },
    });
  }) as typeof fetch;
  try {
    await createTimeEntry({
      credentials: credentials(),
      personId: personId(),
      day: day("2026-09-09"),
      note: noteFromText("Wrote tests"),
      time: 90,
      service: { id: serviceId("svc-1"), name: "Development" },
    });
    assert.ok(url.includes(TIME_ENTRY_INCLUDE));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

QUnit.module("parseTimeEntriesPage project");

QUnit.test("omits project when any hop is missing", (assert) => {
  const withoutDeal = listingFrom({
    data: [entryResource()],
    included: [serviceResource()],
  });
  assert.strictEqual(withoutDeal.entry.project, undefined);

  const dealMissing = listingFrom({
    data: [entryResource()],
    included: [serviceResource({ dealId: "d1" })],
  });
  assert.strictEqual(dealMissing.entry.project, undefined);

  const projectRelMissing = listingFrom({
    data: [entryResource()],
    included: [
      serviceResource({ dealId: "d1" }),
      { id: "d1", type: "deals", attributes: {} },
    ],
  });
  assert.strictEqual(projectRelMissing.entry.project, undefined);

  const projectMissing = listingFrom({
    data: [entryResource()],
    included: [
      serviceResource({ dealId: "d1" }),
      {
        id: "d1",
        type: "deals",
        attributes: {},
        relationships: {
          project: { data: { type: "projects", id: "p1" } },
        },
      },
    ],
  });
  assert.strictEqual(projectMissing.entry.project, undefined);
});

QUnit.test("reads project through service.deal.project", (assert) => {
  const { entry, copy } = listingFrom({
    data: [entryResource({ taskId: "t1" })],
    included: [
      serviceResource({ dealId: "d1" }),
      {
        id: "d1",
        type: "deals",
        attributes: {},
        relationships: {
          project: { data: { type: "projects", id: "p1" } },
        },
      },
      {
        id: "p1",
        type: "projects",
        attributes: { name: "Bank" },
      },
      {
        id: "t1",
        type: "tasks",
        attributes: { title: "Ship it" },
      },
    ],
  });
  assert.deepEqual(entry.project, {
    id: projectId("p1"),
    name: "Bank",
  });
  assert.deepEqual(copy, {
    title: "Ship it",
    subtitle: "Bank: Dev",
  });
});

QUnit.test("listing copy uses literal Productive rules", (assert) => {
  assert.deepEqual(
    listingFrom({
      data: [entryResource()],
      included: [serviceResource()],
    }).copy,
    { title: "Dev", subtitle: undefined },
  );
  assert.deepEqual(
    listingFrom({
      data: [entryResource({ taskId: "t1" })],
      included: [
        serviceResource(),
        { id: "t1", type: "tasks", attributes: { title: "Ship it" } },
      ],
    }).copy,
    { title: "Ship it", subtitle: "Dev" },
  );
  assert.deepEqual(
    listingFrom({
      data: [entryResource({ taskId: "t1" })],
      included: [
        serviceResource({ dealId: "d1" }),
        {
          id: "d1",
          type: "deals",
          attributes: {},
          relationships: {
            project: { data: { type: "projects", id: "p1" } },
          },
        },
        { id: "p1", type: "projects", attributes: { name: "Bank" } },
        { id: "t1", type: "tasks", attributes: { title: "Ship it" } },
      ],
    }).copy,
    { title: "Ship it", subtitle: "Bank: Dev" },
  );
  assert.deepEqual(
    listingFrom({
      data: [entryResource()],
      included: [
        serviceResource({ dealId: "d1" }),
        {
          id: "d1",
          type: "deals",
          attributes: {},
          relationships: {
            project: { data: { type: "projects", id: "p1" } },
          },
        },
        { id: "p1", type: "projects", attributes: { name: "Bank" } },
      ],
    }).copy,
    { title: "Dev", subtitle: "Bank" },
  );
});
