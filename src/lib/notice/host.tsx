import { Toaster, Toast, createToaster, Portal, Stack } from "@chakra-ui/react";
import {
  copyForNotice,
  noticeFromWrite,
  type Notice,
  type Write,
} from "./notice.ts";

const toaster = createToaster({
  placement: "bottom",
  pauseOnPageIdle: true,
  offsets: {
    top: "1rem",
    left: "1rem",
    right: "1rem",
    bottom: "var(--notice-offset-bottom, 1rem)",
  },
});

function typeForNotice(notice: Notice): "success" | "warning" | "error" {
  switch (notice.kind) {
    case "entryCreated":
    case "dayCopied":
      return "success";
    case "dayCopiedPartial":
      return "warning";
    case "timerFailed":
    case "recoverTimerFailed":
    case "sessionExpired":
      return "error";
    default: {
      const _exhaustive: never = notice;
      return _exhaustive;
    }
  }
}

function durationForNotice(notice: Notice): number {
  switch (notice.kind) {
    case "entryCreated":
    case "dayCopied":
      return 4000;
    case "dayCopiedPartial":
    case "timerFailed":
    case "recoverTimerFailed":
    case "sessionExpired":
      return 8000;
    default: {
      const _exhaustive: never = notice;
      return _exhaustive;
    }
  }
}

function toastIdForNotice(notice: Notice): string | undefined {
  switch (notice.kind) {
    case "sessionExpired":
      return "session-expired";
    case "entryCreated":
    case "dayCopied":
    case "dayCopiedPartial":
    case "timerFailed":
    case "recoverTimerFailed":
      return undefined;
    default: {
      const _exhaustive: never = notice;
      return _exhaustive;
    }
  }
}

export function announce(write: Write): void {
  const notice = noticeFromWrite(write);
  if (notice === undefined) {
    return;
  }
  const copy = copyForNotice(notice);
  const id = toastIdForNotice(notice);
  toaster.create({
    title: copy.title,
    description: copy.level === "detail" ? copy.description : undefined,
    type: typeForNotice(notice),
    duration: durationForNotice(notice),
    ...(id ? { id } : {}),
  });
}

export function NoticeHost() {
  return (
    <Portal>
      <Toaster
        toaster={toaster}
        css={{
          "--notice-offset-bottom":
            "calc(1rem + env(safe-area-inset-bottom, 0px) + max(0px, 100lvh - 100dvh))",
          "@media (max-width: 48rem)": {
            "--notice-offset-bottom":
              "calc(1rem + env(safe-area-inset-bottom, 0px) + max(3.5rem, 100lvh - 100dvh))",
          },
        }}
      >
        {(toast) => (
          <Toast.Root w="fit-content" maxW="100%">
            <Toast.Indicator />
            <Stack gap="1" maxW="100%">
              <Toast.Title>{toast.title}</Toast.Title>
              {toast.description ? (
                <Toast.Description>{toast.description}</Toast.Description>
              ) : null}
            </Stack>
            <Toast.CloseTrigger />
          </Toast.Root>
        )}
      </Toaster>
    </Portal>
  );
}
