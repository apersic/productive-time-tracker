import {
  Box,
  Button,
  Dialog,
  Flex,
  Heading,
  Menu,
  Portal,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";
import { DeleteIcon, EditIcon, MoreIcon } from "../../lib/icons";
import {
  displayedMinutes,
  isTimerBusy,
  runningTimerFromSlot,
  type DayTimesheet,
  type PageCursor,
  type TimeEntry,
  type TimeEntryId,
} from "../../lib/timesheet/day-timesheet.ts";
import { entryTitle, type EntryNote } from "../../lib/timesheet/entry-note.ts";
import { formatCalendarDayLabel } from "../../lib/time/calendar-day.ts";
import { formatHhMm } from "../../lib/time/duration.ts";
import { Card } from "../../lib/ui";
import { NoteView } from "./note-view.tsx";

type ListOverlay =
  | { kind: "closed" }
  | { kind: "confirm"; entryId: TimeEntryId; title: string }
  | { kind: "deleting"; entryId: TimeEntryId; title: string };

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
        <Button type="button" variant="ghost" size="sm" aria-label="More">
          <MoreIcon />
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="10rem">
            <Menu.Item value="edit">
              <EditIcon />
              Edit
            </Menu.Item>
            <Menu.Item
              value="delete"
              color="fg.error"
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
  const running = runningTimerFromSlot(props.timesheet.timer);
  const isThisRunning = running?.entryId === props.entry.id;
  const busy = isTimerBusy(props.timesheet.timer);
  const shown = displayedMinutes({
    logged: props.entry.logged,
    entryId: props.entry.id,
    timer: props.timesheet.timer,
    now: props.now,
  });

  return (
    <Card>
      <Flex align="flex-start" justify="space-between" gap="4">
        <Stack flex="1" gap="1" minW="0">
          <Heading as="h2" size="sm" lineClamp={2}>
            {entryTitle({
              service: props.entry.service,
              task: props.entry.task,
            })}
          </Heading>
          {entryNoteView(props.entry.note)}
        </Stack>
        <Flex align="center" justify="space-between" gap="4">
          <Text fontFamily="mono" whiteSpace="nowrap">
            {formatHhMm(shown)}
          </Text>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={isThisRunning ? "Pause" : "Play"}
            disabled={busy}
            onClick={() =>
              isThisRunning ? props.onPause() : props.onPlay(props.entry.id)
            }
          >
            {isThisRunning ? "Pause" : "Play"}
          </Button>
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
      title: entryTitle({
        service: entry.service,
        task: entry.task,
      }),
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
      body = <Text>Loading</Text>;
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
          {timesheet.entries.page.kind === "moreFailed" ? (
            <Stack gap="2">
              <Text color="fg.error" role="alert">
                {timesheet.entries.page.error.message}
              </Text>
              <Button
                type="button"
                variant="outline"
                onClick={props.onLoadMore}
              >
                Retry
              </Button>
            </Stack>
          ) : null}
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
