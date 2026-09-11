export const HOME_CREATE_SPLIT = "lg" as const;

export type CreateLayout = "inline" | "overlay";

export type CreateRequest = { kind: "closed" } | { kind: "open" };

export type CreateStatus =
  | { kind: "editing" }
  | { kind: "saving" }
  | { kind: "failed"; message: string };

export type CreateSurface =
  | { kind: "inline"; status: CreateStatus }
  | { kind: "trigger" }
  | { kind: "modal"; status: CreateStatus };

export type CreateResult =
  { ok: true } | { ok: false; error: { message: string } };

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
  error: string | undefined;
} {
  switch (status.kind) {
    case "editing":
      return { submitting: false, error: undefined };
    case "saving":
      return { submitting: true, error: undefined };
    case "failed":
      return { submitting: false, error: status.message };
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
