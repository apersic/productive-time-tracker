import { Box, Grid, Skeleton, Stack, Text } from "@chakra-ui/react";
import type { ReactElement } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useAuth, type Credentials, type Person } from "../lib/auth";
import { todayLocal } from "../lib/time/calendar-day.ts";
import { useDayTimesheet } from "../features/timesheet/hooks";
import {
  editEntryNavigationState,
  editEntryPath,
  parseHomeReturn,
} from "../features/edit";
import {
  CreateEntrySurface,
  DayEntryList,
  DayEntryListSkeleton,
  DayField,
  EntryFormSkeleton,
  Header,
  HeaderSkeleton,
  HOME_CREATE_SPLIT,
  HOME_GRID_COLUMNS,
} from "../ui";

export function HomePage() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  switch (session.kind) {
    case "booting":
      return <HomeSkeleton />;
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

function HomeSkeleton(): ReactElement {
  return (
    <>
      <HeaderSkeleton page="home" />
      <Stack
        as="main"
        id="main"
        gap="6"
        w="full"
        px="4"
        py="6"
        pb={{ base: "24", lg: "6" }}
      >
        <Grid templateColumns={HOME_GRID_COLUMNS} gap="8">
          <Box hideBelow={HOME_CREATE_SPLIT}>
            <EntryFormSkeleton />
          </Box>
          <Stack gap="4">
            <Skeleton height="10" borderRadius="md" aria-hidden />
            <DayEntryListSkeleton />
          </Stack>
        </Grid>
      </Stack>
    </>
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
    picker,
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

  return (
    <>
      <Header page="home" person={props.person} logout={props.logout} />
      <Stack
        as="main"
        id="main"
        gap="6"
        w="full"
        px="4"
        py="6"
        pb={{ base: "24", lg: "6" }}
      >
        {timesheet.timer.kind === "failed" ? (
          <Text color="fg.error" role="alert">
            {timesheet.timer.error.message}
          </Text>
        ) : null}
        <Grid templateColumns={HOME_GRID_COLUMNS} gap="8">
          <CreateEntrySurface
            picker={picker}
            blocked={timesheet.entries.status === "loading"}
            onCreate={addEntry}
          />
          <Stack gap="4">
            <DayField value={timesheet.day} onChange={selectDay} />
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
    </>
  );
}
