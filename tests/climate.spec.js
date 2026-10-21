const { test, expect, openPopup } = require('./fixtures');

const COLORS = { '#a6d96a': 'Niedrig', '#fdae61': 'Mittel', '#d7191c': 'Hoch' };

// Expected sea level rise in cm per zone (feature order), scenario and year
const RISE = {
  niedrig: { 2050: [16, 13, 11, 15], 2100: [28, 23, 16, 26] },
  hoch: { 2050: [24, 20, 16, 22], 2100: [49, 40, 28, 45] },
};

function riskLevel(rise) {
  return rise < 20 ? 'Niedrig' : rise < 40 ? 'Mittel' : 'Hoch';
}

async function fillLevels(page) {
  const fills = await page.locator('path.leaflet-interactive').evaluateAll(
    paths => paths.map(path => path.getAttribute('fill'))
  );
  return fills.map(fill => COLORS[fill]);
}

test.describe('klima-mauritius.html', () => {
  test('switches between risk layers and keeps the base map', async ({ page }) => {
    await page.goto('/klima-mauritius.html');
    const zones = page.locator('path.leaflet-interactive');

    await expect(zones).toHaveCount(3);
    for (const [risk, count] of [['drought', 2], ['storm', 2], ['flood', 3]]) {
      await page.check(`input[value=${risk}]`);
      await expect(zones).toHaveCount(count);
      await expect(page.locator('.leaflet-tile-pane > .leaflet-layer')).toHaveCount(1);
    }
  });

  test('marks the zones as example data', async ({ page }) => {
    await page.goto('/klima-mauritius.html');
    await expect(page.locator('.info').first()).toContainText('Beispieldaten');
  });
});

test.describe('slr-mauritius.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/slr-mauritius.html');
  });

  for (const scenario of ['niedrig', 'hoch']) {
    for (const year of ['2050', '2100']) {
      test(`${scenario} ${year}: color and popup match the rise`, async ({ page }) => {
        await page.selectOption('#year', year);
        await page.selectOption('#scenario', scenario);

        const expected = RISE[scenario][year];
        await expect.poll(() => fillLevels(page)).toEqual(expected.map(riskLevel));

        const text = await openPopup(page, page.locator('path.leaflet-interactive').first());
        expect(text).toContain(`${expected[0]} cm`);
        expect(text).toContain(`Risikostufe: ${riskLevel(expected[0])}`);
      });
    }
  }
});

test.describe('slr-mauritius-graph.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/slr-mauritius-graph.html');
  });

  for (const [scenario, ssp] of [['niedrig', 'SSP1-2.6'], ['hoch', 'SSP5-8.5']]) {
    test(`${scenario}: popup chart shows the selected scenario`, async ({ page }) => {
      await page.selectOption('#year', '2100');
      await page.selectOption('#scenario', scenario);

      const expected = RISE[scenario];
      await expect.poll(() => fillLevels(page)).toEqual(expected[2100].slice(0, 3).map(riskLevel));

      const text = await openPopup(page, page.locator('path.leaflet-interactive').first());
      expect(text).toContain(`Risikostufe: ${riskLevel(expected[2100][0])}`);

      await expect.poll(() => page.evaluate(() => {
        const chart = Chart.getChart(document.querySelector('.leaflet-popup-content canvas'));
        return chart && chart.data.datasets.slice(1).map(d => [d.label, d.data.filter(v => v != null)]);
      })).toEqual([
        [`Prognose 2050 (${ssp})`, [expected[2050][0]]],
        [`Prognose 2100 (${ssp})`, [expected[2100][0]]],
      ]);
    });
  }
});
