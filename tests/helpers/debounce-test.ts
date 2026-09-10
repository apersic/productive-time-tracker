import QUnit from "qunit";
import { debounce } from "../../src/lib/helpers/debounce";

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

QUnit.module("debounce");

QUnit.test("does not invoke until the delay elapses", async (assert) => {
  const calls: number[] = [];
  const debounced = debounce((value: number) => {
    calls.push(value);
  }, 30);

  assert.strictEqual(debounced(1), undefined);
  assert.deepEqual(calls, []);

  await wait(50);
  assert.deepEqual(calls, [1]);
});

QUnit.test(
  "invokes once with the latest args after a burst",
  async (assert) => {
    const calls: number[] = [];
    const debounced = debounce((value: number) => {
      calls.push(value);
    }, 30);

    debounced(1);
    debounced(2);

    assert.deepEqual(calls, []);
    await wait(50);
    assert.deepEqual(calls, [2]);
  },
);
