import { Button, Heading, Stack, Text } from "@chakra-ui/react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "../lib/auth/use-auth.ts";

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
    <Stack gap="6" align="center">
      <Heading as="h1" size="lg">
        Home
      </Heading>
      <Text>{session.person.displayName}</Text>
      <Button type="button" variant="outline" onClick={onLogout}>
        Log out
      </Button>
    </Stack>
  );
}
