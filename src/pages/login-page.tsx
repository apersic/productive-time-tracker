import {
  Box,
  Button,
  Field,
  Flex,
  Heading,
  IconButton,
  Input,
  InputGroup,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type SubmitEvent,
} from "react";
import { Navigate, useNavigate } from "react-router";
import { parseAccessToken, parseOrganizationId, useAuth } from "../lib/auth";
import { PageHeading, SITE_NAME } from "../lib/document";
import { Card } from "../ui";
import {
  fieldIssueMessage,
  FieldWarning,
  focusFirstInvalid,
  presenceIssue,
  type FieldIssue,
} from "../lib/forms";
import { EyeIcon, EyeOffIcon } from "../lib/icons";

export function LoginPage() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const [organizationId, setOrganizationId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [accessTokenVisible, setAccessTokenVisible] = useState(false);
  const [organizationIssue, setOrganizationIssue] = useState<
    FieldIssue | undefined
  >(undefined);
  const [tokenIssue, setTokenIssue] = useState<FieldIssue | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const formErrorId = useId();

  useEffect(() => {
    if (!submitFailed) {
      return;
    }
    const form = formRef.current;
    if (form) {
      focusFirstInvalid(form);
    }
  }, [submitFailed, organizationIssue, tokenIssue]);

  switch (session.kind) {
    case "booting":
      return (
        <LoginChrome>
          <Card>
            <Stack gap="5">
              <LoginIntro />
              <Stack gap="5" role="status" aria-busy aria-label="Loading…">
                <Skeleton height="10" borderRadius="md" />
                <Skeleton height="10" borderRadius="md" />
                <Skeleton height="10" borderRadius="md" />
              </Stack>
            </Stack>
          </Card>
        </LoginChrome>
      );
    case "authenticated":
      return <Navigate to="/" replace />;
    case "anonymous":
    case "expired":
    case "unavailable":
      break;
    default: {
      const _exhaustive: never = session;
      return _exhaustive;
    }
  }

  const restoreError =
    session.kind === "unavailable"
      ? session.error.message
      : session.kind === "expired"
        ? "Your session expired. Log in again."
        : undefined;
  const formError = error ?? restoreError;

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }
    const nextOrganizationIssue = presenceIssue(organizationId);
    const nextTokenIssue = presenceIssue(accessToken);
    setOrganizationIssue(nextOrganizationIssue);
    setTokenIssue(nextTokenIssue);
    if (nextOrganizationIssue || nextTokenIssue) {
      setSubmitFailed(true);
      return;
    }
    setSubmitFailed(false);
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
    <LoginChrome>
      <form
        ref={formRef}
        noValidate
        aria-describedby={formError ? formErrorId : undefined}
        onSubmit={(event) => void onSubmit(event)}
      >
        <Card>
          <Stack gap="5">
            <LoginIntro />
            <Field.Root required invalid={organizationIssue !== undefined}>
              <Field.Label>Organization ID</Field.Label>
              <InputGroup
                endElement={organizationIssue ? <FieldWarning /> : undefined}
              >
                <Input
                  name="organizationId"
                  value={organizationId}
                  onChange={(event) => {
                    setOrganizationId(event.target.value);
                    setOrganizationIssue(undefined);
                  }}
                  onBlur={() => {
                    setOrganizationIssue(presenceIssue(organizationId));
                  }}
                  autoComplete="username"
                  spellCheck={false}
                  placeholder="12345…"
                />
              </InputGroup>
              {organizationIssue ? (
                <Field.ErrorText>
                  {fieldIssueMessage(organizationIssue)}
                </Field.ErrorText>
              ) : null}
            </Field.Root>
            <Field.Root required invalid={tokenIssue !== undefined}>
              <Field.Label>API token</Field.Label>
              <InputGroup
                endElement={
                  <Flex align="center" gap="1">
                    {tokenIssue ? <FieldWarning /> : null}
                    <IconButton
                      type="button"
                      variant="ghost"
                      size="xs"
                      aria-label={
                        accessTokenVisible ? "Hide token" : "Show token"
                      }
                      onClick={() =>
                        setAccessTokenVisible((visible) => !visible)
                      }
                    >
                      {accessTokenVisible ? <EyeOffIcon /> : <EyeIcon />}
                    </IconButton>
                  </Flex>
                }
              >
                <Input
                  name="accessToken"
                  type={accessTokenVisible ? "text" : "password"}
                  value={accessToken}
                  onChange={(event) => {
                    setAccessToken(event.target.value);
                    setTokenIssue(undefined);
                  }}
                  onBlur={() => {
                    setTokenIssue(presenceIssue(accessToken));
                  }}
                  autoComplete="current-password"
                  spellCheck={false}
                  placeholder="Paste your token…"
                />
              </InputGroup>
              {tokenIssue ? (
                <Field.ErrorText>
                  {fieldIssueMessage(tokenIssue)}
                </Field.ErrorText>
              ) : null}
            </Field.Root>
            {formError ? (
              <Text id={formErrorId} color="fg.error" role="alert">
                {formError}
              </Text>
            ) : null}
            <Button
              type="submit"
              colorPalette="blue"
              loading={submitting}
              width="full"
            >
              Log in
            </Button>
          </Stack>
        </Card>
      </form>
    </LoginChrome>
  );
}

function LoginIntro(): ReactElement {
  return (
    <Stack gap="3">
      <PageHeading page="login" as="h2" />
      <Text color="fg.muted" textStyle="sm" maxW="65ch">
        Enter your Productive API token and organization ID.
      </Text>
    </Stack>
  );
}

function LoginChrome(props: { children: ReactElement }) {
  return (
    <Flex
      as="main"
      id="main"
      aria-label={SITE_NAME}
      minH="100dvh"
      bg="bg.subtle"
      color="fg"
      align="center"
      justify="center"
      css={{
        paddingTop: "max(2.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
        "@media (min-width: 48em)": {
          paddingLeft: "max(4rem, env(safe-area-inset-left))",
          paddingRight: "max(4rem, env(safe-area-inset-right))",
        },
      }}
    >
      <Box w="full" maxW="md">
        <Stack gap="8" w="full" css={{ touchAction: "manipulation" }}>
          <Heading
            as="h1"
            size="2xl"
            fontFamily="heading"
            translate="no"
            css={{ textWrap: "pretty" }}
          >
            {SITE_NAME}
          </Heading>
          {props.children}
        </Stack>
      </Box>
    </Flex>
  );
}
