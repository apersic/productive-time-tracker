export type ContentSecurityPolicy = {
  readonly header: string;
  readonly meta: string;
};

export function contentSecurityPolicy(args: {
  apiOrigin: string;
  development: boolean;
}): ContentSecurityPolicy {
  const scriptSrc = args.development
    ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
    : "script-src 'self'";
  const connectSrc = args.development
    ? `connect-src 'self' ws: wss: ${args.apiOrigin}`
    : `connect-src 'self' ${args.apiOrigin}`;
  const shared = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    connectSrc,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  return {
    header: [...shared, "frame-ancestors 'none'"].join("; "),
    meta: shared.join("; "),
  };
}
