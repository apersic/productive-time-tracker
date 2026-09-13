import type { AuthenticateResult } from "../../lib/auth/restore-outcome.ts";
import type { AuthError, Credentials, Person } from "../../lib/auth/session.ts";
import { displayNameFromParts, parsePersonId } from "../../lib/auth/session.ts";
import { readStringAttribute, uniqueJsonApiResource } from "./json-api.ts";

export function currentUserFromPayload(
  json: unknown,
): { ok: true; email: string } | { ok: false; error: AuthError } {
  const users = uniqueJsonApiResource(json, "users");
  if (!users.ok) {
    return {
      ok: false,
      error: users.reason === "many" ? "manyUsers" : "noUser",
    };
  }
  const email = readStringAttribute(users.resource.attributes, "email");
  if (email.length === 0) {
    return {
      ok: false,
      error: "noUserEmail",
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
      error: people.reason === "many" ? "manyPeople" : "noPerson",
    };
  }
  const personId = parsePersonId(people.resource.id);
  if (!personId) {
    return {
      ok: false,
      error: "noPerson",
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
