import { Navigate, Route, Routes } from "react-router";
import { SkipToContent } from "./lib/document";
import { EditEntryPage } from "./pages/edit-entry-page.tsx";
import { HomePage } from "./pages/home-page.tsx";
import { LoginPage } from "./pages/login-page.tsx";

export default function App() {
  return (
    <>
      <SkipToContent />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/edit/:entryId" element={<EditEntryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
