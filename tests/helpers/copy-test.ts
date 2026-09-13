import QUnit from "qunit";
import {
  copyFor,
  parseLanguage,
  languageFromBrowser,
  resolveLanguage,
} from "../../src/lib/copy";
import {
  loadLanguage,
  saveLanguage,
} from "../../src/lib/copy/language-storage.ts";
import { parseCalendarDay } from "../../src/lib/time";

function day(value: string) {
  const parsed = parseCalendarDay(value);
  if (!parsed) {
    throw new Error(`invalid day ${value}`);
  }
  return parsed;
}

QUnit.module("parseLanguage");

QUnit.test("accepts en and hr only", (assert) => {
  assert.strictEqual(parseLanguage("en"), "en");
  assert.strictEqual(parseLanguage("hr"), "hr");
  assert.strictEqual(parseLanguage("en-US"), undefined);
  assert.strictEqual(parseLanguage("de"), undefined);
  assert.strictEqual(parseLanguage(""), undefined);
  assert.strictEqual(parseLanguage(null), undefined);
});

QUnit.module("languageFromBrowser");

QUnit.test("takes the first supported tag", (assert) => {
  assert.strictEqual(languageFromBrowser(["hr", "en"]), "hr");
  assert.strictEqual(languageFromBrowser(["en-US", "hr"]), "en");
  assert.strictEqual(languageFromBrowser(["hr-HR"]), "hr");
  assert.strictEqual(languageFromBrowser(["de-DE", "hr-HR"]), "hr");
  assert.strictEqual(languageFromBrowser(["de-DE", "fr"]), "en");
  assert.strictEqual(languageFromBrowser([]), "en");
});

QUnit.module("resolveLanguage");

QUnit.test("saved pick wins over the browser", (assert) => {
  assert.strictEqual(
    resolveLanguage({ saved: "hr", browserLanguages: ["en-US"] }),
    "hr",
  );
  assert.strictEqual(
    resolveLanguage({ saved: "en", browserLanguages: ["hr"] }),
    "en",
  );
});

QUnit.test("unsaved falls through to the browser list", (assert) => {
  assert.strictEqual(
    resolveLanguage({ saved: undefined, browserLanguages: ["hr-HR"] }),
    "hr",
  );
  assert.strictEqual(
    resolveLanguage({ saved: undefined, browserLanguages: ["de"] }),
    "en",
  );
});

QUnit.module("language storage io", (hooks) => {
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

  QUnit.test("round-trips a bare language tag", (assert) => {
    saveLanguage("hr");
    assert.strictEqual(store.get("productive-time-tracker.language"), "hr");
    assert.strictEqual(loadLanguage(), "hr");
  });

  QUnit.test("rejects unknown stored values", (assert) => {
    store.set("productive-time-tracker.language", "de");
    assert.strictEqual(loadLanguage(), undefined);
  });

  QUnit.test("saveLanguage swallows storage failures", (assert) => {
    setItemImpl = () => {
      throw new Error("quota");
    };
    saveLanguage("hr");
    assert.strictEqual(
      store.get("productive-time-tracker.language"),
      undefined,
    );
  });
});

QUnit.module("copy catalogs");

QUnit.test(
  "English chrome matches the known login and failure sentences",
  (assert) => {
    const en = copyFor("en");
    assert.strictEqual(en.login.submit, "Log in");
    assert.strictEqual(en.header.logOut, "Log out");
    assert.strictEqual(en.failure.unreachable, "Could not reach Productive.");
    assert.strictEqual(
      en.failure.manyUsers,
      "Productive returned more than one user.",
    );
  },
);

QUnit.test(
  "Croatian catalog fills the same keys with different sentences",
  (assert) => {
    const hr = copyFor("hr");
    const en = copyFor("en");
    assert.strictEqual(hr.login.submit, "Prijava");
    assert.notEqual(hr.login.submit, en.login.submit);
    assert.strictEqual(hr.page.home, "Početna");
    assert.strictEqual(hr.failure.unreachable, "Productive nije dostupan.");
  },
);

QUnit.test("Croatian listReady uses the few form for 2", (assert) => {
  const tenth = day("2026-09-10");
  const hr = copyFor("hr");
  const one = hr.home.listReady({ count: 1, day: tenth });
  const few = hr.home.listReady({ count: 2, day: tenth });
  const other = hr.home.listReady({ count: 5, day: tenth });
  assert.true(one.includes("1 unos vremena"));
  assert.true(few.includes("2 unosa vremena"));
  assert.true(other.includes("5 unosa vremena"));
});
