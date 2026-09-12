import QUnit from "qunit";
import { contentSecurityPolicy } from "../../src/lib/document/csp.ts";
import { documentTitle, pageHeading } from "../../src/lib/document/page.ts";
import { robotsTxt, shellHead } from "../../src/lib/document/shell.ts";

QUnit.module("document");

QUnit.test("pageHeading literals", (assert) => {
  assert.equal(pageHeading("login"), "Log in");
  assert.equal(pageHeading("home"), "Home");
  assert.equal(pageHeading("editEntry"), "Edit time entry");
});

QUnit.test("documentTitle literals", (assert) => {
  assert.equal(documentTitle("login"), "Log in · Productive Time Tracker");
  assert.equal(documentTitle("home"), "Home · Productive Time Tracker");
  assert.equal(
    documentTitle("editEntry"),
    "Edit time entry · Productive Time Tracker",
  );
});

QUnit.test("shellHead crawler tags", (assert) => {
  const tags = shellHead();
  const title = tags.find((tag) => tag.kind === "title");
  assert.equal(
    title?.kind === "title" ? title.text : undefined,
    "Productive Time Tracker",
  );

  const description = tags.find(
    (tag) => tag.kind === "meta" && tag.name === "description",
  );
  assert.equal(
    description?.kind === "meta" ? description.content : undefined,
    "Private browser app for logging time in Productive. Sign in with an API token.",
  );

  const robots = tags.find(
    (tag) => tag.kind === "meta" && tag.name === "robots",
  );
  assert.equal(
    robots?.kind === "meta" ? robots.content : undefined,
    "noindex, nofollow",
  );

  const themeColor = tags.find(
    (tag) => tag.kind === "meta" && tag.name === "theme-color",
  );
  assert.equal(
    themeColor?.kind === "meta" ? themeColor.content : undefined,
    "#FAF8F5",
  );

  const locale = tags.find(
    (tag) => tag.kind === "og" && tag.property === "og:locale",
  );
  assert.equal(locale?.kind === "og" ? locale.content : undefined, "en");

  const image = tags.find(
    (tag) => tag.kind === "og" && tag.property === "og:image",
  );
  assert.equal(
    image?.kind === "og" ? image.content : undefined,
    "/favicon.svg",
  );

  const twitterCard = tags.find(
    (tag) => tag.kind === "meta" && tag.name === "twitter:card",
  );
  assert.equal(
    twitterCard?.kind === "meta" ? twitterCard.content : undefined,
    "summary",
  );

  const icon = tags.find((tag) => tag.kind === "link" && tag.rel === "icon");
  assert.equal(icon?.kind === "link" ? icon.href : undefined, "/favicon.svg");

  assert.equal(
    tags.some((tag) => {
      if (tag.kind !== "og") {
        return false;
      }
      const property: string = tag.property;
      return property === "og:url";
    }),
    false,
  );
  assert.equal(
    tags.some((tag) => {
      if (tag.kind !== "link") {
        return false;
      }
      const rel: string = tag.rel;
      return rel === "canonical";
    }),
    false,
  );
});

QUnit.test("robotsTxt disallows all crawlers", (assert) => {
  assert.equal(robotsTxt(), "User-agent: *\nDisallow: /\n");
});

QUnit.test(
  "meta CSP omits frame-ancestors and the header keeps it",
  (assert) => {
    const policy = contentSecurityPolicy({
      apiOrigin: "https://api.productive.io",
      development: false,
    });
    assert.equal(
      policy.header,
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.productive.io; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    );
    assert.equal(
      policy.meta,
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.productive.io; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
    );
  },
);
