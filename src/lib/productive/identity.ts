import type { AuthenticateResult } from "../auth/restore-outcome.ts";
import type { AuthError, Credentials, Person } from "../auth/session.ts";
import { displayNameFromParts, parsePersonId } from "../auth/session.ts";
import { readStringAttribute, uniqueJsonApiResource } from "./json-api.ts";

export function currentUserFromPayload(
  json: unknown,
): { ok: true; email: string } | { ok: false; error: AuthError } {
  const users = uniqueJsonApiResource(json, "users");
  if (!users.ok) {
    return {
      ok: false,
      error: {
        kind: "invalid",
        message:
          users.reason === "many"
            ? "Productive returned more than one user."
            : "Could not load the current user.",
      },
    };
  }
  const email = readStringAttribute(users.resource.attributes, "email");
  if (email.length === 0) {
    return {
      ok: false,
      error: { kind: "invalid", message: "The current user has no email." },
    };
  }
  return { ok: true, email };
}

export function currentPersonFromPayload(args: {
  credentials: Credentials;
  email: string;
  json: unknown;
}): AuthenticateResult {
  const people = uniqueJsonApiResource(args.json, "people");
  if (!people.ok) {
    return {
      ok: false,
      error: {
        kind: "invalid",
        message:
          people.reason === "many"
            ? "Productive returned more than one person."
            : "Could not load the current person.",
      },
    };
  }
  const personId = parsePersonId(people.resource.id);
  if (!personId) {
    return {
      ok: false,
      error: { kind: "invalid", message: "Could not load the current person." },
    };
  }
  const person: Person = {
    id: personId,
    displayName: displayNameFromParts({
      firstName: readStringAttribute(people.resource.attributes, "first_name"),
      lastName: readStringAttribute(people.resource.attributes, "last_name"),
      email: args.email,
    }),
  };
  return {
    ok: true,
    session: {
      kind: "authenticated",
      credentials: args.credentials,
      person,
    },
  };
}
