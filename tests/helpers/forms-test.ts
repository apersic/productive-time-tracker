import QUnit from "qunit";
import { durationFieldIssue, presenceIssue } from "../../src/lib/forms";
import { copyFor } from "../../src/lib/copy";
import { parseDurationDraft } from "../../src/lib/time";

QUnit.module("field issues");

QUnit.test("presenceIssue is blank only for empty or whitespace", (assert) => {
  assert.strictEqual(presenceIssue(""), "blank");
  assert.strictEqual(presenceIssue("   "), "blank");
  assert.strictEqual(presenceIssue("61648"), undefined);
});

QUnit.test("fieldIssue copy names the two issues", (assert) => {
  const en = copyFor("en");
  assert.strictEqual(en.fieldIssue.blank, "Can't be blank");
  assert.strictEqual(en.fieldIssue.tooLong, "Must be less than 24 hours");
});

QUnit.test("durationFieldIssue maps a draft onto a field issue", (assert) => {
  assert.strictEqual(durationFieldIssue(parseDurationDraft("")), undefined);
  assert.strictEqual(durationFieldIssue(parseDurationDraft("abc")), "blank");
  assert.strictEqual(
    durationFieldIssue(parseDurationDraft("24:00")),
    "tooLong",
  );
  assert.strictEqual(durationFieldIssue(parseDurationDraft("1:30")), undefined);
});
