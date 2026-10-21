const { test, expect, openPopup } = require('./fixtures');

const COLORS = { '#a6d96a': 'Low', '#fdae61': 'Medium', '#d7191c': 'High' };

// Expected sea level rise in cm per zone (feature order), scenario and year
const RISE = {
  low: { 2050: [16, 13, 11, 15], 2100: [28, 23, 16, 26] },
  high: { 2050: [24, 20, 16, 22], 2100: [49, 40, 28, 45] },
};
const SSP = { low: 'SSP1-2.6', high: 'SSP5-8.5' };

function riskLevel(rise) {
  return rise < 20 ? 'Low' : rise < 40 ? 'Medium' : 'High';
}

async function fillLevels(page) {
  const fills = await page.locator('path.leaflet-interactive').evaluateAll(
    paths => paths.map(path => path.getAttribute('fill'))
  );
  return fills.map(fill => COLORS[fill]);
}

test.describe('climate.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/climate.html');
  });

  test('switches between topics and keeps the base map', async ({ page }) => {
    const zones = page.locator('path.leaflet-interactive');

    await expect(zones).toHaveCount(3);
    await expect(page.locator('#slr-options')).toBeHidden();
    for (const [topic, count] of [['drought', 2], ['storm', 2], ['slr', 4], ['flood', 3]]) {
      await page.check(`input[value=${topic}]`);
      await expect(zones).toHaveCount(count);
      await expect(page.locator('.leaflet-tile-pane > .leaflet-layer')).toHaveCount(1);
      await expect(page.locator('#slr-options')).toBeVisible({ visible: topic === 'slr' });
    }
  });

  test('marks the zones as example data', async ({ page }) => {
    await expect(page.locator('.info').first()).toContainText('Example data');
    await page.check('input[value=slr]');
    await expect(page.locator('.info').first()).toContainText('Example data');
    await expect(page.locator('.legend')).toContainText('(20–40 cm)');
  });

  for (const scenario of ['low', 'high']) {
    for (const year of ['2050', '2100']) {
      test(`sea level ${scenario} ${year}: color, popup and chart match the rise`, async ({ page }) => {
        await page.check('input[value=slr]');
        await page.selectOption('#year', year);
        await page.selectOption('#scenario', scenario);

        const expected = RISE[scenario];
        await expect.poll(() => fillLevels(page)).toEqual(expected[year].map(riskLevel));

        const text = await openPopup(page, page.locator('path.leaflet-interactive').first());
        expect(text).toContain(`${expected[year][0]} cm`);
        expect(text).toContain(`risk level: ${riskLevel(expected[year][0])}`);

        await expect.poll(() => page.evaluate(() => {
          const chart = Chart.getChart(document.querySelector('.leaflet-popup-content canvas'));
          return chart && chart.data.datasets.slice(1).map(d => [d.label, d.data.filter(v => v != null)]);
        })).toEqual([
          [`Projection 2050 (${SSP[scenario]})`, [expected[2050][0]]],
          [`Projection 2100 (${SSP[scenario]})`, [expected[2100][0]]],
        ]);
      });
    }
  }
});
