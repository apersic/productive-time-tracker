import QUnit from "qunit";
import { personChip } from "../../src/pages/home/person-chip";

QUnit.module("personChip");

QUnit.test("initials from two-word name", (assert) => {
  assert.deepEqual(personChip("Ada Lovelace"), {
    initials: "AL",
    label: "Ada Lovelace",
  });
});

QUnit.test("initials from one-word name", (assert) => {
  assert.deepEqual(personChip("Pat"), {
    initials: "PA",
    label: "Pat",
  });
});

QUnit.test("initials from email local part", (assert) => {
  assert.deepEqual(personChip("ada@example.com"), {
    initials: "AD",
    label: "ada@example.com",
  });
});
