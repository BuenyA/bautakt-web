import { expect, type Locator, type Page, test } from '@playwright/test';

/**
 * Der Kalender muss am Feld hängen, nicht bei (0, 0).
 * Oben: höchstens 12px Abstand unter oder über dem Eingabefeld.
 * Links: höchstens 40px neben dem Feld.
 */
async function expectAnchored(page: Page, section: Locator, label: string) {
  const input = section.getByRole('textbox', { name: label });
  const trigger = section.getByRole('button', { name: `Kalender öffnen: ${label}` });
  // Vor dem Öffnen messen: der offene Kalender fängt den Fokus, Fluent setzt den
  // Rest der Seite auf `aria-hidden`, und `getByRole` findet das Feld nicht mehr.
  // Drawer und Dialog fahren ein; erst messen, wenn das Feld steht.
  await page.waitForTimeout(600);
  const field = await input.boundingBox();
  await trigger.click();
  // Während der Schließ-Animation kann ein zweiter Surface im DOM hängen.
  // Gemessen wird der zuletzt geöffnete.
  const popover = page.locator('.fui-PopoverSurface').last();
  await expect(popover).toBeVisible();

  // Fluent lässt den Popover einige Pixel einfahren (Motion). Gemessen wird, wenn er steht.
  await page.waitForTimeout(600);
  let box = await popover.boundingBox();
  await expect
    .poll(async () => {
      const next = await popover.boundingBox();
      const settled = next !== null && box !== null && next.y === box.y && next.x === box.x;
      box = next;
      return settled;
    })
    .toBe(true);
  if (!field || !box) throw new Error(`${label}: keine Bounding-Box`);
  console.log(
    JSON.stringify({
      label,
      field: { x: field.x, y: field.y, w: field.width, h: field.height },
      popover: { x: box.x, y: box.y, w: box.width, h: box.height },
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

  return popover;
}

/**
 * Gewählter Tag: Fluents Auswahlfläche, nicht die eines normalen Tags, und der
 * Fokus liegt beim Öffnen auf ihm. Farben kommen aus dem Theme, deshalb wird
 * gegen einen ungewählten Tag verglichen statt gegen einen festen Wert.
 */
async function expectSelectedDay(popover: Locator, dayText: string) {
  const selected = popover.locator('td[aria-selected="true"]');
  await expect(selected).toHaveCount(1);
  await expect(selected).toContainText(dayText);
  const other = popover.locator('td[aria-selected="false"] button').first();
  const [selectedBg, otherBg] = await Promise.all([
    selected.locator('button').evaluate((element) => getComputedStyle(element).backgroundColor),
    other.evaluate((element) => getComputedStyle(element).backgroundColor),
  ]);
  expect(selectedBg).not.toBe(otherBg);
  await expect(selected).toBeFocused();
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

    const alone = await expectAnchored(page, page.getByTestId('picker-standalone'), 'Datum allein');
    await expect(alone).toContainText('August');
    await expectSelectedDay(alone, '15');
    await page.screenshot({ path: `/tmp/date-picker-${theme}-standalone.png` });
    await page.keyboard.press('Escape');

    const range = await expectAnchored(page, page.getByTestId('picker-range'), 'Bereich Beginn');
    await expect(range).toContainText('Oktober');
    await expectSelectedDay(range, '1');
    const today = range.locator('td[aria-selected="false"] button.fui-CalendarDayGrid__dayIsToday');
    await expect(today).toHaveCount(1);
    await page.keyboard.press('Escape');

    await page.getByTestId('open-sheet').click();
    await expectAnchored(page, page.getByTestId('picker-sheet'), 'Datum im Sheet');
    await page.screenshot({ path: `/tmp/date-picker-${theme}-sheet.png` });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Schließen' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    if (theme === 'light') {
      const dateLabel = await page.getByTestId('end-date-label').boundingBox();
      const timeLabel = await page.getByTestId('end-time-label').boundingBox();
      if (!dateLabel || !timeLabel) throw new Error('Einsatz-Raster ohne Beschriftung');
      expect(Math.abs(dateLabel.y - timeLabel.y)).toBeLessThanOrEqual(1);
      await page
        .getByTestId('assignment-grid')
        .screenshot({ path: '/tmp/date-picker-assignment-grid.png' });
    }

    await page.getByTestId('open-dialog').click();
    await expectAnchored(page, page.getByTestId('picker-dialog'), 'Datum im Dialog');
    await page.screenshot({ path: `/tmp/date-picker-${theme}-dialog.png` });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Schließen' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
});

function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

test('Fällig-Meldung bleibt sichtbar, wenn der Kalender offen ist', async ({ page }) => {
  await page.goto('/dev/datum');
  const section = page.getByTestId('due-before-issue');
  const message = page.getByTestId('due-before-issue-message');
  await expect(message).toBeVisible();
  await expect(message).toHaveText('Das Fälligkeitsdatum liegt vor dem Rechnungsdatum.');
  const emptyIssue = page.getByRole('textbox', { name: 'Rechnungsdatum leer' });
  await expect(emptyIssue).toHaveValue('');
  await expect(emptyIssue).toHaveAttribute('placeholder', 'Wird beim Ausstellen gesetzt');
  await expect(page.getByTestId('empty-issue-hint')).toHaveText('Noch nicht ausgestellt');

  for (const theme of ['light', 'dark'] as const) {
    await page.getByTestId(theme === 'light' ? 'theme-light' : 'theme-dark').click();
    const popover = await expectAnchored(page, section, 'Fällig');
    const messageBox = await message.boundingBox();
    const popBox = await popover.boundingBox();
    if (!messageBox || !popBox) throw new Error('Fällig-Meldung ohne Bounding-Box');
    expect(
      boxesOverlap(messageBox, popBox),
      `Meldung ${JSON.stringify(messageBox)} Kalender ${JSON.stringify(popBox)}`,
    ).toBe(false);

    const covered = await message.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return !(hit === element || element.contains(hit));
    });
    expect(covered, 'Meldung liegt unter einem anderen Element').toBe(false);

    if (theme === 'light') {
      await page.screenshot({ path: '/tmp/date-picker-due-before-issue.png' });
    }
    await page.keyboard.press('Escape');
    await expect(popover).toBeHidden();
  }
});
