import { SITE_NAME } from "./site.ts";

export const PAGE_IDS = ["login", "home", "editEntry"] as const;

export type PageId = (typeof PAGE_IDS)[number];

export function pageHeading(page: PageId): string {
  switch (page) {
    case "login":
      return "Log in";
    case "home":
      return "Home";
    case "editEntry":
      return "Edit time entry";
    default: {
      const _exhaustive: never = page;
      return _exhaustive;
    }
  }
}

export function documentTitle(page: PageId): string {
  return `${pageHeading(page)} \u00b7 ${SITE_NAME}`;
}
