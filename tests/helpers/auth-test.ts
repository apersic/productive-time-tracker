import QUnit from "qunit";
import {
  clearCredentials,
  displayNameFromParts,
  loadCredentials,
  parseAccessToken,
  parseOrganizationId,
  parsePersonId,
  parseStoredCredentials,
  restoreOutcome,
  saveCredentials,
} from "../../src/lib/auth";
import {
  currentPersonFromPayload,
  currentUserFromPayload,
  parseJsonApiDataList,
  parseJsonApiResource,
  uniqueJsonApiResource,
} from "../../src/providers/productive";

const STORAGE_KEY = "productive-time-tracker.credentials";

QUnit.module("credentials storage");

QUnit.test("accepts organizationId and accessToken", (assert) => {
  const parsed = parseStoredCredentials({
    organizationId: "61648",
    accessToken: "token-value",
  });
  assert.deepEqual(parsed, {
    organizationId: "61648",
    accessToken: "token-value",
  });
});

QUnit.test("rejects missing fields", (assert) => {
  assert.strictEqual(
    parseStoredCredentials({ organizationId: "1" }),
    undefined,
  );
  assert.strictEqual(parseStoredCredentials(null), undefined);
});

QUnit.module("credentials storage io", (hooks) => {
  const store = new Map<string, string>();
  let setItemImpl: (key: string, value: string) => void = (key, value) => {
    store.set(key, value);
  };

  hooks.beforeEach(() => {
    store.clear();
    setItemImpl = (key, value) => {
      store.set(key, value);
    };
    const localStorage = {
      getItem(key: string) {
        return store.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        setItemImpl(key, value);
      },
      removeItem(key: string) {
        store.delete(key);
      },
    };
    Object.defineProperty(globalThis, "window", {
      value: { localStorage },
      configurable: true,
      writable: true,
    });
  });

  QUnit.test("round-trips credentials", (assert) => {
    const credentials = parseStoredCredentials({
      organizationId: "61648",
      accessToken: "token-value",
    });
    assert.ok(credentials);
    if (!credentials) {
      return;
    }
    saveCredentials(credentials);
    assert.deepEqual(loadCredentials(), credentials);
    clearCredentials();
    assert.strictEqual(loadCredentials(), undefined);
  });

  QUnit.test("saveCredentials swallows storage failures", (assert) => {
    setItemImpl = () => {
      throw new Error("quota");
    };
    const credentials = parseStoredCredentials({
      organizationId: "61648",
      accessToken: "token-value",
    });
    assert.ok(credentials);
    if (!credentials) {
      return;
    }
    saveCredentials(credentials);
    assert.strictEqual(store.get(STORAGE_KEY), undefined);
  });
});

QUnit.module("json-api");

QUnit.test("parses a resource and a data list", (assert) => {
  const resource = parseJsonApiResource({
    id: "1439113",
    type: "people",
    attributes: { first_name: "Ada" },
  });
  assert.strictEqual(resource?.id, "1439113");
  assert.strictEqual(resource?.type, "people");
  assert.deepEqual(
    parseJsonApiDataList({ data: [{ id: "1", type: "users" }] })?.length,
    1,
  );
});

QUnit.test(
  "uniqueJsonApiResource requires exactly one matching row",
  (assert) => {
    assert.strictEqual(uniqueJsonApiResource({ data: [] }, "users").ok, false);
    assert.deepEqual(uniqueJsonApiResource({ data: [] }, "users"), {
      ok: false,
      reason: "missing",
    });
    assert.deepEqual(
      uniqueJsonApiResource(
        {
          data: [
            { id: "1", type: "users", attributes: {} },
            { id: "2", type: "users", attributes: {} },
          ],
        },
        "users",
      ),
      { ok: false, reason: "many" },
    );
    assert.strictEqual(
      uniqueJsonApiResource(
        { data: { id: "1", type: "users", attributes: { email: "a@b.c" } } },
        "users",
      ).ok,
      true,
    );
  },
);

QUnit.module("display name");

QUnit.test("prefers first and last name over email", (assert) => {
  assert.strictEqual(
    displayNameFromParts({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
    }),
    "Ada Lovelace",
  );
});

QUnit.test("falls back to email when names are blank", (assert) => {
  assert.strictEqual(
    displayNameFromParts({
      firstName: "",
      lastName: "  ",
      email: "ada@example.com",
    }),
    "ada@example.com",
  );
});

QUnit.module("restoreOutcome");

QUnit.test("keeps credentials on network and invalid failures", (assert) => {
  assert.deepEqual(
    restoreOutcome({
      ok: false,
      error: "unreachable",
    }),
    {
      kind: "unavailable",
      error: "unreachable",
    },
  );
  assert.deepEqual(
    restoreOutcome({
      ok: false,
      error: "requestRejected",
    }).kind,
    "unavailable",
  );
});

QUnit.test("forgets credentials only when unauthorized", (assert) => {
  assert.deepEqual(
    restoreOutcome({
      ok: false,
      error: "badCredentials",
    }),
    { kind: "forget" },
  );
});

QUnit.test("returns the authenticated session on success", (assert) => {
  const organizationId = parseOrganizationId("61648");
  const accessToken = parseAccessToken("token-value");
  const personId = parsePersonId("1439113");
  assert.ok(organizationId && accessToken && personId);
  if (!organizationId || !accessToken || !personId) {
    return;
  }
  const session = {
    kind: "authenticated" as const,
    credentials: { organizationId, accessToken },
    person: { id: personId, displayName: "Ada Lovelace" },
  };
  assert.deepEqual(restoreOutcome({ ok: true, session }), {
    kind: "authenticated",
    session,
  });
});

QUnit.module("identity payloads");

QUnit.test("rejects more than one user or person", (assert) => {
  const manyUsers = currentUserFromPayload({
    data: [
      { id: "1", type: "users", attributes: { email: "a@b.c" } },
      { id: "2", type: "users", attributes: { email: "c@d.e" } },
    ],
  });
  assert.deepEqual(manyUsers, {
    ok: false,
    error: "manyUsers",
  });

  const organizationId = parseOrganizationId("61648");
  const accessToken = parseAccessToken("token-value");
  assert.ok(organizationId && accessToken);
  if (!organizationId || !accessToken) {
    return;
  }
  const manyPeople = currentPersonFromPayload({
    credentials: { organizationId, accessToken },
    email: "ada@example.com",
    json: {
      data: [
        { id: "1", type: "people", attributes: {} },
        { id: "2", type: "people", attributes: {} },
      ],
    },
  });
  assert.deepEqual(manyPeople, {
    ok: false,
    error: "manyPeople",
  });
});

QUnit.test("accepts a single user and person", (assert) => {
  const user = currentUserFromPayload({
    data: {
      id: "9",
      type: "users",
      attributes: { email: "ada@example.com" },
    },
  });
  assert.deepEqual(user, { ok: true, email: "ada@example.com" });

  const organizationId = parseOrganizationId("61648");
  const accessToken = parseAccessToken("token-value");
  assert.ok(organizationId && accessToken);
  if (!organizationId || !accessToken) {
    return;
  }
  const person = currentPersonFromPayload({
    credentials: { organizationId, accessToken },
    email: "ada@example.com",
    json: {
      data: {
        id: "1439113",
        type: "people",
        attributes: { first_name: "Ada", last_name: "Lovelace" },
      },
    },
  });
  assert.strictEqual(person.ok, true);
  if (!person.ok) {
    return;
  }
  assert.strictEqual(person.session.person.displayName, "Ada Lovelace");
});
