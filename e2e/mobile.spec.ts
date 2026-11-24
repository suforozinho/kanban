import { expect, test } from "@playwright/test";
import { openDemoBoard } from "./helpers";

test("the board fits a phone screen and columns scroll sideways", async ({ page }) => {
  await openDemoBoard(page);

  // The page itself never scrolls sideways; only the column strip does.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  const firstColumn = (await page.getByRole("region", { name: "To do" }).boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(firstColumn.width).toBeLessThan(viewport.width);
  expect(firstColumn.width).toBeGreaterThan(viewport.width * 0.7);

  await page.getByRole("button", { name: "Plan next sprint", exact: true }).click();
  const dialog = (await page.getByRole("dialog").boundingBox())!;
  expect(dialog.width).toBeLessThanOrEqual(viewport.width);
});
