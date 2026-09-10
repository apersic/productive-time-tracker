import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

function originFromBaseUrl(baseUrl: string): string {
  try {
    return new URL(baseUrl).origin;
  } catch {
    return "https://api.productive.io";
  }
}

function contentSecurityPolicy(args: {
  apiOrigin: string;
  development: boolean;
}): string {
  const scriptSrc = args.development
    ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
    : "script-src 'self'";
  const connectSrc = args.development
    ? `connect-src 'self' ws: wss: ${args.apiOrigin}`
    : `connect-src 'self' ${args.apiOrigin}`;
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    connectSrc,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

function contentSecurityPolicyPlugin(args: {
  apiOrigin: string;
  development: boolean;
}): Plugin {
  const content = contentSecurityPolicy(args);
  return {
    name: "content-security-policy",
    transformIndexHtml() {
      return [
        {
          tag: "meta",
          attrs: {
            "http-equiv": "Content-Security-Policy",
            content,
          },
          injectTo: "head",
        },
      ];
    },
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader("Content-Security-Policy", content);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader("Content-Security-Policy", content);
        next();
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
    ],
  };
});
