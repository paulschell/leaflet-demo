const { test, expect, overlayLabels, setOverlay } = require('./fixtures');

test.describe('wind/wind.html', () => {
  test('loads all velocity overlays', async ({ page }) => {
    await page.goto('/wind/wind.html');
    await expect.poll(() => overlayLabels(page)).toEqual([
      'Wind - Great Barrier Reef',
      'Ocean Current - Great Barrier Reef',
      'Wind - Global',
    ]);
  });

  test('draws wind particles', async ({ page }) => {
    await page.goto('/wind/wind.html');
    await expect.poll(() => overlayLabels(page)).toHaveLength(3);
    await setOverlay(page, 'Wind - Great Barrier Reef', true);

    // Count non-transparent pixels on the particle canvas
    await expect.poll(() => page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return 0;
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let painted = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i]) painted++;
      return painted;
    })).toBeGreaterThan(0);
  });
});
