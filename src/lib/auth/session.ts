export type OrganizationId = string & { readonly __brand: "OrganizationId" };
export type AccessToken = string & { readonly __brand: "AccessToken" };
export type PersonId = string & { readonly __brand: "PersonId" };

export type Credentials = {
  organizationId: OrganizationId;
  accessToken: AccessToken;
};

export type Person = {
  id: PersonId;
  displayName: string;
};

export type AuthError = {
  kind: "unauthorized" | "network" | "invalid";
  message: string;
};

export type Session =
  | { kind: "booting" }
  | { kind: "anonymous" }
  | { kind: "expired" }
  | { kind: "unavailable"; error: AuthError }
  | { kind: "authenticated"; credentials: Credentials; person: Person };

export type LogoutArgs = { reason: "expired" };

export function parseOrganizationId(value: string): OrganizationId | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed as OrganizationId;
}

export function parseAccessToken(value: string): AccessToken | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed as AccessToken;
}

export function parsePersonId(value: string): PersonId | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed as PersonId;
}

export function displayNameFromParts(args: {
  firstName: string;
  lastName: string;
  email: string;
}): string {
  const name = `${args.firstName} ${args.lastName}`.trim();
  if (name.length > 0) {
    return name;
  }
  return args.email;
}
