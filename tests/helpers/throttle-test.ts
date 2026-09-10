import QUnit from "qunit";
import { throttle } from "../../src/lib/helpers/throttle";

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

QUnit.module("throttle");

QUnit.test("invokes on the leading edge once", (assert) => {
  const calls: number[] = [];
  const throttled = throttle((value: number) => {
    calls.push(value);
  }, 50);

  assert.strictEqual(throttled(7), undefined);
  assert.deepEqual(calls, [7]);
});

QUnit.test(
  "drops calls inside the window and allows another after",
  async (assert) => {
    const calls: number[] = [];
    const throttled = throttle((value: number) => {
      calls.push(value);
    }, 40);

    throttled(1);
    throttled(2);
    assert.deepEqual(calls, [1]);

    await wait(60);
    throttled(3);
    assert.deepEqual(calls, [1, 3]);
  },
);
