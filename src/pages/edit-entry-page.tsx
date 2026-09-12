import { Stack, Text } from "@chakra-ui/react";
import { useEffect, useState, type ReactElement } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";
import {
  useAuth,
  type Credentials,
  type LogoutArgs,
  type Person,
} from "../lib/auth";
import { pageHeading } from "../lib/document";
import { entryFieldsFrom } from "../features/timesheet";
import { resolveEditEntryRoute, type EditEntryRoute } from "../features/edit";
import { dayMoved, useEditEntry } from "../features/edit/hooks";
import {
  BackHomeLink,
  ENTRY_FORM_WIDTH,
  EntryForm,
  EntryFormSkeleton,
  Header,
  HeaderSkeleton,
} from "../ui";
import type { CalendarDay } from "../lib/time/calendar-day.ts";

const FORM_PENDING_NAME = "Loading time entry";

export function EditEntryPage() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const { entryId } = useParams();
  const location = useLocation();

  switch (session.kind) {
    case "booting":
      return (
        <>
          <HeaderSkeleton page="editEntry" />
          <Stack
            as="main"
            id="main"
            aria-label={pageHeading("editEntry")}
            gap="6"
            w="full"
            px="4"
            py="6"
            pb="6"
          >
            <Stack gap="4" maxW={ENTRY_FORM_WIDTH} w="full" mx="auto">
              <EditEntryLoadingBody />
            </Stack>
          </Stack>
        </>
      );
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

  const route = resolveEditEntryRoute(entryId, location.state);

  return (
    <AuthenticatedEditEntry
      key={entryId ?? "invalid"}
      credentials={session.credentials}
      person={session.person}
      logout={onLogout}
      route={route}
    />
  );
}

function EditEntryLoadingBody(props: { day?: CalendarDay }): ReactElement {
  return (
    <Stack gap="4">
      <BackHomeLink day={props.day} />
      <Stack
        gap="4"
        role="status"
        aria-busy="true"
        aria-label={FORM_PENDING_NAME}
      >
        <EntryFormSkeleton />
      </Stack>
    </Stack>
  );
}

function useDiscardPrompt(dirty: boolean) {
  useEffect(() => {
    if (!dirty) {
      return;
    }
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [dirty]);
}

function AuthenticatedEditEntry(props: {
  credentials: Credentials;
  person: Person;
  logout: (args?: LogoutArgs) => void;
  route: EditEntryRoute;
}) {
  const { page, picker, save, selectDay } = useEditEntry({
    credentials: props.credentials,
    person: props.person,
    logout: props.logout,
    route: props.route,
  });
  const [fieldsDirty, setFieldsDirty] = useState(false);
  const dirty = fieldsDirty || dayMoved(page);
  useDiscardPrompt(dirty);

  let body;
  switch (page.kind) {
    case "invalidId":
    case "missing":
      body = (
        <Stack gap="4">
          <BackHomeLink />
          <Text>This time entry was not found.</Text>
        </Stack>
      );
      break;
    case "loading":
      body = <EditEntryLoadingBody />;
      break;
    case "failed":
      body = (
        <Stack gap="4">
          <BackHomeLink />
          <Text color="fg.error" role="alert">
            {page.error.message}
          </Text>
        </Stack>
      );
      break;
    case "ready":
    case "saving":
      body = (
        <Stack gap={4}>
          <BackHomeLink day={page.session.entry.day} dirty={dirty} />
          <EntryForm
            key={page.session.entry.id}
            initial={entryFieldsFrom(page.session.entry)}
            day={{ value: page.session.day, select: selectDay }}
            submitLabel="Save changes"
            picker={picker}
            submitting={page.kind === "saving"}
            blocked={false}
            error={undefined}
            onSubmit={save}
            onDirtyChange={setFieldsDirty}
          />
        </Stack>
      );
      break;
    default: {
      const _exhaustive: never = page;
      return _exhaustive;
    }
  }

  return (
    <>
      <Header page="editEntry" person={props.person} logout={props.logout} />
      <Stack
        as="main"
        id="main"
        aria-label={pageHeading("editEntry")}
        gap="6"
        w="full"
        px="4"
        py="6"
        pb="6"
      >
        <Stack gap="4" maxW={ENTRY_FORM_WIDTH} w="full" mx="auto">
          {body}
        </Stack>
      </Stack>
    </>
  );
}
