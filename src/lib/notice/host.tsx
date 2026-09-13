import { Toaster, Toast, createToaster, Portal, Stack } from "@chakra-ui/react";
import { useCopy } from "../copy";
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

const notices = new Map<string, Notice>();

function typeForNotice(notice: Notice): "success" | "warning" | "error" {
  switch (notice.kind) {
    case "entryCreated":
    case "dayCopied":
    case "entryDeleted":
    case "entryUpdated":
      return "success";
    case "dayCopiedPartial":
      return "warning";
    case "timerFailed":
    case "recoverTimerFailed":
    case "entryDeleteFailed":
    case "entryUpdateFailed":
    case "copyDayFailed":
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
    case "entryDeleted":
    case "entryUpdated":
      return 4000;
    case "dayCopiedPartial":
    case "timerFailed":
    case "recoverTimerFailed":
    case "entryDeleteFailed":
    case "entryUpdateFailed":
    case "copyDayFailed":
      return 8000;
    case "sessionExpired":
      return Infinity;
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
    case "entryDeleted":
    case "entryDeleteFailed":
    case "entryUpdated":
    case "entryUpdateFailed":
    case "copyDayFailed":
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
  const id = toastIdForNotice(notice) ?? crypto.randomUUID();
  notices.set(id, notice);
  toaster.create({
    id,
    type: typeForNotice(notice),
    duration: durationForNotice(notice),
  });
}

export function NoticeHost() {
  const catalog = useCopy();
  return (
    <Portal>
      <Toaster
        toaster={toaster}
        css={{
          "--notice-offset-bottom":
            "calc(1rem + env(safe-area-inset-bottom, 0px) + max(0px, 100lvh - 100dvh))",
          "@media (max-width: 63.9975rem)": {
            "--notice-offset-bottom":
              "calc(1rem + env(safe-area-inset-bottom, 0px) + max(3.5rem, 100lvh - 100dvh))",
          },
        }}
      >
        {(toast) => {
          const notice = notices.get(String(toast.id));
          if (notice === undefined) {
            return null;
          }
          const copy = copyForNotice(notice, catalog);
          return (
            <Toast.Root w="fit-content" maxW="100%" aria-label={copy.title}>
              <Toast.Indicator />
              <Stack gap="1" maxW="100%">
                <Toast.Title>{copy.title}</Toast.Title>
                {copy.level === "detail" ? (
                  <Toast.Description>{copy.description}</Toast.Description>
                ) : null}
              </Stack>
              <Toast.CloseTrigger />
            </Toast.Root>
          );
        }}
      </Toaster>
    </Portal>
  );
}
