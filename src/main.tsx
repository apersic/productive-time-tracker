import { ChakraProvider } from "@chakra-ui/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App.tsx";
import { AuthProvider } from "./lib/auth";
import { currentLanguage } from "./lib/copy";
import { NoticeHost } from "./lib/notice";
import { system } from "./styles/theme.ts";
import "./styles/main.css";

currentLanguage();

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

createRoot(root).render(
  <StrictMode>
    <ChakraProvider value={system}>
      <NoticeHost />
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ChakraProvider>
  </StrictMode>,
);
