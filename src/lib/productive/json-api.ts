import type { AuthError } from "../auth/session.ts";
import { isRecord } from "../helpers/is-record.ts";

export function readStringAttribute(
  attributes: Record<string, unknown>,
  key: string,
): string {
  const value = attributes[key];
  return typeof value === "string" ? value : "";
}

export function parseJsonApiResource(
  value: unknown,
):
  | { id: string; type: string; attributes: Record<string, unknown> }
  | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (typeof value.id !== "string" || typeof value.type !== "string") {
    return undefined;
  }
  const attributes = isRecord(value.attributes) ? value.attributes : {};
  return { id: value.id, type: value.type, attributes };
}

export function parseJsonApiDataList(value: unknown): unknown[] | undefined {
  if (!isRecord(value) || !("data" in value)) {
    return undefined;
  }
  if (Array.isArray(value.data)) {
    return value.data;
  }
  if (value.data === undefined || value.data === null) {
    return [];
  }
  return [value.data];
}

export function uniqueJsonApiResource(
  json: unknown,
  type: string,
):
  | {
      ok: true;
      resource: {
        id: string;
        type: string;
        attributes: Record<string, unknown>;
      };
    }
  | { ok: false; reason: "missing" | "many" } {
  const list = parseJsonApiDataList(json);
  if (list === undefined || list.length === 0) {
    return { ok: false, reason: "missing" };
  }
  if (list.length !== 1) {
    return { ok: false, reason: "many" };
  }
  const resource = parseJsonApiResource(list[0]);
  if (!resource || resource.type !== type) {
    return { ok: false, reason: "missing" };
  }
  return { ok: true, resource };
}

export async function productiveGet(args: {
  baseUrl: string;
  path: string;
  organizationId: string;
  accessToken: string;
}): Promise<{ ok: true; json: unknown } | { ok: false; error: AuthError }> {
  const url = `${args.baseUrl.replace(/\/$/, "")}${args.path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "Content-Type": "application/vnd.api+json",
        "X-Auth-Token": args.accessToken,
        "X-Organization-Id": args.organizationId,
      },
    });
  } catch {
    return {
      ok: false,
      error: { kind: "network", message: "Could not reach Productive." },
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      error: {
        kind: "unauthorized",
        message: "Invalid token or organization ID.",
      },
    };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return {
      ok: false,
      error: {
        kind: "invalid",
        message: "Productive returned a bad response.",
      },
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: { kind: "invalid", message: "Productive rejected the request." },
    };
  }

  return { ok: true, json };
}
