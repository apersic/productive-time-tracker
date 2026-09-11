import type { PageCursor } from "../../features/timesheet";

export type LoadMoreControl =
  | { visible: false }
  | {
      visible: true;
      label: "Load more" | "Retry";
      pending: boolean;
      error: string | undefined;
    };

export function loadMoreControl(page: PageCursor): LoadMoreControl {
  switch (page.kind) {
    case "complete":
      return { visible: false };
    case "more":
      return {
        visible: true,
        label: "Load more",
        pending: false,
        error: undefined,
      };
    case "loadingMore":
      return {
        visible: true,
        label: "Load more",
        pending: true,
        error: undefined,
      };
    case "moreFailed":
      return {
        visible: true,
        label: "Retry",
        pending: false,
        error: page.error.message,
      };
    default: {
      const _exhaustive: never = page;
      return _exhaustive;
    }
  }
}
