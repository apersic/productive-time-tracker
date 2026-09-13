import QUnit from "qunit";
import { loadMoreControl } from "../../src/ui/home/load-more";

const NEXT = "https://api.productive.io/api/v2/time_entries?page=2";
const ERROR = "unreachable";

QUnit.module("loadMoreControl");

QUnit.test("complete hides the footer", (assert) => {
  assert.deepEqual(loadMoreControl({ kind: "complete" }), { visible: false });
});

QUnit.test(
  "more hides the footer because scrolling loads the next page",
  (assert) => {
    assert.deepEqual(loadMoreControl({ kind: "more", next: NEXT }), {
      visible: false,
    });
  },
);

QUnit.test("loadingMore shows a status", (assert) => {
  assert.deepEqual(loadMoreControl({ kind: "loadingMore", next: NEXT }), {
    visible: true,
    kind: "status",
  });
});

QUnit.test("moreFailed shows Retry with the error", (assert) => {
  assert.deepEqual(
    loadMoreControl({ kind: "moreFailed", next: NEXT, error: ERROR }),
    {
      visible: true,
      kind: "retry",
      error: ERROR,
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
