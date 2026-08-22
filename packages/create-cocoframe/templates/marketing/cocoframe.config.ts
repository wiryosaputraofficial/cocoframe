import { defineConfig } from "@cocoframe/core";

export default defineConfig({
  language: "en",
  siteName: "{{PROJECT_NAME}}",
  stylesheets: ["/styles/app.css"],
  openapi: { title: "{{PROJECT_NAME}} API", version: "1.0.0" },
});