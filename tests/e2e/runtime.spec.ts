import { expect, test } from "@playwright/test";
import { captureClientErrors } from "./helpers.ts";

test("production hydrates reactive islands with a strict CSP and no client errors", async ({ page }) => {
  const assertNoClientErrors = captureClientErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  const policy = response?.headers()["content-security-policy"] ?? "";
  expect(policy).toContain("script-src 'self'");
  expect(policy).not.toContain("'unsafe-inline'");
  await expect(page).toHaveTitle(/CocoFrame/i);
  await expect(page.locator('script[src="/coco-assets/dev.js"]')).toHaveCount(0);
  await expect.poll(() => page.locator("coco-island[data-coco-mounted]").count()).toBeGreaterThan(0);

  const executableInlineScripts = await page.locator("script:not([src])").evaluateAll((scripts) =>
    scripts.filter((script) => {
      const type = script.getAttribute("type")?.toLowerCase();
      return !type || type === "text/javascript" || type === "module";
    }).length,
  );
  expect(executableInlineScripts).toBe(0);

  await page.getByRole("button", { name: "Show testimonial 2" }).click();
  await expect(page.locator(".testimonial-card.active")).toContainText("Dewi Lestari");
  await expect(page.locator("[data-coco-dev-overlay]")).toHaveCount(0);
  assertNoClientErrors();
});

test("component catalog live search, sorting, and dialog work with keyboard input", async ({ page }) => {
  test.setTimeout(60_000);
  const assertNoClientErrors = captureClientErrors(page);
  await page.goto("/components#catalog", { waitUntil: "domcontentloaded" });
  await expect(page.locator('coco-island[data-coco-module*="component-browser"][data-coco-mounted]')).toHaveCount(1, { timeout: 30_000 });
  const sidebarComponentIds = await page.locator('.docs-sidebar a[href^="#"]').evaluateAll((links) =>
    links.map((link) => link.getAttribute("href")?.slice(1) ?? "")
      .filter((id) => id && document.getElementById(id)?.classList.contains("official-component")),
  );
  const renderedSidebarIds = await page.locator(".official-component").evaluateAll(
    (sections, sidebarIds) => sections.map((section) => section.id).filter((id) => sidebarIds.includes(id)),
    sidebarComponentIds,
  );
  expect(renderedSidebarIds).toEqual(sidebarComponentIds);


  const search = page.getByRole("searchbox", { name: "Search components and icons" });
  await page.keyboard.press("Control+K");
  await expect(search).toBeFocused();
  await search.fill("DataTable");
  await expect(page.getByRole("status")).toContainText("1 of");
  await expect(page.locator(".official-component")).toHaveCount(1);

  const serviceHeader = page.locator("#data-table th").filter({ hasText: "Service" });
  const firstService = page.locator("#data-table tbody tr").first().locator("td").first();
  await expect(serviceHeader).toHaveAttribute("aria-sort", "ascending");
  await expect(firstService).toHaveText("API");
  await serviceHeader.getByRole("link", { name: "Service" }).click();
  await expect(serviceHeader).toHaveAttribute("aria-sort", "descending");
  await expect(firstService).toHaveText("Worker");

  await search.fill("Dialog");
  const dialogReference = page.locator("#dialog");
  await expect(dialogReference).toBeVisible();
  const openButton = dialogReference.getByRole("button", { name: "Open modal" });
  await openButton.focus();
  await expect(openButton).toBeFocused();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Publish this project?" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();

  await search.fill("");
  await page.getByLabel("Category").selectOption("AI & CHAT");
  await expect(page.locator(".official-component")).toHaveCount(6);
  await search.fill("PromptComposer");
  await expect(page.locator("#prompt-composer")).toBeVisible();
  await expect(page.locator(".official-component")).toHaveCount(1);
  await page.getByLabel("Category").selectOption("ALL");
  await search.fill("");

  assertNoClientErrors();
});

test("template catalog filters and opens an accessible preview", async ({ page }) => {
  test.setTimeout(60_000);
  const assertNoClientErrors = captureClientErrors(page);
  await page.goto("/templates#catalog", { waitUntil: "domcontentloaded" });
  await expect(page.locator('coco-island[data-coco-module*="template-catalog"][data-coco-mounted]')).toHaveCount(1, { timeout: 30_000 });

  const search = page.getByRole("searchbox", { name: "Search templates" });
  await expect(page.getByRole("status")).toContainText("4 npm-ready templates");
  await search.fill("dashboard");
  await expect(page.getByRole("status")).toContainText("1 npm-ready template");
  await expect(page.locator(".template-card")).toHaveCount(1);

  await page.getByRole("button", { name: "Preview" }).click();
  const dialog = page.getByRole("dialog", { name: "Orbit Dashboard" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("--template dashboard");
  await page.getByRole("button", { name: "Close preview" }).click();
  await expect(dialog).not.toBeVisible();

  await search.fill("no-such-template");
  await expect(page.getByRole("heading", { name: "No matching templates" })).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.locator(".template-card")).toHaveCount(4);

  assertNoClientErrors();
});

test("icon catalog searches live and opens an accessible usage dialog", async ({ page }) => {
  test.setTimeout(60_000);
  const assertNoClientErrors = captureClientErrors(page);
  await page.goto("/icons#icon-catalog", { waitUntil: "domcontentloaded" });
  await expect(page.locator('coco-island[data-coco-module*="icon-explorer"][data-coco-mounted]')).toHaveCount(1, { timeout: 30_000 });

  const search = page.getByRole("searchbox", { name: "Search by icon name" });
  await search.fill("home");
  await expect(page.getByRole("heading", { name: "Results for “home”" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("icons shown");

  await page.getByRole("link", { name: "View how to use the Home icon", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Home" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("@cocoframe/icons/linear/home");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(dialog).not.toBeVisible();

  assertNoClientErrors();
});

test("server form preserves invalid values and redirects valid submissions", async ({ page, context }) => {
  test.setTimeout(60_000);
  const assertNoClientErrors = captureClientErrors(page, {
    ignore: [/Failed to load resource: the server responded with a status of 422/],
  });
  const contactResponse = await page.goto("/contact");
  const setCookie = await contactResponse?.headerValue("set-cookie");
  expect(setCookie ?? "").toContain("SameSite=Strict");
  expect(setCookie ?? "").toContain("Secure");

  // Production cookies stay Secure. WebKit correctly declines to persist one
  // over this HTTP-only test server, so mirror the issued double-submit token
  // as a non-Secure cookie only inside the isolated browser context.
  const csrfToken = await page.locator('input[name="_csrf"]').inputValue();
  await context.addCookies([{
    name: "fast_csrf",
    value: csrfToken,
    url: "http://127.0.0.1:3211",
    sameSite: "Strict",
  }]);
  await page.locator("#name").fill("A");
  await page.locator("#email").fill("person@example.com");
  await page.locator("#message").fill("short");
  const invalidResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && new URL(response.url()).pathname === "/contact",
  );
  await page.getByRole("button", { name: "Send message" }).click();
  const invalidResponse = await invalidResponsePromise;
  expect(invalidResponse.status(), await invalidResponse.text()).toBe(422);
  await expect(page.locator("#name")).toHaveValue("A");
  await expect(page.locator("#name")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#message")).toHaveValue("short");
  await expect(page.locator("#message")).toHaveAttribute("aria-invalid", "true");

  await page.locator("#name").fill("Coco User");
  await page.locator("#message").fill("This is a complete browser submission.");
  await Promise.all([
    page.waitForURL("**/contact?sent=1"),
    page.getByRole("button", { name: "Send message" }).click(),
  ]);
  await expect(page.getByRole("status")).toContainText("Message validated and submitted successfully.");
  assertNoClientErrors();
});

test("streaming sends fallback content before the deferred section resolves", async ({ page }) => {
  test.setTimeout(45_000);
  const assertNoClientErrors = captureClientErrors(page);
  const response = await page.goto("/stream", { waitUntil: "commit" });

  await expect(page.getByRole("heading", { name: "Streaming SSR" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("status")).toHaveText("Loading slow section…", { timeout: 15_000 });
  await expect(page.getByText("Slow section completed.")).toBeVisible({ timeout: 15_000 });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("status")).toHaveCount(0);
  assertNoClientErrors();
});

test("unknown routes render the product 404 page", async ({ page }) => {
  const response = await page.goto("/this-route-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /Page not found/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "You may be looking for" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Still need help?" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Back to Home/i })).toBeVisible();
});
