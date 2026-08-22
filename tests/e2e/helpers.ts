import { expect, type Page } from "@playwright/test";

export function captureClientErrors(page: Page, options: { readonly ignore?: readonly RegExp[] } = {}) {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  return () => {
    const unexpected = errors.filter((message) => !options.ignore?.some((pattern) => pattern.test(message)));
    expect(unexpected, unexpected.join("\n") || "No browser errors").toEqual([]);
  };
}

export async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(
    dimensions.scrollWidth,
    `Document width ${dimensions.scrollWidth}px exceeds viewport ${dimensions.clientWidth}px`,
  ).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

export async function expectHealthyImages(page: Page) {
  await page.locator("img").evaluateAll((images) => {
    for (const image of images) (image as HTMLImageElement).loading = "eager";
  });
  await expect.poll(
    () => page.locator("img").evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete)),
    { message: "Images did not finish loading", timeout: 15_000 },
  ).toBe(true);

  const failures = await page.locator("img").evaluateAll((images) =>
    images.flatMap((image) => {
      const element = image as HTMLImageElement;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const messages: string[] = [];

      if (!element.complete || element.naturalWidth === 0 || element.naturalHeight === 0) {
        messages.push(`${element.currentSrc || element.src}: image failed to load`);
      }

      if (rect.width > 0 && rect.height > 0 && style.objectFit !== "cover") {
        const naturalRatio = element.naturalWidth / element.naturalHeight;
        const renderedRatio = rect.width / rect.height;
        if (Number.isFinite(naturalRatio) && Math.abs(renderedRatio - naturalRatio) > 0.08) {
          messages.push(
            `${element.currentSrc || element.src}: aspect ratio changed from ${naturalRatio.toFixed(2)} to ${renderedRatio.toFixed(2)}`,
          );
        }
      }

      return messages;
    }),
  );

  expect(failures, failures.join("\n") || "All images are healthy").toEqual([]);
}
