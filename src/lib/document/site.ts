/**
 * Site copy for the document head.
 *
 * Not done: SSR, JSON-LD, canonical, og:url, a public origin, PWA, PNG icons.
 * Runtime never writes meta tags. PageHeading only assigns document.title.
 */

import { PALETTE } from "../../styles/palette.ts";

export type AssetPath = `/${string}`;

export const SITE_NAME = "Productive Time Tracker";

export const SITE_DESCRIPTION =
  "Private browser app for logging time in Productive. Sign in with an API token.";

export const SITE_ROBOTS = "noindex, nofollow";

export const SITE_THEME_COLOR = PALETTE.canvas;

export const SITE_LOCALE = "en";

export const SITE_ICON_HREF: AssetPath = "/favicon.svg";
