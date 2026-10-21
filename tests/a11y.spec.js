const { test, expect, setOverlay, openPopup } = require('./fixtures');
const AxeBuilder = require('@axe-core/playwright').default;

// Accessibility rules checked with axe-core, violations are listed by rule and element
async function violations(page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations.map(v => `${v.id}: ${v.nodes.map(node => node.target.join(' ')).join(', ')}`);
}

const PAGES = ['/index.html', '/pois.html', '/climate.html', '/wind/wind.html'];

for (const path of PAGES) {
  test(`${path} has no accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('.leaflet-control-zoom')).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });
}

test('POI popup has no accessibility violations', async ({ page }) => {
  await page.goto('/pois.html');
  await setOverlay(page, 'Primary Schools', true);
  await openPopup(page, page.locator('path.leaflet-interactive').first());
  expect(await violations(page)).toEqual([]);
});

test('sea level popup has no accessibility violations', async ({ page }) => {
  await page.goto('/climate.html');
  await page.check('input[value=slr]');
  await openPopup(page, page.locator('path.leaflet-interactive').first());
  await expect(page.locator('.leaflet-popup-content canvas')).toHaveAttribute('aria-label', /^Sea level rise at /);
  expect(await violations(page)).toEqual([]);
});

test('climate zones open their popup with the keyboard', async ({ page }) => {
  await page.goto('/climate.html');
  const zone = page.locator('path.leaflet-interactive').first();
  await expect(zone).toHaveAttribute('aria-label', /^Port Louis: flood risk high$/);
  await zone.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.leaflet-popup-content')).toContainText('Flood risk: High');
});
