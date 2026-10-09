import { expect, type Locator, type Page, test } from '@playwright/test';

/**
 * Der Kalender muss am Feld hängen, nicht bei (0, 0).
 * Oben: höchstens 12px Abstand unter oder über dem Eingabefeld.
 * Links: höchstens 40px neben dem Feld.
 */
async function expectAnchored(page: Page, section: Locator, label: string) {
  const input = section.getByRole('textbox', { name: label });
  const trigger = section.getByRole('button', { name: `Kalender öffnen: ${label}` });
  await trigger.click();
  const popover = page.locator('[data-slot="popover-content"]');
  await expect(popover).toBeVisible();

  const field = await input.boundingBox();
  const box = await popover.boundingBox();
  if (!field || !box) throw new Error(`${label}: keine Bounding-Box`);

  const transform = await popover.evaluate((element) => {
    const wrapper = element.closest('[data-radix-popper-content-wrapper]');
    return wrapper ? getComputedStyle(wrapper).transform : null;
  });
  console.log(
    JSON.stringify({
      label,
      field: { x: field.x, y: field.y, w: field.width, h: field.height },
      popover: { x: box.x, y: box.y, w: box.width, h: box.height },
      transform,
    }),
  );

  const below = box.y - (field.y + field.height);
  const above = field.y - (box.y + box.height);
  const verticallyAdjacent = (below >= -2 && below <= 12) || (above >= -2 && above <= 12);
  expect(
    verticallyAdjacent,
    `${label} vertikal field=${JSON.stringify(field)} pop=${JSON.stringify(box)}`,
  ).toBe(true);
  expect(Math.abs(box.x - field.x), `${label} horizontal`).toBeLessThanOrEqual(40);
  expect(box.x + box.y, `${label} nicht bei (0,0)`).toBeGreaterThan(20);
}

test('Kalender hängt am Feld, allein, im Sheet und im Dialog', async ({ page }) => {
  await page.goto('/dev/datum');
  await expect(page.getByTestId('picker-standalone')).toBeVisible();

  for (const theme of ['light', 'dark'] as const) {
    await page.getByTestId(theme === 'light' ? 'theme-light' : 'theme-dark').click();
    await page.screenshot({
      path: `/tmp/date-picker-${theme}-closed.png`,
      fullPage: true,
    });

    await expectAnchored(page, page.getByTestId('picker-standalone'), 'Datum allein');
    await page.screenshot({ path: `/tmp/date-picker-${theme}-standalone.png` });
    await page.keyboard.press('Escape');

    await expectAnchored(page, page.getByTestId('picker-range'), 'Bereich Beginn');
    await page.keyboard.press('Escape');

    await page.getByTestId('open-sheet').click();
    await expectAnchored(page, page.getByTestId('picker-sheet'), 'Datum im Sheet');
    await page.screenshot({ path: `/tmp/date-picker-${theme}-sheet.png` });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Schließen' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.getByTestId('open-dialog').click();
    await expectAnchored(page, page.getByTestId('picker-dialog'), 'Datum im Dialog');
    await page.screenshot({ path: `/tmp/date-picker-${theme}-dialog.png` });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Schließen' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
});
