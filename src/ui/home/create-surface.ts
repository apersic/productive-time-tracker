import type { TimesheetError } from "../../features/timesheet";

export const HOME_CREATE_SPLIT = "lg" as const;

export const HOME_CREATE_PORTAL_ID = "home-create-portal";

export const ENTRY_FORM_WIDTH = "22rem";

export const HOME_CONTENT_MAX_W = "80rem";

export const HOME_GRID_COLUMNS = {
  base: "1fr",
  lg: `${ENTRY_FORM_WIDTH} 1fr`,
} as const;

export type CreateLayout = "inline" | "overlay";

export type CreateRequest = { kind: "closed" } | { kind: "open" };

export type CreateStatus =
  | { kind: "editing" }
  | { kind: "saving" }
  | { kind: "failed"; error: TimesheetError };

export type CreateSurface =
  | { kind: "inline"; status: CreateStatus }
  | { kind: "trigger" }
  | { kind: "modal"; status: CreateStatus };

export type CreateResult = { ok: true } | { ok: false; error: TimesheetError };

export function createSurface(args: {
  layout: CreateLayout;
  request: CreateRequest;
  status: CreateStatus;
}): CreateSurface {
  switch (args.layout) {
    case "inline":
      return { kind: "inline", status: args.status };
    case "overlay":
      switch (args.request.kind) {
        case "closed":
          return { kind: "trigger" };
        case "open":
          return { kind: "modal", status: args.status };
        default: {
          const _exhaustive: never = args.request;
          return _exhaustive;
        }
      }
    default: {
      const _exhaustive: never = args.layout;
      return _exhaustive;
    }
  }
}

export function entryFormStatus(status: CreateStatus): {
  submitting: boolean;
  error: TimesheetError | undefined;
} {
  switch (status.kind) {
    case "editing":
      return { submitting: false, error: undefined };
    case "saving":
      return { submitting: true, error: undefined };
    case "failed":
      return { submitting: false, error: status.error };
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function dismissable(status: CreateStatus): boolean {
  switch (status.kind) {
    case "editing":
    case "failed":
      return true;
    case "saving":
      return false;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
