import { Box, Flex, Link } from "@chakra-ui/react";
import { Navigate, Route, Routes } from "react-router";
import { EditEntryPage } from "./pages/edit-entry-page.tsx";
import { HomePage } from "./pages/home-page.tsx";
import { LoginPage } from "./pages/login-page.tsx";

export default function App() {
  return (
    <>
      <Link
        href="#main"
        variant="plain"
        position="fixed"
        left="3"
        top="2"
        zIndex="overlay"
        bg="fg"
        color="bg"
        px="2"
        py="1"
        borderRadius="md"
        fontWeight="medium"
        textStyle="sm"
        textDecoration="none"
        transform="translateY(calc(-100% - 1.5rem))"
        _focusVisible={{ transform: "none" }}
      >
        Skip to content
      </Link>
      <Routes>
        <Route
          path="/login"
          element={
            <Flex
              as="main"
              id="main"
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
                <LoginPage />
              </Box>
            </Flex>
          }
        />
        <Route path="/" element={<HomePage />} />
        <Route path="/edit/:entryId" element={<EditEntryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
