import { Field, Grid, Input, Stack, Text } from "@chakra-ui/react";
import { useState, type ChangeEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import type { Credentials, Person } from "../lib/auth/session.ts";
import { useAuth } from "../lib/auth/use-auth.ts";
import { parseCalendarDay, todayLocal } from "../lib/time/calendar-day.ts";
import {
  isTimerBusy,
  runningEntryVisible,
  runningTimerFromSlot,
} from "../lib/timesheet/day-timesheet.ts";
import {
  blankEntryFields,
  type EntryDraft,
} from "../lib/timesheet/entry-draft.ts";
import {
  editEntryNavigationState,
  editEntryPath,
  parseHomeReturn,
} from "./edit-entry-route.ts";
import { DayEntryList } from "./home/day-entry-list.tsx";
import { EntryForm } from "./home/entry-form.tsx";
import { HomeHeader } from "./home/home-header.tsx";
import { useDayTimesheet } from "./home/use-day-timesheet.ts";

export function HomePage() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  switch (session.kind) {
    case "booting":
      return <Text>Loading</Text>;
    case "anonymous":
    case "unavailable":
      return <Navigate to="/login" replace />;
    case "authenticated":
      break;
    default: {
      const _exhaustive: never = session;
      return _exhaustive;
    }
  }

  function onLogout() {
    logout();
    void navigate("/login", { replace: true });
  }

  return (
    <AuthenticatedHome
      credentials={session.credentials}
      person={session.person}
      logout={onLogout}
    />
  );
}

function AuthenticatedHome(props: {
  credentials: Credentials;
  person: Person;
  logout: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const initialDay = parseHomeReturn(location.state) ?? todayLocal();
  const {
    timesheet,
    now,
    services,
    selectDay,
    loadMore,
    play,
    pause,
    addEntry,
    removeEntry,
    copyPreviousDay,
  } = useDayTimesheet({
    credentials: props.credentials,
    person: props.person,
    logout: props.logout,
    initialDay,
  });
  const [createError, setCreateError] = useState<string | undefined>(undefined);
  const [creating, setCreating] = useState(false);

  function onDayChange(event: ChangeEvent<HTMLInputElement>) {
    const parsed = parseCalendarDay(event.target.value);
    if (!parsed) {
      return;
    }
    selectDay(parsed);
  }

  async function onCreate(draft: EntryDraft): Promise<boolean> {
    if (creating) {
      return false;
    }
    setCreating(true);
    setCreateError(undefined);
    try {
      const result = await addEntry({
        note: draft.note,
        logged: draft.logged,
        service: draft.service,
      });
      if (!result.ok) {
        setCreateError(result.error.message);
        return false;
      }
      return true;
    } finally {
      setCreating(false);
    }
  }

  return (
    <Stack gap="6" w="full" px="4" pb="6">
      <HomeHeader
        person={props.person}
        logout={props.logout}
        pauseSlot={
          runningTimerFromSlot(timesheet.timer) &&
          !runningEntryVisible(timesheet)
            ? { disabled: isTimerBusy(timesheet.timer), onPause: pause }
            : undefined
        }
      />
      {timesheet.timer.kind === "failed" ? (
        <Text color="fg.error" role="alert">
          {timesheet.timer.error.message}
        </Text>
      ) : null}
      <Grid templateColumns={{ base: "1fr", lg: "22rem 1fr" }} gap="8">
        <EntryForm
          initial={blankEntryFields()}
          submitLabel="Add entry"
          services={services}
          submitting={creating}
          blocked={timesheet.entries.status === "loading"}
          error={createError}
          onSubmit={onCreate}
        />
        <Stack gap="4">
          <Field.Root>
            <Field.Label>Day</Field.Label>
            <Input
              type="date"
              name="day"
              value={timesheet.day}
              onChange={onDayChange}
            />
          </Field.Root>
          <DayEntryList
            timesheet={timesheet}
            now={now}
            onPlay={play}
            onPause={pause}
            onLoadMore={loadMore}
            onCopyPreviousDay={copyPreviousDay}
            onRemove={removeEntry}
            onEdit={(entry) =>
              void navigate(editEntryPath(entry.id), {
                state: editEntryNavigationState(entry),
              })
            }
          />
        </Stack>
      </Grid>
    </Stack>
  );
}
