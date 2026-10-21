const { test, expect, overlayLabels, setOverlay, openPopup } = require('./fixtures');

// Overlay label -> number of features and text the popup has to contain
const OVERLAYS = {
  'Primary Schools': { count: 259, popup: 'Primary School' },
  'Shopping Malls': { count: 30, popup: 'Shopping Mall' },
  'Busstops': { count: 508, popup: 'Bus Stop' },
  'Postoffices': { count: 102, popup: 'Post Office' },
  'Hospitals & Clinics': { count: 32, popup: 'Hospital / Clinic' },
  'Pharmacies': { count: 294, popup: '📞' },
};

test.describe('pois.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pois.html');
  });

  test('lists all POI categories as overlays and in the legend', async ({ page }) => {
    expect(await overlayLabels(page)).toEqual(Object.keys(OVERLAYS));
    await expect(page.locator('.legend')).toHaveText(Object.keys(OVERLAYS).join(''));
  });

  for (const [name, { count, popup }] of Object.entries(OVERLAYS)) {
    test(`${name}: shows ${count} features with popup`, async ({ page }) => {
      const features = page.locator('path.leaflet-interactive');
      await setOverlay(page, name, true);
      await expect(features).toHaveCount(count);

      const text = await openPopup(page, features.first());
      expect(text).toContain(popup);
      expect(text).not.toContain('No data');
    });
  }

  test('popups without attributes show coordinates', async ({ page }) => {
    await setOverlay(page, 'Postoffices', true);
    const text = await openPopup(page, page.locator('path.leaflet-interactive').first());
    expect(text).toMatch(/Post Office -?\d+\.\d{5}, -?\d+\.\d{5}/);
  });

  test('categories use different colors', async ({ page }) => {
    for (const name of Object.keys(OVERLAYS)) await setOverlay(page, name, true);
    await expect(page.locator('path.leaflet-interactive')).toHaveCount(1225);

    const fills = await page.locator('path.leaflet-interactive').evaluateAll(
      paths => [...new Set(paths.map(path => path.getAttribute('fill')))]
    );
    expect(fills).toHaveLength(Object.keys(OVERLAYS).length);
  });
});
