import type { Credentials, PersonId } from "../auth/session.ts";
import {
  parseServiceId,
  type ServiceId,
  type TimesheetError,
} from "../timesheet/day-timesheet.ts";
import { productiveBaseUrl } from "./authenticate.ts";
import {
  parseJsonApiDataList,
  parseJsonApiResource,
  productiveGet,
  readStringAttribute,
} from "./json-api.ts";

export type TrackableService = { id: ServiceId; name: string };

export type ServicesList =
  | { status: "loading" }
  | { status: "failed"; error: TimesheetError }
  | { status: "none" }
  | { status: "one"; service: TrackableService }
  | { status: "many"; services: readonly TrackableService[] };

function credentialsArgs(credentials: Credentials) {
  return {
    baseUrl: productiveBaseUrl(),
    organizationId: credentials.organizationId,
    accessToken: credentials.accessToken,
  };
}

export function parseTrackableServices(json: unknown): TrackableService[] {
  const list = parseJsonApiDataList(json) ?? [];
  const services: TrackableService[] = [];
  for (const item of list) {
    const resource = parseJsonApiResource(item);
    if (!resource || resource.type !== "services") {
      continue;
    }
    const id = parseServiceId(resource.id);
    if (!id) {
      continue;
    }
    services.push({
      id,
      name: readStringAttribute(resource.attributes, "name"),
    });
  }
  return services;
}

export function servicesListFrom(
  services: readonly TrackableService[],
): Exclude<
  ServicesList,
  { status: "loading" } | { status: "failed"; error: TimesheetError }
> {
  if (services.length === 0) {
    return { status: "none" };
  }
  if (services.length === 1) {
    const service = services[0];
    if (!service) {
      return { status: "none" };
    }
    return { status: "one", service };
  }
  return { status: "many", services };
}

export async function fetchTrackableServices(args: {
  credentials: Credentials;
  personId: PersonId;
}): Promise<
  { ok: true; list: ServicesList } | { ok: false; error: TimesheetError }
> {
  const person = encodeURIComponent(args.personId);
  const result = await productiveGet({
    ...credentialsArgs(args.credentials),
    path: `/services?filter[trackable_by_person_id]=${person}&filter[time_tracking_enabled]=true&per_page=200`,
  });
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    list: servicesListFrom(parseTrackableServices(result.json)),
  };
}
