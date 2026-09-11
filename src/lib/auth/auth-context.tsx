import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { authenticate } from "../../providers/productive/authenticate.ts";
import {
  clearCredentials,
  loadCredentials,
  saveCredentials,
} from "./credentials-storage.ts";
import { restoreOutcome, type AuthenticateResult } from "./restore-outcome.ts";
import type { AuthError, Credentials, Session } from "./session.ts";

export type AuthContextValue = {
  session: Session;
  login: (
    credentials: Credentials,
  ) => Promise<{ ok: true } | { ok: false; error: AuthError }>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session>(() =>
    loadCredentials() ? { kind: "booting" } : { kind: "anonymous" },
  );

  useEffect(() => {
    if (session.kind !== "booting") {
      return;
    }
    const stored = loadCredentials();
    if (!stored) {
      setSession({ kind: "anonymous" });
      return;
    }
    let cancelled = false;
    void authenticate(stored)
      .then((result) => {
        if (cancelled) {
          return;
        }
        const outcome = restoreOutcome(result);
        switch (outcome.kind) {
          case "authenticated":
            setSession(outcome.session);
            return;
          case "forget":
            clearCredentials();
            setSession({ kind: "anonymous" });
            return;
          case "unavailable":
            setSession({ kind: "unavailable", error: outcome.error });
            return;
          default: {
            const _exhaustive: never = outcome;
            return _exhaustive;
          }
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setSession({
          kind: "unavailable",
          error: {
            kind: "network",
            message: "Could not reach Productive.",
          },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [session.kind]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      async login(credentials) {
        let result: AuthenticateResult;
        try {
          result = await authenticate(credentials);
        } catch {
          return {
            ok: false,
            error: {
              kind: "network",
              message: "Could not reach Productive.",
            },
          };
        }
        if (!result.ok) {
          return result;
        }
        saveCredentials(credentials);
        setSession(result.session);
        return { ok: true };
      },
      logout() {
        clearCredentials();
        setSession({ kind: "anonymous" });
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
