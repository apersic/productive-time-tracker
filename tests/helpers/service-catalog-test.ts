import QUnit from "qunit";
import { parsePersonId } from "../../src/lib/auth";
import { parseCalendarDay } from "../../src/lib/time";
import {
  parseServiceId,
  catalogRows,
  catalogWithPinned,
  emptyServiceCatalog,
  openedByDefault,
  serviceAvailability,
  serviceGroupId,
  type ServiceCatalog,
} from "../../src/features/timesheet";
import {
  parseServiceCatalog,
  serviceCatalogPath,
} from "../../src/providers/productive";

function serviceId(value: string) {
  const parsed = parseServiceId(value);
  if (!parsed) {
    throw new Error(`invalid service id ${value}`);
  }
  return parsed;
}

function personId(value: string) {
  const parsed = parsePersonId(value);
  if (!parsed) {
    throw new Error(`invalid person id ${value}`);
  }
  return parsed;
}

function day(value: string) {
  const parsed = parseCalendarDay(value);
  if (!parsed) {
    throw new Error(`invalid day ${value}`);
  }
  return parsed;
}

function rel(type: string, id: string) {
  return { data: { type, id } };
}

const development = { id: serviceId("svc-1"), name: "Development" };
const design = { id: serviceId("svc-2"), name: "Design" };

QUnit.module("parseServiceCatalog");

QUnit.test(
  "flat mock with no included is a root leaf named Development",
  (assert) => {
    assert.deepEqual(
      parseServiceCatalog({
        data: [
          {
            id: "svc-1",
            type: "services",
            attributes: { name: "Development" },
          },
        ],
      }),
      {
        roots: [{ kind: "service", service: development }],
        serviceCount: 1,
      },
    );
  },
);

QUnit.test(
  "duplicate service ids keep the first leaf and count once",
  (assert) => {
    assert.deepEqual(
      parseServiceCatalog({
        data: [
          {
            id: "svc-1",
            type: "services",
            attributes: { name: "Development" },
          },
          {
            id: "svc-1",
            type: "services",
            attributes: { name: "Other" },
          },
        ],
      }),
      {
        roots: [{ kind: "service", service: development }],
        serviceCount: 1,
      },
    );
  },
);

QUnit.test(
  "two companies keep [SAMPLE] labels and expandable children",
  (assert) => {
    assert.deepEqual(
      parseServiceCatalog({
        data: [
          {
            id: "svc-1",
            type: "services",
            attributes: { name: "Development" },
            relationships: { deal: rel("deals", "d1") },
          },
          {
            id: "svc-2",
            type: "services",
            attributes: { name: "Design" },
            relationships: { deal: rel("deals", "d2") },
          },
        ],
        included: [
          {
            id: "d1",
            type: "deals",
            attributes: { name: "Deal A", suffix: "" },
            relationships: {
              project: rel("projects", "p1"),
              company: rel("companies", "c1"),
            },
          },
          {
            id: "d2",
            type: "deals",
            attributes: { name: "Deal B", suffix: "" },
            relationships: {
              project: rel("projects", "p2"),
              company: rel("companies", "c2"),
            },
          },
          {
            id: "p1",
            type: "projects",
            attributes: { name: "Project A" },
            relationships: { company: rel("companies", "c1") },
          },
          {
            id: "p2",
            type: "projects",
            attributes: { name: "Project B" },
            relationships: { company: rel("companies", "c2") },
          },
          {
            id: "c1",
            type: "companies",
            attributes: { name: "Company A [SAMPLE]" },
          },
          {
            id: "c2",
            type: "companies",
            attributes: { name: "Company B [SAMPLE]" },
          },
        ],
      }),
      {
        roots: [
          {
            kind: "group",
            id: serviceGroupId(["company:c1"]),
            level: "company",
            label: "Company A [SAMPLE]",
            children: [
              {
                kind: "group",
                id: serviceGroupId(["company:c1", "project:p1"]),
                level: "project",
                label: "Project A",
                children: [
                  {
                    kind: "group",
                    id: serviceGroupId(["company:c1", "project:p1", "deal:d1"]),
                    level: "deal",
                    label: "Deal A",
                    children: [{ kind: "service", service: development }],
                  },
                ],
              },
            ],
          },
          {
            kind: "group",
            id: serviceGroupId(["company:c2"]),
            level: "company",
            label: "Company B [SAMPLE]",
            children: [
              {
                kind: "group",
                id: serviceGroupId(["company:c2", "project:p2"]),
                level: "project",
                label: "Project B",
                children: [
                  {
                    kind: "group",
                    id: serviceGroupId(["company:c2", "project:p2", "deal:d2"]),
                    level: "deal",
                    label: "Deal B",
                    children: [{ kind: "service", service: design }],
                  },
                ],
              },
            ],
          },
        ],
        serviceCount: 2,
      },
    );
  },
);

QUnit.test(
  "a service reached only through section.deal is placed",
  (assert) => {
    assert.deepEqual(
      parseServiceCatalog({
        data: [
          {
            id: "svc-1",
            type: "services",
            attributes: { name: "Development" },
            relationships: { section: rel("sections", "s1") },
          },
        ],
        included: [
          {
            id: "s1",
            type: "sections",
            attributes: { name: "Build" },
            relationships: { deal: rel("deals", "d1") },
          },
          {
            id: "d1",
            type: "deals",
            attributes: { name: "Website", suffix: "" },
            relationships: {
              project: rel("projects", "p1"),
              company: rel("companies", "c1"),
            },
          },
          {
            id: "p1",
            type: "projects",
            attributes: { name: "App" },
            relationships: { company: rel("companies", "c1") },
          },
          {
            id: "c1",
            type: "companies",
            attributes: { name: "Company A [SAMPLE]" },
          },
        ],
      }),
      {
        roots: [
          {
            kind: "group",
            id: serviceGroupId(["company:c1"]),
            level: "company",
            label: "Company A [SAMPLE]",
            children: [
              {
                kind: "group",
                id: serviceGroupId(["company:c1", "project:p1"]),
                level: "project",
                label: "App",
                children: [
                  {
                    kind: "group",
                    id: serviceGroupId(["company:c1", "project:p1", "deal:d1"]),
                    level: "deal",
                    label: "Website",
                    children: [
                      {
                        kind: "group",
                        id: serviceGroupId([
                          "company:c1",
                          "project:p1",
                          "deal:d1",
                          "section:s1",
                        ]),
                        level: "section",
                        label: "Build",
                        children: [{ kind: "service", service: development }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        serviceCount: 1,
      },
    );
  },
);

QUnit.test("a deal with no project nests under company then deal", (assert) => {
  assert.deepEqual(
    parseServiceCatalog({
      data: [
        {
          id: "svc-1",
          type: "services",
          attributes: { name: "Development" },
          relationships: { deal: rel("deals", "d1") },
        },
      ],
      included: [
        {
          id: "d1",
          type: "deals",
          attributes: { name: "Retainers", suffix: "" },
          relationships: { company: rel("companies", "c1") },
        },
        {
          id: "c1",
          type: "companies",
          attributes: { name: "Company A [SAMPLE]" },
        },
      ],
    }),
    {
      roots: [
        {
          kind: "group",
          id: serviceGroupId(["company:c1"]),
          level: "company",
          label: "Company A [SAMPLE]",
          children: [
            {
              kind: "group",
              id: serviceGroupId(["company:c1", "deal:d1"]),
              level: "deal",
              label: "Retainers",
              children: [{ kind: "service", service: development }],
            },
          ],
        },
      ],
      serviceCount: 1,
    },
  );
});

QUnit.test("deal.company wins over project.company", (assert) => {
  assert.deepEqual(
    parseServiceCatalog({
      data: [
        {
          id: "svc-1",
          type: "services",
          attributes: { name: "Development" },
          relationships: { deal: rel("deals", "d1") },
        },
      ],
      included: [
        {
          id: "d1",
          type: "deals",
          attributes: { name: "Website", suffix: "" },
          relationships: {
            project: rel("projects", "p1"),
            company: rel("companies", "c1"),
          },
        },
        {
          id: "p1",
          type: "projects",
          attributes: { name: "App" },
          relationships: { company: rel("companies", "c2") },
        },
        {
          id: "c1",
          type: "companies",
          attributes: { name: "Company A [SAMPLE]" },
        },
        {
          id: "c2",
          type: "companies",
          attributes: { name: "Company B [SAMPLE]" },
        },
      ],
    }).roots[0],
    {
      kind: "group",
      id: serviceGroupId(["company:c1"]),
      level: "company",
      label: "Company A [SAMPLE]",
      children: [
        {
          kind: "group",
          id: serviceGroupId(["company:c1", "project:p1"]),
          level: "project",
          label: "App",
          children: [
            {
              kind: "group",
              id: serviceGroupId(["company:c1", "project:p1", "deal:d1"]),
              level: "deal",
              label: "Website",
              children: [{ kind: "service", service: development }],
            },
          ],
        },
      ],
    },
  );
});

QUnit.test("deal suffix joins with a space when non-empty", (assert) => {
  assert.deepEqual(
    parseServiceCatalog({
      data: [
        {
          id: "svc-1",
          type: "services",
          attributes: { name: "Development" },
          relationships: { deal: rel("deals", "d1") },
        },
      ],
      included: [
        {
          id: "d1",
          type: "deals",
          attributes: { name: "Website", suffix: "Q1" },
          relationships: { company: rel("companies", "c1") },
        },
        {
          id: "c1",
          type: "companies",
          attributes: { name: "Company A [SAMPLE]" },
        },
      ],
    }),
    {
      roots: [
        {
          kind: "group",
          id: serviceGroupId(["company:c1"]),
          level: "company",
          label: "Company A [SAMPLE]",
          children: [
            {
              kind: "group",
              id: serviceGroupId(["company:c1", "deal:d1"]),
              level: "deal",
              label: "Website Q1",
              children: [{ kind: "service", service: development }],
            },
          ],
        },
      ],
      serviceCount: 1,
    },
  );
});

QUnit.module("serviceAvailability");

QUnit.test("none, one, many, and a pin turning none into one", (assert) => {
  assert.deepEqual(
    serviceAvailability({ catalog: emptyServiceCatalog, pinned: undefined }),
    { status: "none" },
  );
  assert.deepEqual(
    serviceAvailability({
      catalog: {
        roots: [{ kind: "service", service: development }],
        serviceCount: 1,
      },
      pinned: undefined,
    }),
    { status: "one", service: development },
  );
  assert.deepEqual(
    serviceAvailability({
      catalog: {
        roots: [
          { kind: "service", service: development },
          { kind: "service", service: design },
        ],
        serviceCount: 2,
      },
      pinned: undefined,
    }),
    { status: "many" },
  );
  assert.deepEqual(
    serviceAvailability({ catalog: emptyServiceCatalog, pinned: development }),
    { status: "one", service: development },
  );
  assert.deepEqual(
    catalogWithPinned({ catalog: emptyServiceCatalog, pinned: development }),
    {
      roots: [
        {
          kind: "group",
          id: serviceGroupId(["pinned"]),
          level: "pinned",
          label: "Current service",
          children: [{ kind: "service", service: development }],
        },
      ],
      serviceCount: 1,
    },
  );
});

QUnit.module("catalogRows");

QUnit.test(
  "hides children when collapsed and shows them when opened",
  (assert) => {
    const companyId = serviceGroupId(["company:c1"]);
    const catalog: ServiceCatalog = {
      roots: [
        {
          kind: "group",
          id: companyId,
          level: "company",
          label: "Company A [SAMPLE]",
          children: [{ kind: "service", service: development }],
        },
      ],
      serviceCount: 1,
    };
    assert.deepEqual(
      catalogRows({
        catalog,
        expansion: { mode: "collapsed", opened: new Set() },
        selected: undefined,
      }),
      [
        {
          kind: "group",
          id: companyId,
          level: "company",
          label: "Company A [SAMPLE]",
          depth: 0,
          expanded: false,
          serviceCount: 1,
        },
      ],
    );
    assert.deepEqual(
      catalogRows({
        catalog,
        expansion: { mode: "collapsed", opened: new Set([companyId]) },
        selected: development.id,
      }),
      [
        {
          kind: "group",
          id: companyId,
          level: "company",
          label: "Company A [SAMPLE]",
          depth: 0,
          expanded: true,
          serviceCount: 1,
        },
        {
          kind: "service",
          service: development,
          depth: 1,
          selected: true,
        },
      ],
    );
  },
);

QUnit.module("openedByDefault");

QUnit.test(
  "opens a group whose only child is another group, and leaves a two-deal company closed",
  (assert) => {
    const companySolo = serviceGroupId(["company:c1"]);
    const dealSolo = serviceGroupId(["company:c1", "deal:d1"]);
    const companyMany = serviceGroupId(["company:c2"]);
    const catalog: ServiceCatalog = {
      roots: [
        {
          kind: "group",
          id: companySolo,
          level: "company",
          label: "Solo",
          children: [
            {
              kind: "group",
              id: dealSolo,
              level: "deal",
              label: "Only deal",
              children: [{ kind: "service", service: development }],
            },
          ],
        },
        {
          kind: "group",
          id: companyMany,
          level: "company",
          label: "Many",
          children: [
            {
              kind: "group",
              id: serviceGroupId(["company:c2", "deal:d2"]),
              level: "deal",
              label: "Deal A",
              children: [{ kind: "service", service: development }],
            },
            {
              kind: "group",
              id: serviceGroupId(["company:c2", "deal:d3"]),
              level: "deal",
              label: "Deal B",
              children: [{ kind: "service", service: design }],
            },
          ],
        },
      ],
      serviceCount: 3,
    };
    assert.deepEqual([...openedByDefault(catalog)], [companySolo]);
  },
);

QUnit.module("serviceCatalogPath");

QUnit.test(
  "omits empty query and includes asd, bookable_date, person_id",
  (assert) => {
    const person = personId("1439113");
    const bookable = day("2026-09-11");
    const emptyQuery =
      "/services?fields[services]=id,name,section,deal&fields[deals]=id,name,suffix,project,company&fields[sections]=id,name,deal&fields[projects]=id,name,company&fields[companies]=id,name&filter[budgets_and_deals]=true&filter[time_tracking_enabled]=true&filter[bookable_date]=2026-09-11&filter[person_id]=1439113&include=deal.company,deal.project.company,section.deal.project.company&page=1&per_page=200&sort=company,project_name,budget,section_position,position";
    assert.strictEqual(
      serviceCatalogPath({ personId: person, day: bookable, query: undefined }),
      emptyQuery,
    );
    assert.strictEqual(
      serviceCatalogPath({ personId: person, day: bookable, query: "" }),
      emptyQuery,
    );
    assert.strictEqual(
      serviceCatalogPath({ personId: person, day: bookable, query: "asd" }),
      "/services?fields[services]=id,name,section,deal&fields[deals]=id,name,suffix,project,company&fields[sections]=id,name,deal&fields[projects]=id,name,company&fields[companies]=id,name&filter[budgets_and_deals]=true&filter[time_tracking_enabled]=true&filter[bookable_date]=2026-09-11&filter[person_id]=1439113&filter[query]=asd&include=deal.company,deal.project.company,section.deal.project.company&page=1&per_page=200&sort=company,project_name,budget,section_position,position",
    );
  },
);
