import QUnit from "qunit";
import {
  parseJsonApiIncluded,
  parseJsonApiLinks,
  parseRelationshipId,
  readNumberAttribute,
} from "../../src/providers/productive";
import {
  formatHhMm,
  formatSpokenDuration,
  parseCalendarDay,
  parseDurationDraft,
  parseHhMm,
  parseMinutes,
  previousCalendarDay,
  nextCalendarDay,
  todayLocal,
} from "../../src/lib/time";

QUnit.module("calendar day");

QUnit.test("parseCalendarDay accepts YYYY-MM-DD", (assert) => {
  assert.strictEqual(parseCalendarDay("2026-09-10"), "2026-09-10");
});

QUnit.test("parseCalendarDay rejects other shapes", (assert) => {
  assert.strictEqual(parseCalendarDay("2026/09/10"), undefined);
  assert.strictEqual(parseCalendarDay(""), undefined);
  assert.strictEqual(parseCalendarDay("2026-9-10"), undefined);
  assert.strictEqual(parseCalendarDay("2026-99-99"), undefined);
  assert.strictEqual(parseCalendarDay("2026-02-31"), undefined);
});

QUnit.test("todayLocal uses the local calendar date", (assert) => {
  assert.strictEqual(todayLocal(new Date(2026, 8, 10, 23, 30)), "2026-09-10");
});

QUnit.test("previousCalendarDay subtracts one local day", (assert) => {
  const tenth = parseCalendarDay("2026-09-10");
  const marchFirst = parseCalendarDay("2026-03-01");
  assert.ok(tenth && marchFirst);
  if (!tenth || !marchFirst) {
    return;
  }
  assert.strictEqual(previousCalendarDay(tenth), "2026-09-09");
  assert.strictEqual(previousCalendarDay(marchFirst), "2026-02-28");
});

QUnit.test("nextCalendarDay adds one local day", (assert) => {
  const tenth = parseCalendarDay("2026-09-10");
  const feb28 = parseCalendarDay("2026-02-28");
  assert.ok(tenth && feb28);
  if (!tenth || !feb28) {
    return;
  }
  assert.strictEqual(nextCalendarDay(tenth), "2026-09-11");
  assert.strictEqual(nextCalendarDay(feb28), "2026-03-01");
});

QUnit.module("duration");

QUnit.test("formatHhMm pads hours and minutes", (assert) => {
  assert.strictEqual(formatHhMm(parseMinutes(0)!), "00:00");
  assert.strictEqual(formatHhMm(parseMinutes(90)!), "01:30");
  assert.strictEqual(formatHhMm(parseMinutes(480)!), "08:00");
});

QUnit.test("parseHhMm reads hours and minutes", (assert) => {
  assert.strictEqual(parseHhMm("1:05"), 65);
  assert.strictEqual(parseHhMm("01:30"), 90);
  assert.strictEqual(parseHhMm("99:99"), undefined);
  assert.strictEqual(parseHhMm(""), undefined);
});

QUnit.test("parseDurationDraft reads bare minutes and HH:MM", (assert) => {
  const twentyThree = parseDurationDraft("23");
  assert.strictEqual(twentyThree.kind, "ready");
  if (twentyThree.kind === "ready") {
    assert.strictEqual(twentyThree.minutes, 23);
    assert.strictEqual(formatSpokenDuration(twentyThree.minutes), "= 23min");
  }

  const eightyThree = parseDurationDraft("83");
  assert.strictEqual(eightyThree.kind, "ready");
  if (eightyThree.kind === "ready") {
    assert.strictEqual(eightyThree.minutes, 83);
    assert.strictEqual(formatSpokenDuration(eightyThree.minutes), "= 1h 23min");
  }

  const oneThirty = parseDurationDraft("1:30");
  assert.strictEqual(oneThirty.kind, "ready");
  if (oneThirty.kind === "ready") {
    assert.strictEqual(oneThirty.minutes, 90);
    assert.strictEqual(formatSpokenDuration(oneThirty.minutes), "= 1h 30min");
  }

  const ninety = parseDurationDraft("90");
  assert.strictEqual(ninety.kind, "ready");
  if (ninety.kind === "ready") {
    assert.strictEqual(ninety.minutes, 90);
  }

  assert.deepEqual(parseDurationDraft("abc"), { kind: "invalid" });
  assert.deepEqual(parseDurationDraft("1.5"), { kind: "invalid" });
  assert.deepEqual(parseDurationDraft("1:99"), { kind: "invalid" });
  assert.deepEqual(parseDurationDraft("1:2:3"), { kind: "invalid" });
  assert.deepEqual(parseDurationDraft(""), { kind: "empty" });
  assert.deepEqual(parseDurationDraft("24:00"), { kind: "tooLong" });
  assert.deepEqual(parseDurationDraft("1440"), { kind: "tooLong" });

  const lastMinute = parseDurationDraft("23:59");
  assert.strictEqual(lastMinute.kind, "ready");
  if (lastMinute.kind === "ready") {
    assert.strictEqual(lastMinute.minutes, 1439);
  }
});

QUnit.test("formatSpokenDuration names hours and minutes", (assert) => {
  const sixty = parseMinutes(60);
  const zero = parseMinutes(0);
  assert.notStrictEqual(sixty, undefined);
  assert.notStrictEqual(zero, undefined);
  if (sixty === undefined || zero === undefined) {
    return;
  }
  assert.strictEqual(formatSpokenDuration(sixty), "= 1h");
  assert.strictEqual(formatSpokenDuration(zero), "= 0min");
});

QUnit.module("json-api attributes");

QUnit.test("readNumberAttribute keeps finite numbers", (assert) => {
  assert.strictEqual(readNumberAttribute({ time: 90 }, "time"), 90);
  assert.strictEqual(readNumberAttribute({ time: "90" }, "time"), undefined);
});

QUnit.test("parseJsonApiLinks reads a next URL", (assert) => {
  assert.strictEqual(
    parseJsonApiLinks({ links: { next: "https://api.example/page2" } }).next,
    "https://api.example/page2",
  );
  assert.strictEqual(parseJsonApiLinks({}).next, undefined);
});

QUnit.test("parseJsonApiIncluded keys by type:id", (assert) => {
  const included = parseJsonApiIncluded({
    included: [
      { id: "42", type: "services", attributes: { name: "Dev" } },
      { id: "bad" },
    ],
  });
  assert.strictEqual(included.get("services:42")?.id, "42");
  assert.strictEqual(included.get("services:42")?.type, "services");
  assert.strictEqual(included.size, 1);
});

QUnit.test("parseRelationshipId reads the related id", (assert) => {
  assert.strictEqual(
    parseRelationshipId(
      {
        relationships: {
          service: { data: { id: "99", type: "services" } },
        },
      },
      "service",
    ),
    "99",
  );
});
