const { test, expect } = require('./fixtures');

const PAGES = ['/index.html', '/pois.html', '/climate.html', '/wind/wind.html'];

for (const path of PAGES) {
  test.describe(`header on ${path}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test('links to all pages and marks the current one', async ({ page, request }) => {
      const links = page.locator('.site-header nav a');
      await expect(links).toHaveCount(PAGES.length);
      for (const link of await links.all()) {
        const url = new URL(await link.getAttribute('href'), page.url());
        expect((await request.get(url.href)).ok()).toBe(true);
      }

      const current = page.locator('.site-header nav a[aria-current="page"]');
      await expect(current).toHaveCount(1);
      expect(new URL(await current.getAttribute('href'), page.url()).pathname).toBe(path);
    });

    test('map fills the rest of the page without scrolling', async ({ page }) => {
      const { scrollHeight, innerHeight, headerBottom, mapTop, mapBottom } = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        innerHeight: window.innerHeight,
        headerBottom: document.querySelector('.site-header').getBoundingClientRect().bottom,
        mapTop: document.getElementById('map').getBoundingClientRect().top,
        mapBottom: document.getElementById('map').getBoundingClientRect().bottom,
      }));
      expect(scrollHeight).toBeLessThanOrEqual(innerHeight);
      expect(mapTop).toBe(headerBottom);
      expect(mapBottom).toBe(innerHeight);
    });
  });
}
