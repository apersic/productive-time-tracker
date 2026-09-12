import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { contentSecurityPolicy } from "./src/lib/document/csp.ts";
import {
  robotsTxt,
  shellHead,
  type HeadTag,
} from "./src/lib/document/shell.ts";

function originFromBaseUrl(baseUrl: string): string {
  try {
    return new URL(baseUrl).origin;
  } catch {
    return "https://api.productive.io";
  }
}

function contentSecurityPolicyPlugin(args: {
  apiOrigin: string;
  development: boolean;
}): Plugin {
  const policy = contentSecurityPolicy(args);
  return {
    name: "content-security-policy",
    transformIndexHtml() {
      return [
        {
          tag: "meta",
          attrs: {
            "http-equiv": "Content-Security-Policy",
            content: policy.meta,
          },
          injectTo: "head",
        },
      ];
    },
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader("Content-Security-Policy", policy.header);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader("Content-Security-Policy", policy.header);
        next();
      });
    },
  };
}

function headTagDescriptor(tag: HeadTag): {
  tag: string;
  children?: string;
  attrs?: Record<string, string>;
  injectTo: "head";
} {
  switch (tag.kind) {
    case "title":
      return {
        tag: "title",
        children: tag.text,
        injectTo: "head",
      };
    case "meta":
      return {
        tag: "meta",
        attrs: { name: tag.name, content: tag.content },
        injectTo: "head",
      };
    case "og":
      return {
        tag: "meta",
        attrs: { property: tag.property, content: tag.content },
        injectTo: "head",
      };
    case "link":
      return {
        tag: "link",
        attrs: { rel: tag.rel, href: tag.href, type: tag.type },
        injectTo: "head",
      };
    default: {
      const _exhaustive: never = tag;
      return _exhaustive;
    }
  }
}

function serveRobotsTxt(
  req: { method?: string; url?: string },
  res: {
    statusCode: number;
    setHeader: (name: string, value: string) => void;
    end: (body?: string) => void;
  },
  next: () => void,
): void {
  const path = req.url?.split("?")[0];
  if (req.method !== "GET" || path !== "/robots.txt") {
    next();
    return;
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  res.end(robotsTxt());
}

function documentPlugin(): Plugin {
  return {
    name: "document-head",
    transformIndexHtml() {
      return shellHead().map(headTagDescriptor);
    },
    configureServer(server) {
      server.middlewares.use(serveRobotsTxt);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveRobotsTxt);
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: robotsTxt(),
      });
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiOrigin = originFromBaseUrl(
    env.VITE_BASE_URL || "https://api.productive.io/api/v2",
  );
  const development = command === "serve" && mode !== "production";
  return {
    plugins: [
      react(),
      tailwindcss(),
      contentSecurityPolicyPlugin({ apiOrigin, development }),
      documentPlugin(),
    ],
  };
});
