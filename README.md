# leaflet-demo
Demo maps of Mauritius built with [Leaflet](https://leafletjs.com/) 2.0.0-alpha.

## Getting started
```sh
npm install
npm start
```
Then open http://localhost:8080. The pages load Leaflet from `node_modules` via an import map, so they need to be served over HTTP rather than opened as files.

## Testing
The pages are tested in Chromium with [Playwright](https://playwright.dev/). Install the browser once, then run the tests:
```sh
npx playwright install --only-shell chromium
npm test
```
The tests start their own server on port 8090 and fail on any JavaScript or console error. Map tiles, Chart.js and leaflet-velocity are loaded from external servers, so an internet connection is required. Use `npx playwright test --headed` to watch the browser, or `npx playwright test tests/pois.spec.js` to run a single file.

## Pages
| Page | Content |
|---|---|
| `index.html` | Start page with navigation, switchable base maps (OSM, Stadia, Esri) and pharmacies |
| `pois.html` | Points of interest: primary schools, shopping malls, bus stops, post offices, hospitals & clinics, pharmacies |
| `klima-mauritius.html` | Climate risk zones (flood, drought, storm) |
| `slr-mauritius.html` | Sea level rise by year (2050/2100) and emission scenario (SSP1-2.6/SSP5-8.5) |
| `slr-mauritius-graph.html` | Same as above, with a Chart.js graph per zone |
| `wind/wind.html` | Animated wind and ocean currents around Mauritius with [leaflet-velocity](https://github.com/onaci/leaflet-velocity) |

The wind demo is the only page that still uses Leaflet 1.9.4 (from CDN), because leaflet-velocity does not load with Leaflet 2.0-alpha.

The wind and current data is a snapshot stored in `wind/*.json`. To update it with the current conditions from Open-Meteo, run:
```sh
npm run fetch-wind
```
The GitHub Action [Update wind data](.github/workflows/fetch-wind.yml) does this daily at 04:00 UTC on `main` and commits the new snapshot. It can also be started manually from the Actions tab.

The zones on the climate risk and sea level rise pages are **example data**: invented rectangles with values loosely based on regional projections, not measured per location.

## Data sources
| File | Source |
|---|---|
| `data/mu_pharmacies.json` | https://geoportal.govmu.org/catalogue/#/dataset/34 |
| `data/primary_schools.geojson`, `data/shoppingmall.geojson`, `data/hospitals_clinics.json`, `data/post_offices.json` | https://geoportal.govmu.org/catalogue/ |
| `data/busstops.geojson` | https://geoportal.govmu.org/catalogue/ (contains OpenStreetMap node IDs, © OpenStreetMap contributors, ODbL) |
| `wind/wind-mauritius.json`, `wind/currents-mauritius.json` | [Open-Meteo](https://open-meteo.com/) Weather and Marine API (CC BY 4.0), 0.1° grid, created by `scripts/fetch-wind.mjs` |

Sea level projections referenced: [IPCC AR6 WG1](https://www.ipcc.ch/report/ar6/wg1/), [NASA Sea Level Projection Tool](https://sealevel.nasa.gov/data_tools/17), [World Bank Climate Change Knowledge Portal](https://climateknowledgeportal.worldbank.org/country/mauritius).

## License
[MIT](LICENSE)
