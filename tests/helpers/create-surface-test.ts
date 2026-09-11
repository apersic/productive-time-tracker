import { defaultSystem } from "@chakra-ui/react";
import QUnit from "qunit";
import {
  createSurface,
  dismissable,
  entryFormStatus,
  HOME_CREATE_SPLIT,
  type CreateLayout,
  type CreateRequest,
  type CreateStatus,
  type CreateSurface,
} from "../../src/ui";

const CLOSED: CreateRequest = { kind: "closed" };
const OPEN: CreateRequest = { kind: "open" };
const EDITING: CreateStatus = { kind: "editing" };
const SAVING: CreateStatus = { kind: "saving" };
const FAILED: CreateStatus = { kind: "failed", message: "nope" };

function mountsForm(surface: CreateSurface): boolean {
  switch (surface.kind) {
    case "inline":
    case "modal":
      return true;
    case "trigger":
      return false;
    default: {
      const _exhaustive: never = surface;
      return _exhaustive;
    }
  }
}

function showsOnlyTrigger(surface: CreateSurface): boolean {
  switch (surface.kind) {
    case "trigger":
      return true;
    case "inline":
    case "modal":
      return false;
    default: {
      const _exhaustive: never = surface;
      return _exhaustive;
    }
  }
}

QUnit.module("createSurface");

QUnit.test(
  "every layout and request shows exactly one create affordance",
  (assert) => {
    const layouts: CreateLayout[] = ["inline", "overlay"];
    const requests: CreateRequest[] = [CLOSED, OPEN];
    for (const layout of layouts) {
      for (const request of requests) {
        const surface = createSurface({
          layout,
          request,
          status: EDITING,
        });
        assert.true(
          mountsForm(surface) !== showsOnlyTrigger(surface),
          `${layout} + ${request.kind}`,
        );
      }
    }
  },
);

QUnit.test("widening past lg drops the modal for the inline form", (assert) => {
  assert.deepEqual(
    createSurface({ layout: "overlay", request: OPEN, status: EDITING }),
    { kind: "modal", status: EDITING },
  );
  assert.deepEqual(
    createSurface({ layout: "inline", request: OPEN, status: EDITING }),
    { kind: "inline", status: EDITING },
  );
});

QUnit.test(
  "a failed create on desktop does not pop a modal when narrowed",
  (assert) => {
    assert.deepEqual(
      createSurface({ layout: "overlay", request: CLOSED, status: FAILED }),
      { kind: "trigger" },
    );
  },
);

QUnit.test("HOME_CREATE_SPLIT pins Chakra lg at 64rem", (assert) => {
  assert.equal(HOME_CREATE_SPLIT, "lg");
  assert.equal(
    defaultSystem.breakpoints.values.find(
      (breakpoint) => breakpoint.name === "lg",
    )?.min,
    "64rem",
  );
});

QUnit.test("dismissable is literal per status", (assert) => {
  assert.equal(dismissable(EDITING), true);
  assert.equal(dismissable(SAVING), false);
  assert.equal(dismissable(FAILED), true);
});

QUnit.test("entryFormStatus is literal per status", (assert) => {
  assert.deepEqual(entryFormStatus(EDITING), {
    submitting: false,
    error: undefined,
  });
  assert.deepEqual(entryFormStatus(SAVING), {
    submitting: true,
    error: undefined,
  });
  assert.deepEqual(entryFormStatus(FAILED), {
    submitting: false,
    error: "nope",
  });
});
