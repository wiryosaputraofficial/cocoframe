import { defineConfig } from "@cocoframe/core";
import { requestId } from "@cocoframe/observability";
import { csrfProtection, securityHeaders } from "@cocoframe/security";

export default defineConfig({
  language: "id",
  siteName: "CocoFrame Example",
  stylesheets: [
    "https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap",
    "/styles/00-base.css",
    "/styles/10-features.css",
    "/styles/20-docs.css",
    "/styles/30-components.css",
    "/styles/40-documentation-guide.css",
    "/styles/50-official-components.css",
    "/styles/99-framework-migration.css",
  ],
  openapi: {
    title: "CocoFrame Example API",
    version: "1.0.0",
    description: "API contract generated from the example application.",
  },
  middleware: [
    requestId(),
    securityHeaders({
      contentSecurityPolicy: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' https://api.fontshare.com; font-src 'self' https://cdn.fontshare.com; img-src 'self' data: https:; connect-src 'self'",
    }),
    csrfProtection({ match: ({ url }) => url.pathname === "/contact" }),
  ],
});
