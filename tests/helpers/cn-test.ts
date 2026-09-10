import QUnit from "qunit";
import { cn } from "../../src/lib/helpers/cn";

QUnit.module("cn");

QUnit.test("joins class names", (assert) => {
  assert.strictEqual(cn("flex", "items-center"), "flex items-center");
});

QUnit.test("skips falsy values", (assert) => {
  assert.strictEqual(cn("block", false, null, undefined), "block");
});

QUnit.test("merges conflicting Tailwind classes", (assert) => {
  assert.strictEqual(cn("p-2", "p-4"), "p-4");
  assert.strictEqual(
    cn("text-sm text-red-500", "text-blue-500"),
    "text-sm text-blue-500",
  );
});
