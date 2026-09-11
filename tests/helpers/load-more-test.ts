import QUnit from "qunit";
import { loadMoreControl } from "../../src/ui/home/load-more";

const NEXT = "https://api.productive.io/api/v2/time_entries?page=2";
const ERROR = { kind: "network" as const, message: "nope" };

QUnit.module("loadMoreControl");

QUnit.test("complete hides the footer", (assert) => {
  assert.deepEqual(loadMoreControl({ kind: "complete" }), { visible: false });
});

QUnit.test("more shows Load more idle", (assert) => {
  assert.deepEqual(loadMoreControl({ kind: "more", next: NEXT }), {
    visible: true,
    label: "Load more",
    pending: false,
    error: undefined,
  });
});

QUnit.test("loadingMore keeps Load more pending", (assert) => {
  assert.deepEqual(loadMoreControl({ kind: "loadingMore", next: NEXT }), {
    visible: true,
    label: "Load more",
    pending: true,
    error: undefined,
  });
});

QUnit.test("moreFailed shows Retry with the error", (assert) => {
  assert.deepEqual(
    loadMoreControl({ kind: "moreFailed", next: NEXT, error: ERROR }),
    {
      visible: true,
      label: "Retry",
      pending: false,
      error: "nope",
    },
  );
});

QUnit.test("Retry and loadingMore both stay visible", (assert) => {
  const failed = loadMoreControl({
    kind: "moreFailed",
    next: NEXT,
    error: ERROR,
  });
  const loading = loadMoreControl({ kind: "loadingMore", next: NEXT });
  assert.equal(failed.visible, true);
  assert.equal(loading.visible, true);
});
