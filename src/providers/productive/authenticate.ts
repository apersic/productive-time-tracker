import type { AuthenticateResult } from "../../lib/auth/restore-outcome.ts";
import type { Credentials } from "../../lib/auth/session.ts";
import {
  currentPersonFromPayload,
  currentUserFromPayload,
} from "./identity.ts";
import { productiveGet } from "./json-api.ts";

export const DEFAULT_PRODUCTIVE_BASE_URL = "https://api.productive.io/api/v2";

export function productiveBaseUrl(): string {
  const fromEnv = import.meta.env?.VITE_BASE_URL;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  return DEFAULT_PRODUCTIVE_BASE_URL;
}

export async function authenticate(
  credentials: Credentials,
): Promise<AuthenticateResult> {
  const usersResult = await productiveGet({
    baseUrl: productiveBaseUrl(),
    path: "/users",
    organizationId: credentials.organizationId,
    accessToken: credentials.accessToken,
  });
  if (!usersResult.ok) {
    return usersResult;
  }

  const user = currentUserFromPayload(usersResult.json);
  if (!user.ok) {
    return user;
  }

  const peopleResult = await productiveGet({
    baseUrl: productiveBaseUrl(),
    path: `/people?filter[email]=${encodeURIComponent(user.email)}`,
    organizationId: credentials.organizationId,
    accessToken: credentials.accessToken,
  });
  if (!peopleResult.ok) {
    return peopleResult;
  }

  return currentPersonFromPayload({
    credentials,
    email: user.email,
    json: peopleResult.json,
  });
}
