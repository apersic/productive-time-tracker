import { Box, Flex } from "@chakra-ui/react";
import { Navigate, Route, Routes } from "react-router";
import { HomePage } from "./pages/home-page.tsx";
import { LoginPage } from "./pages/login-page.tsx";

export default function App() {
  return (
    <Flex minH="100vh" align="center" justify="center" px="4">
      <Box w="full" maxW="lg">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </Flex>
  );
}
