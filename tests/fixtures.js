const { test: base, expect } = require('@playwright/test');

// Map tiles come from external servers and are not part of the tests
const TILE_HOSTS = /tile\.openstreetmap\.org|arcgisonline\.com|basemaps\.cartocdn\.com/;

// Fails every test that causes a JavaScript error, a console error or an alert()
const test = base.extend({
  pageErrors: [async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', message => {
      if (message.type() === 'error' && !TILE_HOSTS.test(message.location().url)) {
        errors.push(`console: ${message.text()}`);
      }
    });
    page.on('dialog', dialog => {
      errors.push(`dialog: ${dialog.message()}`);
      dialog.dismiss();
    });

    await use(errors);

    expect(errors).toEqual([]);
  }, { auto: true }],
});

// Labels of the overlays in the layer control
async function overlayLabels(page) {
  const labels = await page.locator('.leaflet-control-layers-overlays label').allInnerTexts();
  return labels.map(label => label.trim());
}

// Switch an overlay on or off without opening the collapsed layer control
async function setOverlay(page, name, checked) {
  const input = page.locator('.leaflet-control-layers-overlays label', { hasText: name }).locator('input');
  await input.evaluate((el, value) => { if (el.checked !== value) el.click(); }, checked);
}

// Click a vector feature until its popup opens and return the popup text
async function openPopup(page, feature) {
  const popup = page.locator('.leaflet-popup-content');
  await expect(async () => {
    await feature.click({ force: true });
    await expect(popup).toBeVisible({ timeout: 500 });
  }).toPass();
  return (await popup.innerText()).replace(/\s+/g, ' ');
}

module.exports = { test, expect, overlayLabels, setOverlay, openPopup };
