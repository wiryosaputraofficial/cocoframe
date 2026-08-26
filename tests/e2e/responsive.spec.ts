import { expect, test } from "@playwright/test";
import { captureClientErrors, expectHealthyImages, expectNoHorizontalOverflow } from "./helpers.ts";

const criticalPages = ["/", "/features", "/cocospecs", "/cocoref", "/cocoqa", "/about", "/versioning", "/deployment", "/conventions", "/docs", "/docs/getting-started", "/docs/doctor", "/docs/agent-bridge", "/docs/cocoux", "/docs/product-design-quality", "/docs/pages", "/docs/api-reference", "/docs/api-reference?package=%40cocoframe%2Fcore", "/docs/api-reference?package=%40cocoframe%2Fagent", "/docs/api-reference?package=%40cocoframe%2Fux", "/components", "/templates", "/icons", "/cocoql", "/contact"] as const;

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

  await page.goto("/features");
  const lifecycleCards = page.locator(".lifecycle-feature-list > .cocospecs-feature");
  await expect(lifecycleCards).toHaveCount(4);
  const cardMetrics = await lifecycleCards.evaluateAll((cards) => cards.map((card) => {
    const style = getComputedStyle(card);
    const rect = card.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, width: rect.width, background: style.backgroundColor, radius: style.borderRadius };
  }));
  expect(new Set(cardMetrics.map(({ background }) => background)).size).toBe(1);
  expect(new Set(cardMetrics.map(({ radius }) => radius)).size).toBe(1);
  expect(Math.max(...cardMetrics.map(({ width }) => width)) - Math.min(...cardMetrics.map(({ width }) => width))).toBeLessThan(1);
  for (let index = 1; index < cardMetrics.length; index++) {
    expect(Math.abs(cardMetrics[index]!.top - cardMetrics[index - 1]!.bottom - 24)).toBeLessThan(1);
  }
  await expectNoHorizontalOverflow(page);

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

test("Product Design Quality remains usable at 200 percent text zoom and in forced colors", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "viewport-320", "The smallest approved viewport is the restrictive zoom baseline.");

  await page.goto("/features");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(page.locator(".lifecycle-feature-list > .cocospecs-feature")).toHaveCount(4);
  await expectNoHorizontalOverflow(page);
  await expect(page.getByRole("link", { name: "Explore Agent Bridge" })).toBeVisible();

  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.reload();
  await page.keyboard.press("Tab");
  const focusIndicator = await page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return { tag: "", width: 0, style: "none" };
    const computed = getComputedStyle(active);
    return {
      tag: active.tagName,
      width: Number.parseFloat(computed.outlineWidth) || 0,
      style: computed.outlineStyle,
    };
  });
  expect(focusIndicator.tag).not.toBe("BODY");
  expect(focusIndicator.style).not.toBe("none");
  expect(focusIndicator.width).toBeGreaterThanOrEqual(1);
  await expectNoHorizontalOverflow(page);
});
