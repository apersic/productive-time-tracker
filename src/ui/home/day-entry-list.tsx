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
import { SITE_ICON_HREF } from "../../lib/document";
import { useCopy, type Copy } from "../../lib/copy";
import { formatHhMm } from "../../lib/time/duration.ts";
import { Card } from "../shared";
import { loadMoreControl } from "./load-more";
import { NoteView } from "./note-view.tsx";

type ListOverlay =
  | { kind: "closed" }
  | { kind: "confirm"; entryId: TimeEntryId; title: string }
  | { kind: "deleting"; entryId: TimeEntryId; title: string };

const LIST_PLACEHOLDER_COUNT = 3;
const ROW_CONTROL_SIZE = "11";

export function DayEntryListSkeleton(): ReactElement {
  const copy = useCopy();
  return (
    <Stack
      gap="3"
      overflowY="hidden"
      role="status"
      aria-busy="true"
      aria-label={copy.home.loadingEntries}
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
      <Flex direction="column" gap="2">
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
        <Skeleton height="4" width="24" alignSelf="flex-end" />
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
    case "checking":
      return true;
    case "unavailable":
      return false;
    default: {
      const _exhaustive: never = timesheet.entries.copy;
      return _exhaustive;
    }
  }
}

function listAnnouncement(timesheet: DayTimesheet, copy: Copy): string {
  switch (timesheet.entries.status) {
    case "loading":
      return copy.home.listLoading(timesheet.day);
    case "failed":
      return copy.failure[timesheet.entries.error];
    case "empty":
      return copy.home.listEmpty(timesheet.day);
    case "ready":
      return copy.home.listReady({
        count: timesheet.entries.rows.length,
        day: timesheet.day,
      });
    default: {
      const _exhaustive: never = timesheet.entries;
      return _exhaustive;
    }
  }
}

function entryNoteView(note: EntryNote) {
  switch (note.kind) {
    case "empty":
      return "-";
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
  title: string;
  timesheet: DayTimesheet;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
}) {
  const copy = useCopy();
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
          size="md"
          minW={ROW_CONTROL_SIZE}
          minH={ROW_CONTROL_SIZE}
          aria-label={copy.home.moreActions(props.title)}
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
              {copy.home.edit}
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
              {copy.home.delete}
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
  const copy = useCopy();
  const open = overlayIsOpen(props.overlay);
  const deleting = props.overlay.kind === "deleting";
  const title = overlayTitle(props.overlay);
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
              <Dialog.Title>{copy.home.deleteTitle}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Dialog.Description>{title}</Dialog.Description>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                type="button"
                variant="outline"
                onClick={props.onCancel}
                disabled={deleting}
              >
                {copy.home.cancel}
              </Button>
              <Button
                type="button"
                colorPalette="red"
                variant="solid"
                onClick={props.onConfirm}
                loading={deleting}
                disabled={deleting}
              >
                {copy.home.deleteConfirm}
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
  const copy = useCopy();
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
      <Flex direction="column" gap="2">
        <Flex align="flex-start" justify="space-between" gap="4">
          <Stack flex="1" gap="3" minW="0">
            <Stack gap="1">
              <Heading as="h3" size="sm" lineClamp={2}>
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
              title={listing.title}
              control={timerControl({
                entryId: props.entry.id,
                timer: props.timesheet.timer,
              })}
              onPlay={() => props.onPlay(props.entry.id)}
              onPause={props.onPause}
            />
            <EntryMoreMenu
              entry={props.entry}
              title={listing.title}
              timesheet={props.timesheet}
              onEdit={props.onEdit}
              onDelete={props.onDelete}
            />
          </Flex>
        </Flex>
        <Text asChild color="fg.muted" textStyle="sm" alignSelf="flex-end">
          <time dateTime={props.entry.day}>
            {copy.dayLabel(props.entry.day)}
          </time>
        </Text>
      </Flex>
    </Card>
  );
}

function timerActionLabel(
  kind: TimerControl["kind"],
  title: string,
  copy: Copy,
): string {
  switch (kind) {
    case "play":
      return copy.home.startTimer(title);
    case "stop":
      return copy.home.stopTimer(title);
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
  title: string;
  control: TimerControl;
  onPlay: () => void;
  onPause: () => void;
}): ReactElement {
  const copy = useCopy();
  const { control } = props;
  const label = timerActionLabel(control.kind, props.title, copy);
  switch (control.mode) {
    case "pending":
      return (
        <Button
          type="button"
          size="md"
          variant="outline"
          minW={ROW_CONTROL_SIZE}
          minH={ROW_CONTROL_SIZE}
          aria-label={label}
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
              size="md"
              variant="outline"
              minW={ROW_CONTROL_SIZE}
              minH={ROW_CONTROL_SIZE}
              aria-label={label}
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
              size="md"
              variant="outline"
              minW={ROW_CONTROL_SIZE}
              minH={ROW_CONTROL_SIZE}
              aria-label={label}
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
  const copy = useCopy();
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
    estimateSize: () => 120,
    overscan: 8,
    getItemKey: (index) => rows[index]?.id ?? index,
  });
  const items = virtualizer.getVirtualItems();
  const last = items[items.length - 1];

  useEffect(() => {
    if (!last || page.kind !== "more") {
      return;
    }
    if (last.index >= rows.length - 1) {
      onLoadMore();
    }
  }, [last, last?.index, page.kind, rows.length, onLoadMore]);

  return (
    <Box
      ref={parentRef}
      flex="1"
      minH="0"
      overflowY="auto"
      tabIndex={0}
      role="list"
      aria-label={copy.home.regionFor(timesheet.day)}
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
              role="listitem"
              aria-setsize={rows.length}
              aria-posinset={virtualRow.index + 1}
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
  const copy = useCopy();
  const control = loadMoreControl(props.page);
  if (!control.visible) {
    return null;
  }
  switch (control.kind) {
    case "status":
      return (
        <Text
          role="status"
          aria-label={copy.home.loadingMore}
          aria-live="polite"
        >
          {copy.home.loadingMore}
        </Text>
      );
    case "retry":
      return (
        <Stack gap="2">
          <Text color="fg.error" role="alert">
            {copy.failure[control.error]}
          </Text>
          <Button type="button" variant="outline" onClick={props.onLoadMore}>
            {copy.home.retry}
          </Button>
        </Stack>
      );
    default: {
      const _exhaustive: never = control;
      return _exhaustive;
    }
  }
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
  const copy = useCopy();
  const { timesheet } = props;
  const [overlay, setOverlay] = useState<ListOverlay>({ kind: "closed" });
  const regionRef = useRef<HTMLDivElement>(null);

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
    regionRef.current?.focus();
  }

  let body;
  switch (timesheet.entries.status) {
    case "loading":
      body = <DayEntryListSkeleton />;
      break;
    case "failed":
      body = (
        <Text color="fg.error" role="alert">
          {copy.failure[timesheet.entries.error]}
        </Text>
      );
      break;
    case "empty":
      body = (
        <Card>
          <Stack
            align="center"
            justify="center"
            gap="4"
            textAlign="center"
            role="status"
          >
            <img
              src={SITE_ICON_HREF}
              alt=""
              aria-hidden={true}
              width={48}
              height={48}
            />
            <Heading as="h2" size="md">
              {copy.home.emptyHeading(timesheet.day)}
            </Heading>
            {timesheet.entries.copy.kind === "unavailable" ? (
              <Text>{copy.home.emptyHint}</Text>
            ) : null}
            {copyButtonVisible(timesheet) ? (
              <Button
                type="button"
                colorPalette="blue"
                variant="solid"
                alignSelf="center"
                onClick={props.onCopyPreviousDay}
                loading={
                  timesheet.entries.copy.kind === "copying" ||
                  timesheet.entries.copy.kind === "checking"
                }
                disabled={
                  timesheet.entries.copy.kind === "copying" ||
                  timesheet.entries.copy.kind === "checking"
                }
              >
                {copy.home.copyPreviousDay}
              </Button>
            ) : null}
            {timesheet.entries.copy.kind === "failed" ? (
              <Text color="fg.error" role="alert">
                {copy.failure[timesheet.entries.copy.error]}
              </Text>
            ) : null}
          </Stack>
        </Card>
      );
      break;
    case "ready":
      body = (
        <Stack gap="3" flex="1" minH="0">
          <Heading as="h2" size="md" flexShrink="0">
            {copy.home.regionFor(timesheet.day)}
          </Heading>
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
    <Box
      ref={regionRef}
      tabIndex={-1}
      outline="none"
      role="region"
      aria-label={copy.home.region}
      flex="1"
      minH="0"
      display="flex"
      flexDirection="column"
      overflow="hidden"
    >
      <Box className="sr-only" aria-live="polite" aria-atomic="true">
        {listAnnouncement(timesheet, copy)}
      </Box>
      {body}
      <EntryDeleteDialog
        overlay={overlay}
        onCancel={closeOverlay}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
    </Box>
  );
}
