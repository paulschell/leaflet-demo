const { test, expect } = require('./fixtures');

test.describe('index.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('shows a plain map without overlays', async ({ page }) => {
    await expect(page.locator('.leaflet-tile-pane > .leaflet-layer')).toHaveCount(1);
    await expect(page.locator('.leaflet-control-layers-base label')).toHaveText(['OpenStreetMap', 'Stadia', 'Esri'].map(l => new RegExp(l)));
    await expect(page.locator('.leaflet-control-layers-overlays label')).toHaveCount(0);
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(0);
  });
});
