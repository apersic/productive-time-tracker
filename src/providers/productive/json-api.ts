import type { AuthError } from "../../lib/auth/session.ts";
import { isRecord } from "../../lib/helpers/is-record.ts";

export type JsonApiResource = {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: unknown;
};

export function readStringAttribute(
  attributes: Record<string, unknown>,
  key: string,
): string {
  const value = attributes[key];
  return typeof value === "string" ? value : "";
}

export function readNumberAttribute(
  attributes: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = attributes[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

export function readTimestampMs(
  attributes: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = attributes[key];
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : undefined;
}

export function parseJsonApiResource(
  value: unknown,
): JsonApiResource | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (typeof value.id !== "string" || typeof value.type !== "string") {
    return undefined;
  }
  const attributes = isRecord(value.attributes) ? value.attributes : {};
  if ("relationships" in value) {
    return {
      id: value.id,
      type: value.type,
      attributes,
      relationships: value.relationships,
    };
  }
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

export function parseJsonApiLinks(json: unknown): { next: string | undefined } {
  if (!isRecord(json) || !isRecord(json.links)) {
    return { next: undefined };
  }
  const next = json.links.next;
  if (typeof next !== "string" || next.length === 0) {
    return { next: undefined };
  }
  return { next };
}

export function parseJsonApiIncluded(
  json: unknown,
): Map<string, JsonApiResource> {
  const included = new Map<string, JsonApiResource>();
  if (!isRecord(json) || !Array.isArray(json.included)) {
    return included;
  }
  for (const item of json.included) {
    const resource = parseJsonApiResource(item);
    if (!resource) {
      continue;
    }
    included.set(`${resource.type}:${resource.id}`, resource);
  }
  return included;
}

export function parseRelationshipId(
  resource: { relationships?: unknown },
  name: string,
): string | undefined {
  if (!isRecord(resource.relationships)) {
    return undefined;
  }
  const relationship = resource.relationships[name];
  if (!isRecord(relationship) || !isRecord(relationship.data)) {
    return undefined;
  }
  return typeof relationship.data.id === "string"
    ? relationship.data.id
    : undefined;
}

export function uniqueJsonApiResource(
  json: unknown,
  type: string,
):
  | { ok: true; resource: JsonApiResource }
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

export function productiveRequestUrl(baseUrl: string, path: string): string {
  if (path.startsWith("https://") || path.startsWith("http://")) {
    return path;
  }
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export async function productiveRequest(args: {
  baseUrl: string;
  path: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  organizationId: string;
  accessToken: string;
  body?: unknown;
}): Promise<
  { ok: true; json: unknown } | { ok: false; error: AuthError; status?: number }
> {
  const url = productiveRequestUrl(args.baseUrl, args.path);
  let response: Response;
  try {
    response = await fetch(url, {
      method: args.method,
      headers: {
        "Content-Type": "application/vnd.api+json",
        "X-Auth-Token": args.accessToken,
        "X-Organization-Id": args.organizationId,
      },
      ...(args.body !== undefined ? { body: JSON.stringify(args.body) } : {}),
    });
  } catch {
    return {
      ok: false,
      error: "unreachable",
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      error: "badCredentials",
      status: response.status,
    };
  }

  const text = await response.text();
  if (response.status === 204 || text.length === 0) {
    if (response.ok) {
      return { ok: true, json: null };
    }
    return {
      ok: false,
      error: "requestRejected",
      status: response.status,
    };
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: "badResponse",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: "requestRejected",
      status: response.status,
    };
  }

  return { ok: true, json };
}

export async function productiveGet(args: {
  baseUrl: string;
  path: string;
  organizationId: string;
  accessToken: string;
}): Promise<
  { ok: true; json: unknown } | { ok: false; error: AuthError; status?: number }
> {
  return productiveRequest({ ...args, method: "GET" });
}
