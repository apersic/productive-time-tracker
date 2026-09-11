import { Button, Stack, Text } from "@chakra-ui/react";
import type { ReactElement } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";
import { useAuth, type Credentials, type Person } from "../lib/auth";
import { entryFieldsFrom } from "../features/timesheet";
import { resolveEditEntryRoute, type EditEntryRoute } from "../features/edit";
import { useEditEntry } from "../features/edit/hooks";
import { EntryForm, EntryFormSkeleton, Header, HeaderSkeleton } from "../ui";

const FORM_PENDING_NAME = "Loading time entry";

export function EditEntryPage() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const { entryId } = useParams();
  const location = useLocation();

  switch (session.kind) {
    case "booting":
      return (
        <Stack gap="6" w="full" px="4" pb="6">
          <HeaderSkeleton page="editEntry" />
          <EditEntryLoadingBody />
        </Stack>
      );
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

function EditEntryLoadingBody(): ReactElement {
  const navigate = useNavigate();
  return (
    <Stack gap="4">
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          void navigate("/", { replace: true });
        }}
      >
        Back to home
      </Button>
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

function AuthenticatedEditEntry(props: {
  credentials: Credentials;
  person: Person;
  logout: () => void;
  route: EditEntryRoute;
}) {
  const navigate = useNavigate();
  const { page, picker, save } = useEditEntry({
    credentials: props.credentials,
    person: props.person,
    logout: props.logout,
    route: props.route,
  });

  let body;
  switch (page.kind) {
    case "invalidId":
    case "missing":
      body = (
        <Stack gap="4">
          <Text>This time entry was not found.</Text>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void navigate("/", { replace: true });
            }}
          >
            Back to home
          </Button>
        </Stack>
      );
      break;
    case "loading":
      body = <EditEntryLoadingBody />;
      break;
    case "failed":
      body = (
        <Stack gap="4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void navigate("/", { replace: true });
            }}
          >
            Back to home
          </Button>
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
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void navigate("/", { replace: true });
            }}
          >
            Back to home
          </Button>
          <EntryForm
            key={page.entry.id}
            initial={entryFieldsFrom(page.entry)}
            submitLabel="Save changes"
            picker={picker}
            submitting={page.kind === "saving"}
            blocked={false}
            error={undefined}
            onSubmit={save}
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
    <Stack gap="6" w="full" px="4" pb="6">
      <Header page="editEntry" person={props.person} logout={props.logout} />
      {body}
    </Stack>
  );
}
