import { Box, Flex } from "@chakra-ui/react";
import { Navigate, Route, Routes } from "react-router";
import { EditEntryPage } from "./pages/edit-entry-page.tsx";
import { HomePage } from "./pages/home-page.tsx";
import { LoginPage } from "./pages/login-page.tsx";

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Flex minH="100vh" align="center" justify="center" px="4">
            <Box w="full" maxW="lg">
              <LoginPage />
            </Box>
          </Flex>
        }
      />
      <Route path="/" element={<HomePage />} />
      <Route path="/edit/:entryId" element={<EditEntryPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
