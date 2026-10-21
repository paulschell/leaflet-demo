const { test, expect, setOverlay, openPopup } = require('./fixtures');

// The popup must not be covered by a panel of the map
async function expectUncovered(page, popup, panel) {
  const [a, b] = await Promise.all([popup.boundingBox(), panel.boundingBox()]);
  const overlaps = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  expect(overlaps, 'popup overlaps panel').toBe(false);
}

test.describe('on a phone', () => {
  for (const path of ['/index.html', '/pois.html', '/climate.html', '/wind/wind.html']) {
    test(`${path}: no horizontal scrolling and header links in one row`, async ({ page }) => {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);

      const tops = await page.locator('.site-header nav a').evaluateAll(links => links.map(link => link.getBoundingClientRect().top));
      expect(new Set(tops).size).toBe(1);
    });
  }

  test('POI legend is collapsed and opens with a tap', async ({ page }) => {
    await page.goto('/pois.html');
    const legend = page.locator('.legend');
    await expect(legend.locator('.legend-items')).toBeHidden();
    await legend.locator('summary').tap();
    await expect(legend.locator('.legend-items')).toBeVisible();
    // The open legend still fits on the map
    const [box, map] = await Promise.all([legend.boundingBox(), page.locator('#map').boundingBox()]);
    expect(box.y).toBeGreaterThanOrEqual(map.y);
  });

  test('POI popups fit on the screen', async ({ page }) => {
    await page.goto('/pois.html');
    await setOverlay(page, 'Hospitals & Clinics', true);
    await openPopup(page, page.locator('path.leaflet-interactive').first());
    const popup = await page.locator('.leaflet-popup-content-wrapper').boundingBox();
    expect(popup.x).toBeGreaterThanOrEqual(0);
    expect(popup.x + popup.width).toBeLessThanOrEqual(page.viewportSize().width);
  });

  test('layer control opens with a tap and lists all overlays', async ({ page }) => {
    await page.goto('/pois.html');
    // Leaflet expands the control on touch, so the list already covers the toggle when the tap ends
    await page.locator('.leaflet-control-layers-toggle').tap({ force: true });
    const list = page.locator('.leaflet-control-layers-list');
    await expect(list).toBeVisible();
    await expect(list.locator('.leaflet-control-layers-overlays label')).toHaveCount(13);
    // Leaflet makes the list scrollable if it is higher than the map
    const [box, map] = await Promise.all([list.boundingBox(), page.locator('#map').boundingBox()]);
    expect(box.y + box.height).toBeLessThanOrEqual(map.y + map.height);
  });

  test('climate title is collapsed but still marks the example data', async ({ page }) => {
    await page.goto('/climate.html');
    const info = page.locator('details.info');
    await expect(info.locator('summary')).toContainText('Flood risk – Mauritius');
    await expect(info.locator('summary .note')).toHaveText('Example data');
    await expect(info.locator('p')).toBeHidden();
    await info.locator('summary').tap();
    await expect(info.locator('p')).toBeVisible();
  });

  test('sea level popup is not covered by the panels', async ({ page }) => {
    await page.goto('/climate.html');
    await page.check('input[value=slr]');
    await openPopup(page, page.locator('path.leaflet-interactive').first());
    const popup = page.locator('.leaflet-popup-content-wrapper');
    // Wait until the map has panned the popup into view
    await expect(async () => {
      await expectUncovered(page, popup, page.locator('.control'));
      await expectUncovered(page, popup, page.locator('details.info'));
    }).toPass();
    const box = await popup.boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width);
  });
});
