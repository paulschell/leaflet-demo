const { test, expect, overlayLabels, setOverlay } = require('./fixtures');

// Count non-transparent pixels on the particle canvas
function paintedPixels(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return 0;
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let painted = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i]) painted++;
    return painted;
  });
}

test.describe('wind/wind.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/wind/wind.html');
  });

  test('loads the Mauritius velocity overlays', async ({ page }) => {
    await expect.poll(() => overlayLabels(page)).toEqual([
      'Ocean Current - Mauritius',
      'Wind - Mauritius',
    ]);
  });

  test('shows Mauritius with wind particles by default', async ({ page }) => {
    const center = await page.evaluate(() => map.getCenter());
    expect(center.lat).toBeCloseTo(-20.25, 1);
    expect(center.lng).toBeCloseTo(57.55, 1);

    await expect.poll(() => paintedPixels(page)).toBeGreaterThan(0);
    await expect(page.locator('.leaflet-control-attribution')).toContainText('Open-Meteo');
  });

  test('draws ocean current particles', async ({ page }) => {
    await expect.poll(() => overlayLabels(page)).toHaveLength(2);
    await setOverlay(page, 'Wind - Mauritius', false);
    await setOverlay(page, 'Ocean Current - Mauritius', true);

    await expect.poll(() => paintedPixels(page)).toBeGreaterThan(0);
  });

  test('shows the data time when hovering the map', async ({ page }) => {
    await expect.poll(() => paintedPixels(page)).toBeGreaterThan(0);
    await page.mouse.move(640, 400);
    await expect(page.locator('.leaflet-control-velocity')).toContainText(/Wind 10 m \(\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC\)/);
  });
});
