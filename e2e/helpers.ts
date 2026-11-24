import { expect, type Page } from "@playwright/test";

/** Sign in through "Try the demo" and open the seeded demo board. */
export async function openDemoBoard(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try the demo" }).click();
  await expect(page.getByRole("heading", { name: "Your boards" })).toBeVisible();
  await page.getByRole("link", { name: "Open Demo board" }).click();
  await expect(page.getByRole("region", { name: "To do" })).toBeVisible();
}

export const column = (page: Page, title: string) => page.getByRole("region", { name: title });

/** Add a card and wait until the server has saved it. */
export async function addCard(page: Page, columnTitle: string, title: string) {
  const col = column(page, columnTitle);
  await col.getByRole("button", { name: "+ Add card" }).click();
  const saved = page.waitForResponse(
    (res) =>
      res.url().includes("/cards") && res.request().method() === "POST" && res.status() === 201,
  );
  await col.getByLabel("Card title").fill(title);
  await col.getByLabel("Card title").press("Enter");
  await saved;
  await col.getByLabel("Card title").press("Escape");
  // The board refetches after saving; wait until the card has its real id.
  await expect(col.getByRole("button", { name: `Move card: ${title}` })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
}

export const waitForMove = (page: Page) =>
  page.waitForResponse(
    (res) => res.url().includes("/move") && res.request().method() === "POST" && res.ok(),
  );
