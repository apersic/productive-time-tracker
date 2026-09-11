import { defaultConfig } from "@chakra-ui/react";
import { createSystem } from "@chakra-ui/react/styled-system";
import { PALETTE } from "./palette.ts";

const SYSTEM_SANS =
  'ui-sans-serif, system-ui, "Segoe UI", Helvetica, Arial, sans-serif';

export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        canvas: { value: PALETTE.canvas },
        surface: { value: PALETTE.surface },
        text: { value: PALETTE.text },
        blue: {
          500: { value: PALETTE.primary },
        },
      },
      fonts: {
        heading: { value: SYSTEM_SANS },
        body: { value: SYSTEM_SANS },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          DEFAULT: { value: { _light: "{colors.surface}" } },
          subtle: { value: { _light: "{colors.canvas}" } },
        },
        fg: {
          DEFAULT: { value: { _light: "{colors.text}" } },
        },
      },
    },
  },
  globalCss: {
    html: {
      bg: "bg.subtle",
      color: "fg",
      colorPalette: "gray",
      scrollPaddingTop: "4.5rem",
    },
    ".note-editor .ProseMirror.is-empty::before": {
      color: "fg.subtle",
    },
  },
});
