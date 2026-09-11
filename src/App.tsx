import { Link } from "@chakra-ui/react";
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/edit/:entryId" element={<EditEntryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
