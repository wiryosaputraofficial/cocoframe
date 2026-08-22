import { expect, test } from "@playwright/test";

test("development runtime hydrates islands and presents an accessible error overlay", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('script[src="/coco-assets/dev.js"]')).toHaveCount(1);
  await expect.poll(() => page.locator("coco-island[data-coco-mounted]").count()).toBeGreaterThan(0);

  await page.evaluate(() => {
    window.dispatchEvent(new ErrorEvent("error", {
      error: new TypeError("E2E browser failure"),
      message: "E2E browser failure",
      filename: "e2e-runtime.ts",
      lineno: 12,
      colno: 4,
    }));
  });

  const overlay = page.getByRole("dialog", { name: "TypeError: E2E browser failure" });
  await expect(overlay).toBeVisible();
  await expect(overlay.getByText("Development Mode")).toBeVisible();
  await expect(overlay.getByText("e2e-runtime.ts", { exact: true }).first()).toBeVisible();
  await expect(overlay.getByRole("button", { name: "Close error overlay" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(overlay).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveClass(/coco-dev-overlay-open/);
});
