const { test, expect, overlayLabels, openPopup } = require('./fixtures');

test.describe('index.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('shows all pharmacies as overlay', async ({ page }) => {
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(294);
    expect(await overlayLabels(page)).toEqual(['Pharmacies']);
  });

  test('pharmacy popup shows name and phone number', async ({ page }) => {
    const markers = page.locator('.leaflet-marker-icon');
    await expect(markers).toHaveCount(294);

    // Pick a marker inside the visible map area
    const index = await markers.evaluateAll(icons => icons.findIndex(icon => {
      const { left, top } = icon.getBoundingClientRect();
      return left > 100 && top > 100 && left < window.innerWidth - 100 && top < window.innerHeight - 100;
    }));
    expect(await openPopup(page, markers.nth(index))).toContain('📞');
  });

  test('adds only one base layer', async ({ page }) => {
    await expect(page.locator('.leaflet-tile-pane > .leaflet-layer')).toHaveCount(1);
  });
});
