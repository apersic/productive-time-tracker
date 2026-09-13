import type { Copy } from "../copy/en.ts";
import { SITE_NAME } from "./site.ts";

export const PAGE_IDS = ["login", "home", "editEntry"] as const;

export type PageId = (typeof PAGE_IDS)[number];

export function pageHeading(page: PageId, copy: Copy): string {
  return copy.page[page];
}

export function documentTitle(page: PageId, copy: Copy): string {
  return `${pageHeading(page, copy)} \u00b7 ${SITE_NAME}`;
}
