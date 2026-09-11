import type { ServiceId, TimesheetError } from "./timesheet-model.ts";

export type TrackableService = { id: ServiceId; name: string };

export type ServicesList =
  | { status: "loading" }
  | { status: "failed"; error: TimesheetError }
  | { status: "none" }
  | { status: "one"; service: TrackableService }
  | { status: "many" };

export type ServiceGroupId = string & { readonly __brand: "ServiceGroupId" };
export type ServiceLevel =
  "company" | "project" | "deal" | "section" | "pinned";

export type ServiceNode =
  | {
      kind: "group";
      id: ServiceGroupId;
      level: ServiceLevel;
      label: string;
      children: readonly ServiceNode[];
    }
  | { kind: "service"; service: TrackableService };

export type ServiceCatalog = {
  readonly roots: readonly ServiceNode[];
  readonly serviceCount: number;
};

export const emptyServiceCatalog: ServiceCatalog = {
  roots: [],
  serviceCount: 0,
};

export type Expansion =
  | { mode: "collapsed"; opened: ReadonlySet<ServiceGroupId> }
  | { mode: "expanded"; closed: ReadonlySet<ServiceGroupId> };

export type ServiceRow =
  | {
      kind: "group";
      id: ServiceGroupId;
      level: ServiceLevel;
      label: string;
      depth: number;
      expanded: boolean;
      serviceCount: number;
    }
  | {
      kind: "service";
      service: TrackableService;
      depth: number;
      selected: boolean;
    };

export function serviceGroupId(path: readonly string[]): ServiceGroupId {
  return path.join("/") as ServiceGroupId;
}

export function dealLabel(args: { name: string; suffix: string }): string {
  if (args.suffix.length === 0) {
    return args.name;
  }
  return `${args.name} ${args.suffix}`;
}

export function isExpanded(expansion: Expansion, id: ServiceGroupId): boolean {
  switch (expansion.mode) {
    case "collapsed":
      return expansion.opened.has(id);
    case "expanded":
      return !expansion.closed.has(id);
    default: {
      const _exhaustive: never = expansion;
      return _exhaustive;
    }
  }
}

export function toggleExpansion(
  expansion: Expansion,
  id: ServiceGroupId,
): Expansion {
  switch (expansion.mode) {
    case "collapsed": {
      const opened = new Set(expansion.opened);
      if (opened.has(id)) {
        opened.delete(id);
      } else {
        opened.add(id);
      }
      return { mode: "collapsed", opened };
    }
    case "expanded": {
      const closed = new Set(expansion.closed);
      if (closed.has(id)) {
        closed.delete(id);
      } else {
        closed.add(id);
      }
      return { mode: "expanded", closed };
    }
    default: {
      const _exhaustive: never = expansion;
      return _exhaustive;
    }
  }
}

export function openedByDefault(
  catalog: ServiceCatalog,
): ReadonlySet<ServiceGroupId> {
  const opened = new Set<ServiceGroupId>();
  walk(catalog.roots);
  return opened;

  function walk(nodes: readonly ServiceNode[]): void {
    for (const node of nodes) {
      switch (node.kind) {
        case "group": {
          if (node.children.length === 1) {
            const only = node.children[0];
            if (only && only.kind === "group") {
              opened.add(node.id);
            }
          }
          walk(node.children);
          break;
        }
        case "service":
          break;
        default: {
          const _exhaustive: never = node;
          return _exhaustive;
        }
      }
    }
  }
}

function leafCount(nodes: readonly ServiceNode[]): number {
  let count = 0;
  for (const node of nodes) {
    switch (node.kind) {
      case "group":
        count += leafCount(node.children);
        break;
      case "service":
        count += 1;
        break;
      default: {
        const _exhaustive: never = node;
        return _exhaustive;
      }
    }
  }
  return count;
}

export function findService(
  catalog: ServiceCatalog,
  id: ServiceId,
): TrackableService | undefined {
  return findInNodes(catalog.roots, id);
}

function findInNodes(
  nodes: readonly ServiceNode[],
  id: ServiceId,
): TrackableService | undefined {
  for (const node of nodes) {
    switch (node.kind) {
      case "group": {
        const found = findInNodes(node.children, id);
        if (found) {
          return found;
        }
        break;
      }
      case "service":
        if (node.service.id === id) {
          return node.service;
        }
        break;
      default: {
        const _exhaustive: never = node;
        return _exhaustive;
      }
    }
  }
  return undefined;
}

export function catalogWithPinned(args: {
  catalog: ServiceCatalog;
  pinned: TrackableService | undefined;
}): ServiceCatalog {
  const pinned = args.pinned;
  if (!pinned) {
    return args.catalog;
  }
  if (findService(args.catalog, pinned.id)) {
    return args.catalog;
  }
  const pinGroup: ServiceNode = {
    kind: "group",
    id: serviceGroupId(["pinned"]),
    level: "pinned",
    label: "Current service",
    children: [{ kind: "service", service: pinned }],
  };
  return {
    roots: [pinGroup, ...args.catalog.roots],
    serviceCount: args.catalog.serviceCount + 1,
  };
}

export function serviceAvailability(args: {
  catalog: ServiceCatalog;
  pinned: TrackableService | undefined;
}): Exclude<ServicesList, { status: "loading" } | { status: "failed" }> {
  const pinned = args.pinned;
  const pinMissing = Boolean(
    pinned && findService(args.catalog, pinned.id) === undefined,
  );
  const count = args.catalog.serviceCount + (pinMissing ? 1 : 0);
  if (count === 0) {
    return { status: "none" };
  }
  if (count === 1) {
    const service =
      pinMissing && pinned ? pinned : findFirstLeaf(args.catalog.roots);
    if (!service) {
      return { status: "none" };
    }
    return { status: "one", service };
  }
  return { status: "many" };
}

function findFirstLeaf(
  nodes: readonly ServiceNode[],
): TrackableService | undefined {
  for (const node of nodes) {
    switch (node.kind) {
      case "group": {
        const found = findFirstLeaf(node.children);
        if (found) {
          return found;
        }
        break;
      }
      case "service":
        return node.service;
      default: {
        const _exhaustive: never = node;
        return _exhaustive;
      }
    }
  }
  return undefined;
}

export function catalogRows(args: {
  catalog: ServiceCatalog;
  expansion: Expansion;
  selected: ServiceId | undefined;
}): readonly ServiceRow[] {
  const rows: ServiceRow[] = [];
  walk(args.catalog.roots, 0);
  return rows;

  function walk(nodes: readonly ServiceNode[], depth: number): void {
    for (const node of nodes) {
      switch (node.kind) {
        case "group": {
          const serviceCount = leafCount(node.children);
          if (serviceCount === 0) {
            break;
          }
          const expanded = isExpanded(args.expansion, node.id);
          rows.push({
            kind: "group",
            id: node.id,
            level: node.level,
            label: node.label,
            depth,
            expanded,
            serviceCount,
          });
          if (expanded) {
            walk(node.children, depth + 1);
          }
          break;
        }
        case "service":
          rows.push({
            kind: "service",
            service: node.service,
            depth,
            selected:
              args.selected !== undefined && node.service.id === args.selected,
          });
          break;
        default: {
          const _exhaustive: never = node;
          return _exhaustive;
        }
      }
    }
  }
}
