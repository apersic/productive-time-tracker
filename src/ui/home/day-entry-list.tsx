import {
  Box,
  Button,
  Dialog,
  Flex,
  Heading,
  Menu,
  Portal,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState, type ReactElement } from "react";
import {
  DeleteIcon,
  EditIcon,
  MoreIcon,
  PlayIcon,
  StopIcon,
} from "../../lib/icons";
import {
  displayedMinutes,
  entryListingCopy,
  isTimerBusy,
  timerControl,
  type DayTimesheet,
  type EntryNote,
  type PageCursor,
  type TimeEntry,
  type TimeEntryId,
  type TimerControl,
} from "../../features/timesheet";
import { formatCalendarDayLabel } from "../../lib/time/calendar-day.ts";
import { formatHhMm } from "../../lib/time/duration.ts";
import { Card } from "../shared";
import { loadMoreControl } from "./load-more";
import { NoteView } from "./note-view.tsx";

type ListOverlay =
  | { kind: "closed" }
  | { kind: "confirm"; entryId: TimeEntryId; title: string }
  | { kind: "deleting"; entryId: TimeEntryId; title: string };

const LIST_PENDING_NAME = "Loading time entries";
const LIST_PLACEHOLDER_COUNT = 3;

export function DayEntryListSkeleton(): ReactElement {
  return (
    <Stack
      gap="3"
      maxH="70vh"
      overflowY="hidden"
      role="status"
      aria-busy="true"
      aria-label={LIST_PENDING_NAME}
    >
      {Array.from({ length: LIST_PLACEHOLDER_COUNT }, (_, index) => (
        <EntryRowSkeleton key={index} />
      ))}
    </Stack>
  );
}

function EntryRowSkeleton(): ReactElement {
  return (
    <Card aria-hidden>
      <Flex align="flex-start" justify="space-between" gap="4">
        <Stack flex="1" gap="1" minW="0">
          <SkeletonText noOfLines={1} />
          <SkeletonText noOfLines={1} width="50%" />
        </Stack>
        <Flex align="center" justify="space-between" gap="4">
          <Skeleton height="5" width="12" />
          <SkeletonCircle size="8" />
          <SkeletonCircle size="8" />
        </Flex>
      </Flex>
    </Card>
  );
}

function copyButtonVisible(timesheet: DayTimesheet): boolean {
  if (timesheet.entries.status !== "empty") {
    return false;
  }
  switch (timesheet.entries.copy.kind) {
    case "available":
    case "failed":
    case "copying":
      return true;
    case "checking":
    case "unavailable":
      return false;
    default: {
      const _exhaustive: never = timesheet.entries.copy;
      return _exhaustive;
    }
  }
}

function entryNoteView(note: EntryNote) {
  switch (note.kind) {
    case "empty":
      return null;
    case "present":
      return <NoteView note={note} />;
    default: {
      const _exhaustive: never = note;
      return _exhaustive;
    }
  }
}

function overlayIsOpen(overlay: ListOverlay): boolean {
  switch (overlay.kind) {
    case "closed":
      return false;
    case "confirm":
    case "deleting":
      return true;
    default: {
      const _exhaustive: never = overlay;
      return _exhaustive;
    }
  }
}

function overlayTitle(overlay: ListOverlay): string {
  switch (overlay.kind) {
    case "closed":
      return "";
    case "confirm":
    case "deleting":
      return overlay.title;
    default: {
      const _exhaustive: never = overlay;
      return _exhaustive;
    }
  }
}

function EntryMoreMenu(props: {
  entry: TimeEntry;
  timesheet: DayTimesheet;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
}) {
  return (
    <Menu.Root
      positioning={{ placement: "bottom-end" }}
      onSelect={(details) => {
        switch (details.value) {
          case "edit":
            props.onEdit(props.entry);
            return;
          case "delete":
            props.onDelete(props.entry);
            return;
          default:
            return;
        }
      }}
    >
      <Menu.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="More"
          px="0"
        >
          <MoreIcon />
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="10rem">
            <Menu.Item value="edit" cursor="pointer">
              <EditIcon />
              Edit
            </Menu.Item>
            <Menu.Item
              value="delete"
              color="fg.error"
              cursor={
                isTimerBusy(props.timesheet.timer) ? "not-allowed" : "pointer"
              }
              disabled={isTimerBusy(props.timesheet.timer)}
            >
              <DeleteIcon />
              Delete
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

function EntryDeleteDialog(props: {
  overlay: ListOverlay;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const open = overlayIsOpen(props.overlay);
  const deleting = props.overlay.kind === "deleting";
  return (
    <Dialog.Root
      role="alertdialog"
      placement="center"
      size="sm"
      open={open}
      onOpenChange={(details) => {
        if (!details.open && !deleting) {
          props.onCancel();
        }
      }}
      closeOnInteractOutside={!deleting}
      closeOnEscape={!deleting}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner px="4">
          <Dialog.Content mx="auto">
            <Dialog.Header>
              <Dialog.Title>Delete this time entry?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>{overlayTitle(props.overlay)}</Dialog.Body>
            <Dialog.Footer>
              <Button
                type="button"
                variant="outline"
                onClick={props.onCancel}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                colorPalette="red"
                variant="solid"
                onClick={props.onConfirm}
                loading={deleting}
                disabled={deleting}
              >
                Confirm
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function EntryRow(props: {
  entry: TimeEntry;
  timesheet: DayTimesheet;
  now: number;
  onPlay: (entryId: TimeEntryId) => void;
  onPause: () => void;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
}) {
  const shown = displayedMinutes({
    logged: props.entry.logged,
    entryId: props.entry.id,
    timer: props.timesheet.timer,
    now: props.now,
  });
  const listing = entryListingCopy({
    service: props.entry.service,
    task: props.entry.task,
    project: props.entry.project,
  });

  return (
    <Card>
      <Flex align="flex-start" justify="space-between" gap="4">
        <Stack flex="1" gap="3" minW="0">
          <Stack gap="1">
            <Heading as="h2" size="sm" lineClamp={2}>
              {listing.title}
            </Heading>
            {listing.subtitle ? (
              <Text color="fg.muted" textStyle="sm">
                {listing.subtitle}
              </Text>
            ) : null}
          </Stack>
          {entryNoteView(props.entry.note)}
        </Stack>
        <Flex align="center" justify="space-between" gap="4">
          <Text fontFamily="mono" whiteSpace="nowrap">
            {formatHhMm(shown)}
          </Text>
          <TimerButton
            control={timerControl({
              entryId: props.entry.id,
              timer: props.timesheet.timer,
            })}
            onPlay={() => props.onPlay(props.entry.id)}
            onPause={props.onPause}
          />
          <EntryMoreMenu
            entry={props.entry}
            timesheet={props.timesheet}
            onEdit={props.onEdit}
            onDelete={props.onDelete}
          />
        </Flex>
      </Flex>
    </Card>
  );
}

function timerLabel(kind: TimerControl["kind"]): "Play" | "Stop" {
  switch (kind) {
    case "play":
      return "Play";
    case "stop":
      return "Stop";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function timerGlyph(kind: TimerControl["kind"]): ReactElement {
  switch (kind) {
    case "play":
      return (
        <Box color="fg.success" display="inline-flex">
          <PlayIcon />
        </Box>
      );
    case "stop":
      return (
        <Box color="fg.error" display="inline-flex">
          <StopIcon />
        </Box>
      );
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function TimerButton(props: {
  control: TimerControl;
  onPlay: () => void;
  onPause: () => void;
}): ReactElement {
  const { control } = props;
  switch (control.mode) {
    case "pending":
      return (
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label={timerLabel(control.kind)}
          loading
          px="0"
        >
          {timerGlyph(control.kind)}
        </Button>
      );
    case "ready":
      switch (control.kind) {
        case "play":
          return (
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={timerLabel(control.kind)}
              disabled={!control.enabled}
              onClick={props.onPlay}
              px="0"
            >
              {timerGlyph(control.kind)}
            </Button>
          );
        case "stop":
          return (
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={timerLabel(control.kind)}
              disabled={!control.enabled}
              onClick={props.onPause}
              px="0"
            >
              {timerGlyph(control.kind)}
            </Button>
          );
        default: {
          const _exhaustive: never = control;
          return _exhaustive;
        }
      }
    default: {
      const _exhaustive: never = control;
      return _exhaustive;
    }
  }
}

function ReadyList(props: {
  rows: readonly TimeEntry[];
  page: PageCursor;
  timesheet: DayTimesheet;
  now: number;
  onPlay: (entryId: TimeEntryId) => void;
  onPause: () => void;
  onLoadMore: () => void;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
}) {
  const {
    rows,
    page,
    timesheet,
    now,
    onPlay,
    onPause,
    onLoadMore,
    onEdit,
    onDelete,
  } = props;
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96,
    overscan: 8,
    getItemKey: (index) => rows[index]?.id ?? index,
  });
  const items = virtualizer.getVirtualItems();
  const last = items[items.length - 1];

  useEffect(() => {
    if (!last || page.kind !== "more") {
      return;
    }
    if (last.index >= rows.length - 9) {
      onLoadMore();
    }
  }, [last, last?.index, page.kind, rows.length, onLoadMore]);

  return (
    <Box
      ref={parentRef}
      maxH="70vh"
      overflowY="auto"
      css={{ scrollBehavior: "auto" }}
    >
      <Box
        height={`${virtualizer.getTotalSize()}px`}
        width="100%"
        position="relative"
      >
        {items.map((virtualRow) => {
          const entry = rows[virtualRow.index];
          if (!entry) {
            return null;
          }
          return (
            <Box
              key={virtualRow.key}
              data-index={virtualRow.index}
              data-entry-id={entry.id}
              ref={virtualizer.measureElement}
              position="absolute"
              top="0"
              left="0"
              width="100%"
              transform={`translateY(${virtualRow.start}px)`}
              pb="3"
            >
              <EntryRow
                entry={entry}
                timesheet={timesheet}
                now={now}
                onPlay={onPlay}
                onPause={onPause}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function LoadMoreFooter(props: {
  page: PageCursor;
  onLoadMore: () => void;
}): ReactElement | null {
  const control = loadMoreControl(props.page);
  if (!control.visible) {
    return null;
  }
  return (
    <Stack gap="2">
      {control.error ? (
        <Text color="fg.error" role="alert">
          {control.error}
        </Text>
      ) : null}
      <Button
        type="button"
        variant="outline"
        loading={control.pending}
        onClick={props.onLoadMore}
      >
        {control.label}
      </Button>
    </Stack>
  );
}

export function DayEntryList(props: {
  timesheet: DayTimesheet;
  now: number;
  onPlay: (entryId: TimeEntryId) => void;
  onPause: () => void;
  onLoadMore: () => void;
  onCopyPreviousDay: () => void;
  onRemove: (entryId: TimeEntryId) => Promise<void>;
  onEdit: (entry: TimeEntry) => void;
}) {
  const { timesheet } = props;
  const [overlay, setOverlay] = useState<ListOverlay>({ kind: "closed" });

  function requestDelete(entry: TimeEntry) {
    setOverlay({
      kind: "confirm",
      entryId: entry.id,
      title: entryListingCopy({
        service: entry.service,
        task: entry.task,
        project: entry.project,
      }).title,
    });
  }

  function closeOverlay() {
    if (overlay.kind === "deleting") {
      return;
    }
    setOverlay({ kind: "closed" });
  }

  async function confirmDelete() {
    if (overlay.kind !== "confirm") {
      return;
    }
    const { entryId, title } = overlay;
    setOverlay({ kind: "deleting", entryId, title });
    await props.onRemove(entryId);
    setOverlay({ kind: "closed" });
  }

  let body;
  switch (timesheet.entries.status) {
    case "loading":
      body = <DayEntryListSkeleton />;
      break;
    case "failed":
      body = (
        <Text color="fg.error" role="alert">
          {timesheet.entries.error.message}
        </Text>
      );
      break;
    case "empty":
      body = (
        <Stack gap="4">
          <Text>
            There's no tracked time for {formatCalendarDayLabel(timesheet.day)}
          </Text>
          {copyButtonVisible(timesheet) ? (
            <Button
              type="button"
              variant="outline"
              onClick={props.onCopyPreviousDay}
              loading={timesheet.entries.copy.kind === "copying"}
              disabled={timesheet.entries.copy.kind === "copying"}
            >
              Copy tasks from previous day
            </Button>
          ) : null}
          {timesheet.entries.copy.kind === "failed" ? (
            <Text color="fg.error" role="alert">
              {timesheet.entries.copy.error.message}
            </Text>
          ) : null}
        </Stack>
      );
      break;
    case "ready":
      body = (
        <Stack gap="3">
          <ReadyList
            rows={timesheet.entries.rows}
            page={timesheet.entries.page}
            timesheet={timesheet}
            now={props.now}
            onPlay={props.onPlay}
            onPause={props.onPause}
            onLoadMore={props.onLoadMore}
            onEdit={props.onEdit}
            onDelete={requestDelete}
          />
          <LoadMoreFooter
            page={timesheet.entries.page}
            onLoadMore={props.onLoadMore}
          />
        </Stack>
      );
      break;
    default: {
      const _exhaustive: never = timesheet.entries;
      return _exhaustive;
    }
  }

  return (
    <>
      {body}
      <EntryDeleteDialog
        overlay={overlay}
        onCancel={closeOverlay}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
    </>
  );
}
