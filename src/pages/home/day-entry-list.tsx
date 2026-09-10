import { Box, Button, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
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

function EntryRow(props: {
  entry: TimeEntry;
  timesheet: DayTimesheet;
  now: number;
  onPlay: (entryId: TimeEntryId) => void;
  onPause: () => void;
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
}) {
  const { rows, page, timesheet, now, onPlay, onPause, onLoadMore } = props;
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
}) {
  const { timesheet } = props;

  switch (timesheet.entries.status) {
    case "loading":
      return <Text>Loading</Text>;
    case "failed":
      return (
        <Text color="fg.error" role="alert">
          {timesheet.entries.error.message}
        </Text>
      );
    case "empty":
      return (
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
    case "ready":
      return (
        <Stack gap="3">
          <ReadyList
            rows={timesheet.entries.rows}
            page={timesheet.entries.page}
            timesheet={timesheet}
            now={props.now}
            onPlay={props.onPlay}
            onPause={props.onPause}
            onLoadMore={props.onLoadMore}
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
    default: {
      const _exhaustive: never = timesheet.entries;
      return _exhaustive;
    }
  }
}
