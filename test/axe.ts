import axe from "axe-core";
import { expect } from "vitest";

/** Run axe on a rendered component and fail with a readable list of problems. */
export async function expectNoAxeViolations(container: Element) {
  const results = await axe.run(container, {
    rules: {
      // jsdom can't compute colours; the Playwright test checks contrast in a real browser.
      "color-contrast": { enabled: false },
      // A component on its own isn't inside a page landmark.
      region: { enabled: false },
    },
  });
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}
