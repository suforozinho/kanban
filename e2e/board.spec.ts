import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { addCard, column, openDemoBoard, waitForMove } from "./helpers";

test("create a card, drag it to another column, and it stays there after a reload", async ({
  page,
}) => {
  await openDemoBoard(page);
  await addCard(page, "To do", "Ship the e2e test");

  const card = column(page, "To do").getByRole("listitem").filter({ hasText: "Ship the e2e test" });
  const target = column(page, "Done").getByRole("list");

  // Drag with the mouse in small steps, like a person would.
  const from = (await card.boundingBox())!;
  const to = (await target.boundingBox())!;
  const moved = waitForMove(page);
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2, { steps: 3 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height - 5, { steps: 15 });
  await page.mouse.up();
  await moved;

  await expect(column(page, "Done").getByText("Ship the e2e test")).toBeVisible();

  await page.reload();
  await expect(column(page, "Done").getByText("Ship the e2e test")).toBeVisible();
  await expect(column(page, "To do").getByText("Ship the e2e test")).toHaveCount(0);
});

test("move a card with only the keyboard", async ({ page }) => {
  await openDemoBoard(page);
  const handle = page.getByRole("button", { name: "Move card: Plan next sprint" });

  // dnd-kit reads each step out in a live region; wait for it like a screen reader user would.
  const liveRegion = page.locator("[id^=DndLiveRegion]");
  await handle.focus();
  await page.keyboard.press("Space");
  await expect(liveRegion).toContainText("Plan next sprint is at position 2 of 3 in column To do");
  await page.keyboard.press("ArrowRight");
  await expect(liveRegion).toContainText(/Plan next sprint is (at|over) .*in column In progress/);
  const moved = waitForMove(page);
  await page.keyboard.press("Space");
  await moved;

  await page.reload();
  await expect(column(page, "In progress").getByText("Plan next sprint")).toBeVisible();
});

test("blocked cards are flagged and can be managed in the card dialog", async ({ page }) => {
  await openDemoBoard(page);
  const releaseNotes = column(page, "To do")
    .getByRole("listitem")
    .filter({ hasText: "Write the release notes" });
  await expect(releaseNotes.getByText("Blocked by 1")).toBeVisible();

  await releaseNotes.getByRole("button", { name: /^Write the release notes/ }).click();
  const dialog = page.getByRole("dialog", { name: "Card details" });
  await expect(dialog.getByText("Deploy to production")).toBeVisible();

  await dialog.getByRole("button", { name: "Remove blocker Deploy to production" }).click();
  await expect(dialog.getByText("No other card blocks this one.")).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(releaseNotes.getByText(/Blocked by/)).toHaveCount(0);
});

test("pages have no detectable accessibility problems", async ({ page }) => {
  await page.goto("/");
  const landing = await new AxeBuilder({ page }).analyze();
  expect(landing.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

  await openDemoBoard(page);
  const board = await new AxeBuilder({ page }).analyze();
  expect(board.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

  await page.getByRole("button", { name: "Plan next sprint", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const dialog = await new AxeBuilder({ page }).analyze();
  expect(dialog.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test("someone else's board shows not found", async ({ page, browser }) => {
  await openDemoBoard(page);
  const otherUsersBoard = page.url();

  const stranger = await browser.newPage();
  await openDemoBoard(stranger);
  await stranger.goto(otherUsersBoard);
  await expect(stranger.getByRole("heading", { name: "Board not found" })).toBeVisible();
  await stranger.close();
});
