import { authFailureKind, type AuthError, type Session } from "./session.ts";

export type AuthenticateResult =
  | { ok: true; session: Extract<Session, { kind: "authenticated" }> }
  | { ok: false; error: AuthError };

export type RestoreOutcome =
  | {
      kind: "authenticated";
      session: Extract<Session, { kind: "authenticated" }>;
    }
  | { kind: "forget" }
  | { kind: "unavailable"; error: AuthError };

export function restoreOutcome(result: AuthenticateResult): RestoreOutcome {
  if (result.ok) {
    return { kind: "authenticated", session: result.session };
  }
  const kind = authFailureKind(result.error);
  switch (kind) {
    case "unauthorized":
      return { kind: "forget" };
    case "network":
    case "invalid":
      return { kind: "unavailable", error: result.error };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
