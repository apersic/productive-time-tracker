import { Box, Flex, Grid, Skeleton, Stack, Text } from "@chakra-ui/react";
import type { ReactElement, ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import {
  useAuth,
  type Credentials,
  type LogoutArgs,
  type Person,
} from "../lib/auth";
import { pageHeading } from "../lib/document";
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
  HOME_CONTENT_MAX_W,
  HOME_CREATE_PORTAL_ID,
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
    case "expired":
    case "unavailable":
      return <Navigate to="/login" replace />;
    case "authenticated":
      break;
    default: {
      const _exhaustive: never = session;
      return _exhaustive;
    }
  }

  function onLogout(args?: LogoutArgs) {
    logout(args);
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

function HomeShell(props: { children: ReactNode }): ReactElement {
  return (
    <Flex direction="column" h="100dvh" maxH="100dvh" overflow="hidden">
      {props.children}
    </Flex>
  );
}

function HomeMain(props: { children: ReactNode }): ReactElement {
  return (
    <Stack
      as="main"
      id="main"
      aria-label={pageHeading("home")}
      gap="6"
      w="full"
      maxW={HOME_CONTENT_MAX_W}
      mx="auto"
      px="4"
      py="6"
      pb={{ base: "24", lg: "6" }}
      flex="1"
      minH="0"
      overflow="hidden"
    >
      {props.children}
    </Stack>
  );
}

function HomeSkeleton(): ReactElement {
  return (
    <HomeShell>
      <HeaderSkeleton page="home" />
      <HomeMain>
        <Grid
          templateColumns={HOME_GRID_COLUMNS}
          templateRows={{ base: "auto minmax(0, 1fr)", lg: "minmax(0, 1fr)" }}
          gap="8"
          flex="1"
          minH="0"
        >
          <Box hideBelow={HOME_CREATE_SPLIT}>
            <EntryFormSkeleton />
          </Box>
          <Stack
            flex="1"
            minH="0"
            overflow="hidden"
            gap={{ base: "8", lg: "4" }}
          >
            <Skeleton
              height="10"
              borderRadius="md"
              aria-hidden
              flexShrink="0"
            />
            <DayEntryListSkeleton />
          </Stack>
        </Grid>
      </HomeMain>
    </HomeShell>
  );
}

function AuthenticatedHome(props: {
  credentials: Credentials;
  person: Person;
  logout: (args?: LogoutArgs) => void;
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
    <HomeShell>
      <Header page="home" person={props.person} logout={props.logout} />
      <HomeMain>
        <Box id={HOME_CREATE_PORTAL_ID} flexShrink="0" />
        {timesheet.timer.kind === "failed" ? (
          <Text color="fg.error" role="alert" flexShrink="0">
            {timesheet.timer.error.message}
          </Text>
        ) : null}
        <Grid
          templateColumns={HOME_GRID_COLUMNS}
          templateRows={{ base: "auto minmax(0, 1fr)", lg: "minmax(0, 1fr)" }}
          gap="8"
          flex="1"
          minH="0"
        >
          <Box minH="0" overflow="hidden">
            <CreateEntrySurface
              picker={picker}
              blocked={timesheet.entries.status === "loading"}
              onCreate={addEntry}
            />
          </Box>
          <Stack
            flex="1"
            minH="0"
            overflow="hidden"
            gap={{ base: "8", lg: "4" }}
          >
            <Box flexShrink="0">
              <DayField value={timesheet.day} onChange={selectDay} />
            </Box>
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
      </HomeMain>
    </HomeShell>
  );
}
