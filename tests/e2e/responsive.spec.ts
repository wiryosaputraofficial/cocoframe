import { expect, test } from "@playwright/test";
import { captureClientErrors, expectHealthyImages, expectNoHorizontalOverflow } from "./helpers.ts";

const criticalPages = ["/", "/features", "/cocospecs", "/cocoref", "/cocoqa", "/about", "/versioning", "/deployment", "/conventions", "/docs", "/docs/getting-started", "/docs/pages", "/docs/api-reference", "/docs/api-reference?package=%40cocoframe%2Fcore", "/components", "/templates", "/icons", "/cocoql", "/contact"] as const;

test("critical pages remain usable from 320px through 4K", async ({ page }) => {
  test.setTimeout(90_000);
  const assertNoClientErrors = captureClientErrors(page);

  for (const path of criticalPages) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("main")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectHealthyImages(page);

    await page.keyboard.press("Tab");
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? "");
    expect(focusedTag, `${path} must expose a keyboard focus target`).not.toBe("BODY");
  }

  await page.goto("/");
  const menuToggle = page.getByRole("button", { name: "Open menu" });
  if (await menuToggle.isVisible()) {
    await menuToggle.click();
    await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toHaveClass(/open/);
    await expectNoHorizontalOverflow(page);
  } else {
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  }

  assertNoClientErrors();
});
