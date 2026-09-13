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
import {
  parseAccessToken,
  parseOrganizationId,
  useAuth,
  type AuthError,
} from "../lib/auth";
import { useCopy } from "../lib/copy";
import { PageHeading, SITE_NAME } from "../lib/document";
import { Card, LanguagePicker } from "../ui";
import {
  FieldWarning,
  focusFirstInvalid,
  presenceIssue,
  type FieldIssue,
} from "../lib/forms";
import { EyeIcon, EyeOffIcon } from "../lib/icons";

type LoginFailure = AuthError | "missingFields";

export function LoginPage() {
  const copy = useCopy();
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
  const [error, setError] = useState<LoginFailure | undefined>(undefined);
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
              <Stack
                gap="5"
                role="status"
                aria-busy
                aria-label={copy.login.loading}
              >
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
      ? copy.failure[session.error]
      : session.kind === "expired"
        ? copy.notice.sessionExpired
        : undefined;
  const formError =
    error === undefined
      ? restoreError
      : error === "missingFields"
        ? copy.login.missingFields
        : copy.failure[error];

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
      setError("missingFields");
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
        setError(result.error);
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
              <Field.Label>{copy.login.organizationLabel}</Field.Label>
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
                  placeholder={copy.login.organizationPlaceholder}
                />
              </InputGroup>
              {organizationIssue ? (
                <Field.ErrorText>
                  {copy.fieldIssue[organizationIssue]}
                </Field.ErrorText>
              ) : null}
            </Field.Root>
            <Field.Root required invalid={tokenIssue !== undefined}>
              <Field.Label>{copy.login.tokenLabel}</Field.Label>
              <InputGroup
                endElement={
                  <Flex align="center" gap="1">
                    {tokenIssue ? <FieldWarning /> : null}
                    <IconButton
                      type="button"
                      variant="ghost"
                      size="xs"
                      aria-label={
                        accessTokenVisible
                          ? copy.login.hideToken
                          : copy.login.showToken
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
                  placeholder={copy.login.tokenPlaceholder}
                />
              </InputGroup>
              {tokenIssue ? (
                <Field.ErrorText>{copy.fieldIssue[tokenIssue]}</Field.ErrorText>
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
              {copy.login.submit}
            </Button>
          </Stack>
        </Card>
      </form>
    </LoginChrome>
  );
}

function LoginIntro(): ReactElement {
  const copy = useCopy();
  return (
    <Stack gap="3">
      <PageHeading page="login" as="h2" />
      <Text color="fg.muted" textStyle="sm" maxW="65ch">
        {copy.login.intro}
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
      position="relative"
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
      <Box
        position="absolute"
        css={{
          top: "max(0.75rem, env(safe-area-inset-top))",
          right: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        <LanguagePicker />
      </Box>
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
