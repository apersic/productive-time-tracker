import {
  Button,
  Field,
  Heading,
  IconButton,
  Input,
  InputGroup,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useState, type SubmitEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { parseAccessToken, parseOrganizationId } from "../lib/auth/session.ts";
import { useAuth } from "../lib/auth/use-auth.ts";
import { EyeIcon, EyeOffIcon } from "../lib/icons";

export function LoginPage() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const [organizationId, setOrganizationId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [accessTokenVisible, setAccessTokenVisible] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  switch (session.kind) {
    case "booting":
      return <Text>Loading</Text>;
    case "authenticated":
      return <Navigate to="/" replace />;
    case "anonymous":
    case "unavailable":
      break;
    default: {
      const _exhaustive: never = session;
      return _exhaustive;
    }
  }

  const restoreError =
    session.kind === "unavailable" ? session.error.message : undefined;

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }
    const parsedOrganizationId = parseOrganizationId(organizationId);
    const parsedAccessToken = parseAccessToken(accessToken);
    if (!parsedOrganizationId || !parsedAccessToken) {
      setError("Enter an API token and an organization ID.");
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      const result = await login({
        organizationId: parsedOrganizationId,
        accessToken: parsedAccessToken,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      void navigate("/", { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack
      gap="6"
      maxW="md"
      w="full"
      css={{
        backgroundColor: "#fdfdfd",
        border: "1px solid #e7e7e7",
        padding: "24px",
        borderRadius: "12px",
      }}
    >
      <Heading as="h1" size="lg">
        Log in
      </Heading>
      <Text>Enter your Productive API token and organization ID.</Text>
      <form onSubmit={(event) => void onSubmit(event)}>
        <Stack gap="4">
          <Field.Root required>
            <Field.Label>Organization ID</Field.Label>
            <Input
              name="organizationId"
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
              autoComplete="off"
            />
          </Field.Root>
          <Field.Root required>
            <Field.Label>API token</Field.Label>
            <InputGroup
              endElement={
                <IconButton
                  type="button"
                  variant="ghost"
                  size="xs"
                  aria-label={accessTokenVisible ? "Hide token" : "Show token"}
                  onClick={() => setAccessTokenVisible((visible) => !visible)}
                >
                  {accessTokenVisible ? <EyeOffIcon /> : <EyeIcon />}
                </IconButton>
              }
            >
              <Input
                name="accessToken"
                type={accessTokenVisible ? "text" : "password"}
                value={accessToken}
                onChange={(event) => setAccessToken(event.target.value)}
                autoComplete="off"
              />
            </InputGroup>
          </Field.Root>
          {(error ?? restoreError) ? (
            <Text color="fg.error" role="alert">
              {error ?? restoreError}
            </Text>
          ) : null}
          <Button type="submit" loading={submitting}>
            Log in
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
