import type { Credentials, PersonId } from "../../lib/auth/session.ts";
import {
  parseServiceId,
  type TimesheetError,
} from "../../features/timesheet/timesheet-model.ts";
import {
  dealLabel,
  emptyServiceCatalog,
  serviceGroupId,
  type ServiceCatalog,
  type ServiceGroupId,
  type ServiceLevel,
  type TrackableService,
} from "../../features/timesheet/service-catalog.ts";
import type { CalendarDay } from "../../lib/time/calendar-day.ts";
import { productiveBaseUrl } from "./authenticate.ts";
import {
  parseJsonApiDataList,
  parseJsonApiIncluded,
  parseJsonApiResource,
  parseRelationshipId,
  productiveGet,
  readStringAttribute,
  type JsonApiResource,
} from "./json-api.ts";

function credentialsArgs(credentials: Credentials) {
  return {
    baseUrl: productiveBaseUrl(),
    organizationId: credentials.organizationId,
    accessToken: credentials.accessToken,
  };
}

export function serviceCatalogPath(args: {
  personId: PersonId;
  day: CalendarDay;
  query: string | undefined;
}): string {
  const person = encodeURIComponent(args.personId);
  const day = encodeURIComponent(args.day);
  const trimmed = args.query?.trim() ?? "";
  const queryPart =
    trimmed.length > 0 ? `&filter[query]=${encodeURIComponent(trimmed)}` : "";
  return `/services?fields[services]=id,name,billable_time,estimated_time,worked_time,budgeted_time,quantity,unit_id,position,billing_type_id,section,deal,time_tracking_enabled&fields[deals]=id,name,suffix,man_day_minutes,budget,project,company,organization,date,end_date,rounding_method_id,rounding_interval_id&fields[sections]=id,name,position,deal&fields[projects]=id,name,created_at,company&fields[companies]=id,name,avatar_url&fields[organizations]=id,name,avatar_url&filter[budgets_and_deals]=true&filter[time_tracking_enabled]=true&filter[bookable_date]=${day}&filter[person_id]=${person}${queryPart}&include=deal.company,deal.subsidiary,deal.project.company,section.deal&page=1&per_page=200&sort=company,project_name,budget,section_position,position`;
}

type DraftNode =
  | {
      kind: "group";
      id: ServiceGroupId;
      level: ServiceLevel;
      label: string;
      children: DraftNode[];
    }
  | { kind: "service"; service: TrackableService };

type PlacementStep = {
  level: Exclude<ServiceLevel, "pinned">;
  id: string;
  label: string;
};

function includedResource(
  included: Map<string, JsonApiResource>,
  type: string,
  resource: { relationships?: unknown },
  name: string,
): JsonApiResource | undefined {
  const id = parseRelationshipId(resource, name);
  if (!id) {
    return undefined;
  }
  return included.get(`${type}:${id}`);
}

function placementPath(
  service: JsonApiResource,
  included: Map<string, JsonApiResource>,
): readonly PlacementStep[] {
  const section = includedResource(included, "sections", service, "section");
  const dealFromService = includedResource(included, "deals", service, "deal");
  const dealFromSection = section
    ? includedResource(included, "deals", section, "deal")
    : undefined;
  const deal = dealFromService ?? dealFromSection;
  const project = deal
    ? includedResource(included, "projects", deal, "project")
    : undefined;
  const companyFromDeal = deal
    ? includedResource(included, "companies", deal, "company")
    : undefined;
  const companyFromProject = project
    ? includedResource(included, "companies", project, "company")
    : undefined;
  const company = companyFromDeal ?? companyFromProject;

  const steps: PlacementStep[] = [];
  if (company) {
    steps.push({
      level: "company",
      id: company.id,
      label: readStringAttribute(company.attributes, "name"),
    });
  }
  if (project) {
    steps.push({
      level: "project",
      id: project.id,
      label: readStringAttribute(project.attributes, "name"),
    });
  }
  if (deal) {
    steps.push({
      level: "deal",
      id: deal.id,
      label: dealLabel({
        name: readStringAttribute(deal.attributes, "name"),
        suffix: readStringAttribute(deal.attributes, "suffix"),
      }),
    });
  }
  if (section) {
    steps.push({
      level: "section",
      id: section.id,
      label: readStringAttribute(section.attributes, "name"),
    });
  }
  return steps;
}

function insertLeaf(
  siblings: DraftNode[],
  path: readonly PlacementStep[],
  service: TrackableService,
  prefix: readonly string[],
): void {
  const head = path[0];
  if (!head) {
    siblings.push({ kind: "service", service });
    return;
  }
  const nextPrefix = [...prefix, `${head.level}:${head.id}`];
  const id = serviceGroupId(nextPrefix);
  let group: Extract<DraftNode, { kind: "group" }> | undefined;
  for (const node of siblings) {
    if (node.kind === "group" && node.id === id) {
      group = node;
      break;
    }
  }
  if (!group) {
    group = {
      kind: "group",
      id,
      level: head.level,
      label: head.label,
      children: [],
    };
    siblings.push(group);
  }
  insertLeaf(group.children, path.slice(1), service, nextPrefix);
}

export function parseServiceCatalog(json: unknown): ServiceCatalog {
  const list = parseJsonApiDataList(json) ?? [];
  const included = parseJsonApiIncluded(json);
  const roots: DraftNode[] = [];
  let serviceCount = 0;
  for (const item of list) {
    const resource = parseJsonApiResource(item);
    if (!resource || resource.type !== "services") {
      continue;
    }
    const id = parseServiceId(resource.id);
    if (!id) {
      continue;
    }
    const service: TrackableService = {
      id,
      name: readStringAttribute(resource.attributes, "name"),
    };
    insertLeaf(roots, placementPath(resource, included), service, []);
    serviceCount += 1;
  }
  if (serviceCount === 0) {
    return emptyServiceCatalog;
  }
  return { roots, serviceCount };
}

export async function fetchServiceCatalog(args: {
  credentials: Credentials;
  personId: PersonId;
  day: CalendarDay;
  query: string | undefined;
}): Promise<
  { ok: true; catalog: ServiceCatalog } | { ok: false; error: TimesheetError }
> {
  const result = await productiveGet({
    ...credentialsArgs(args.credentials),
    path: serviceCatalogPath(args),
  });
  if (!result.ok) {
    return result;
  }
  return { ok: true, catalog: parseServiceCatalog(result.json) };
}
