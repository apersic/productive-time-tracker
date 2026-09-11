import {
  SITE_DESCRIPTION,
  SITE_ICON_HREF,
  SITE_LOCALE,
  SITE_NAME,
  SITE_ROBOTS,
  SITE_THEME_COLOR,
  type AssetPath,
} from "./site.ts";

export type HeadTag =
  | { readonly kind: "title"; readonly text: string }
  | {
      readonly kind: "meta";
      readonly name:
        | "description"
        | "robots"
        | "theme-color"
        | "twitter:card"
        | "twitter:title"
        | "twitter:description"
        | "twitter:image";
      readonly content: string;
    }
  | {
      readonly kind: "og";
      readonly property:
        | "og:type"
        | "og:locale"
        | "og:site_name"
        | "og:title"
        | "og:description"
        | "og:image"
        | "og:image:alt";
      readonly content: string;
    }
  | {
      readonly kind: "link";
      readonly rel: "icon";
      readonly href: AssetPath;
      readonly type: "image/svg+xml";
    };

export function shellHead(): readonly HeadTag[] {
  return [
    { kind: "title", text: SITE_NAME },
    { kind: "meta", name: "description", content: SITE_DESCRIPTION },
    { kind: "meta", name: "robots", content: SITE_ROBOTS },
    { kind: "meta", name: "theme-color", content: SITE_THEME_COLOR },
    { kind: "og", property: "og:type", content: "website" },
    { kind: "og", property: "og:locale", content: SITE_LOCALE },
    { kind: "og", property: "og:site_name", content: SITE_NAME },
    { kind: "og", property: "og:title", content: SITE_NAME },
    { kind: "og", property: "og:description", content: SITE_DESCRIPTION },
    { kind: "og", property: "og:image", content: SITE_ICON_HREF },
    { kind: "og", property: "og:image:alt", content: SITE_NAME },
    { kind: "meta", name: "twitter:card", content: "summary" },
    { kind: "meta", name: "twitter:title", content: SITE_NAME },
    { kind: "meta", name: "twitter:description", content: SITE_DESCRIPTION },
    { kind: "meta", name: "twitter:image", content: SITE_ICON_HREF },
    {
      kind: "link",
      rel: "icon",
      href: SITE_ICON_HREF,
      type: "image/svg+xml",
    },
  ];
}

export function robotsTxt(): string {
  return "User-agent: *\nDisallow: /\n";
}
