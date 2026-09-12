import type { PageCursor } from "../../features/timesheet";

export type LoadMoreControl =
  | { visible: false }
  | { visible: true; kind: "status" }
  | { visible: true; kind: "retry"; error: string };

export function loadMoreControl(page: PageCursor): LoadMoreControl {
  switch (page.kind) {
    case "complete":
    case "more":
      return { visible: false };
    case "loadingMore":
      return { visible: true, kind: "status" };
    case "moreFailed":
      return { visible: true, kind: "retry", error: page.error.message };
    default: {
      const _exhaustive: never = page;
      return _exhaustive;
    }
  }
}
