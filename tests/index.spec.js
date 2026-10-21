const { test, expect } = require('./fixtures');

const isTile = request => request.url().includes('tile.openstreetmap.org');

test.describe('index.html', () => {
  test('shows a plain map without overlays', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('.leaflet-tile-pane > .leaflet-layer')).toHaveCount(1);
    await expect(page.locator('.leaflet-control-layers-base label')).toHaveText(['OpenStreetMap', 'Esri'].map(l => new RegExp(l)));
    await expect(page.locator('.leaflet-control-layers-overlays label')).toHaveCount(0);
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(0);
  });

  // The map must not change its view while the first tiles load, which aborts them
  test('loads the tiles without aborting any request', async ({ page }) => {
    const failed = [];
    let loaded = 0;
    page.on('requestfailed', request => { if (isTile(request)) failed.push(request.url()); });
    page.on('requestfinished', request => { if (isTile(request)) loaded++; });

    await page.goto('/index.html');
    await expect.poll(() => loaded).toBeGreaterThan(0);
    await page.waitForLoadState('networkidle');
    expect(failed).toEqual([]);
  });
});
