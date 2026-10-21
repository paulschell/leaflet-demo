const { test, expect, overlayLabels, setOverlay, openPopup } = require('./fixtures');

// Overlay label -> number of features and pattern the popup text has to match
// (the clicked marker may be any of several overlapping ones)
const POINT_OVERLAYS = {
  'Primary Schools': { count: 259, popup: /^PRIMARY SCHOOLS .+ Address .+ Phone \+230 \d{3,4} \d{4}/ },
  'Shopping Malls': { count: 30, popup: /^SHOPPING MALLS .+ Address .+/ },
  'Busstops': { count: 508, popup: /^BUSSTOPS .+ OSM node \d+/ },
  'Postoffices': { count: 102, popup: /^POSTOFFICES Post office / },
  'Hospitals & Clinics': { count: 32, popup: /^HOSPITALS & CLINICS .+ (Hospital|Clinic|Mediclinic) Address .+ Phone / },
  'Pharmacies': { count: 294, popup: /^PHARMACIES .+ Address .+ Phone \+230 \d{3,4} \d{4} / },
  'Social Welfare Centres': { count: 52, popup: /^SOCIAL WELFARE CENTRES .+/ },
  'Police Stations': { count: 74, popup: /^POLICE STATIONS .+ Police .+ Phone \+230 \d{3} \d{4}/ },
  'ATMs': { count: 241, popup: /^ATMS .+ ATM .+ Address / },
  'Speed Cameras': { count: 61, popup: /^SPEED CAMERAS .+ Radar \d+ Code \S+ Region \w+/ },
  'Dangerous Bathing': { count: 63, popup: /^DANGEROUS BATHING .+ ⚠ Marked as dangerous for bathing/ },
};
const SHAPE_OVERLAYS = {
  'Bus Routes': { count: 54, popup: /^BUS ROUTES Bus route Length \d+\.\d km$/ },
  'Districts': { count: 9, popup: /^DISTRICTS .+ Area \d+ km² Population [\d,]+/ },
};
const OVERLAYS = { ...POINT_OVERLAYS, ...SHAPE_OVERLAYS };

test.describe('pois.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pois.html');
  });

  test('lists all POI categories as overlays and in the legend', async ({ page }) => {
    expect(await overlayLabels(page)).toEqual(Object.keys(OVERLAYS));
    await expect(page.locator('.legend .legend-items')).toHaveText(Object.keys(OVERLAYS).join(''));
  });

  for (const [name, { count, popup }] of Object.entries(OVERLAYS)) {
    test(`${name}: shows ${count} features with popup`, async ({ page }) => {
      const features = page.locator('path.leaflet-interactive');
      await setOverlay(page, name, true);
      await expect(features).toHaveCount(count);

      const text = await openPopup(page, features.first());
      expect(text).toMatch(popup);
      expect(text).not.toContain('Fax');
      expect(text).not.toMatch(/undefined|null|NaN|<br>|\uFFFD/);
    });
  }

  test('point popups show the coordinates with a link to OpenStreetMap', async ({ page }) => {
    await setOverlay(page, 'Postoffices', true);
    const text = await openPopup(page, page.locator('path.leaflet-interactive').first());
    expect(text).toMatch(/Post office -?\d+\.\d{5}, -?\d+\.\d{5} · OpenStreetMap/);
    await expect(page.locator('.poi-footer a')).toHaveAttribute('href', /^https:\/\/www\.openstreetmap\.org\/\?mlat=/);
  });

  test('popups are wide enough to show label and value in one row', async ({ page }) => {
    await setOverlay(page, 'ATMs', true);
    await openPopup(page, page.locator('path.leaflet-interactive').first());
    const width = await page.locator('.leaflet-popup-content').evaluate(el => el.offsetWidth);
    expect(width).toBeGreaterThanOrEqual(200);
    expect(width).toBeLessThanOrEqual(320);
    const rows = page.locator('.poi-rows dt');
    const [label, value] = await Promise.all([rows.first().boundingBox(), page.locator('.poi-rows dd').first().boundingBox()]);
    expect(value.y).toBe(label.y);
  });

  test('phone numbers, emails and websites are links', async ({ page }) => {
    await setOverlay(page, 'Primary Schools', true);
    await openPopup(page, page.locator('path.leaflet-interactive').first());
    const phone = page.locator('.poi-rows a[href^="tel:"]').first();
    await expect(phone).toHaveAttribute('href', /^tel:\+230\d{7,8}$/);
    await expect(phone).toHaveText(/^\+230 \d{3,4} \d{4}$/);
    await expect(page.locator('.poi-rows dt', { hasText: 'Fax' })).toHaveCount(0);
    await page.locator('.leaflet-popup-close-button').click();

    await setOverlay(page, 'Primary Schools', false);
    await setOverlay(page, 'Shopping Malls', true);
    await openPopup(page, page.locator('path.leaflet-interactive').first());
    // "www.mallofmauritius.com" in the data has no protocol
    await expect(page.locator('.poi-rows a[href="https://www.mallofmauritius.com"]')).toHaveText('mallofmauritius.com');
  });

  test('phone numbers that only list the changing last digits are expanded', async ({ page }) => {
    await setOverlay(page, 'Police Stations', true);
    // Rose Belle Police Station: "6279340/1, 6279342/3"
    const station = page.locator('path.leaflet-interactive').nth(61);
    await expect(async () => {
      const text = await openPopup(page, station);
      expect(text).toContain('Phone +230 627 9340, +230 627 9341, +230 627 9342, +230 627 9343');
    }).toPass();
  });

  test('contact details in free text are split into rows', async ({ page }) => {
    await setOverlay(page, 'Hospitals & Clinics', true);
    // Jeetoo Hospital: address in capitals, "Tel No." and "Fax No." without colon, fax is left out
    const jeetoo = page.locator('path.leaflet-interactive').nth(25);
    await expect(async () => {
      const text = await openPopup(page, jeetoo);
      expect(text).toContain('Address Volcy Pougnet Street, P. Louis Phone +230 203 1001 -20.');
    }).toPass();
  });

  test('point categories use different colors', async ({ page }) => {
    for (const name of Object.keys(POINT_OVERLAYS)) await setOverlay(page, name, true);
    await expect(page.locator('path.leaflet-interactive')).toHaveCount(1716);

    const fills = await page.locator('path.leaflet-interactive').evaluateAll(
      paths => [...new Set(paths.map(path => path.getAttribute('fill')))]
    );
    expect(fills).toHaveLength(Object.keys(POINT_OVERLAYS).length);
  });

  test('lines and polygons are drawn below the points', async ({ page }) => {
    await setOverlay(page, 'Districts', true);
    await setOverlay(page, 'Pharmacies', true);
    await expect(page.locator('path.leaflet-interactive')).toHaveCount(9 + 294);

    await expect(page.locator('.leaflet-shapes-pane path')).toHaveCount(9);
    await expect(page.locator('.leaflet-overlay-pane path')).toHaveCount(294);
    const text = await openPopup(page, page.locator('.leaflet-overlay-pane path').first());
    expect(text).toMatch(/^PHARMACIES /);
  });

  test('district popups show formatted population', async ({ page }) => {
    await setOverlay(page, 'Districts', true);
    const text = await openPopup(page, page.locator('path.leaflet-interactive').first());
    expect(text).toMatch(/Population \d{1,3}(,\d{3})+ Density \d+ per km² Male [\d,]+ \(\d+\.\d%\) Female [\d,]+ \(\d+\.\d%\)/);
  });
});
