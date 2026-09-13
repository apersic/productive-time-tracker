import { isRecord } from "../helpers/is-record.ts";
import type { AccessToken, Credentials, OrganizationId } from "./session.ts";
import { parseAccessToken, parseOrganizationId } from "./session.ts";

const STORAGE_KEY = "productive-time-tracker.credentials";

export function parseStoredCredentials(
  value: unknown,
): Credentials | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (
    typeof value.organizationId !== "string" ||
    typeof value.accessToken !== "string"
  ) {
    return undefined;
  }
  const organizationId = parseOrganizationId(value.organizationId);
  const accessToken = parseAccessToken(value.accessToken);
  if (!organizationId || !accessToken) {
    return undefined;
  }
  return { organizationId, accessToken };
}

export function loadCredentials(): Credentials | undefined {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return undefined;
    }
    return parseStoredCredentials(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

export function saveCredentials(credentials: Credentials): void {
  const payload: { organizationId: OrganizationId; accessToken: AccessToken } =
    {
      organizationId: credentials.organizationId,
      accessToken: credentials.accessToken,
    };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
}

export function clearCredentials(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}
