// Fetches current wind and ocean currents around Mauritius from Open-Meteo
// (https://open-meteo.com, data under CC BY 4.0) and writes them in the
// u/v grid format used by leaflet-velocity:
//   wind/wind-mauritius.json, wind/currents-mauritius.json
//
// Usage: npm run fetch-wind

import { writeFile } from 'node:fs/promises';

// Grid around Mauritius in steps of 0.1° (row order: north to south, west to east)
const GRID = { north: -19.5, south: -21.0, west: 56.6, east: 58.5, step: 0.1 };

const nx = Math.round((GRID.east - GRID.west) / GRID.step) + 1;
const ny = Math.round((GRID.north - GRID.south) / GRID.step) + 1;
const round = (value, digits) => Number(value.toFixed(digits));

const points = [];
for (let j = 0; j < ny; j++) {
  for (let i = 0; i < nx; i++) {
    points.push({ lat: round(GRID.north - j * GRID.step, 2), lon: round(GRID.west + i * GRID.step, 2) });
  }
}

async function fetchCurrent(baseUrl, params) {
  const url = new URL(baseUrl);
  url.searchParams.set('latitude', points.map(p => p.lat).join(','));
  url.searchParams.set('longitude', points.map(p => p.lon).join(','));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url.host}: HTTP ${response.status} ${await response.text()}`);
  const locations = await response.json();
  if (locations.length !== points.length) throw new Error(`${url.host}: expected ${points.length} locations, got ${locations.length}`);
  return locations;
}

// Two records (u = eastward, v = northward) as expected by leaflet-velocity
function toVelocityRecords(locations, name, toVector) {
  const header = {
    parameterCategory: 2,
    parameterUnit: 'm.s-1',
    nx, ny,
    lo1: GRID.west, la1: GRID.north,
    lo2: GRID.east, la2: GRID.south,
    dx: GRID.step, dy: GRID.step,
    refTime: `${locations[0].current.time}:00Z`,
    forecastTime: 0,
    source: 'Open-Meteo (https://open-meteo.com), CC BY 4.0',
  };
  const vectors = locations.map(location => toVector(location.current));

  return [
    { header: { ...header, parameterNumber: 2, parameterNumberName: `eastward_${name}` }, data: vectors.map(([u]) => u) },
    { header: { ...header, parameterNumber: 3, parameterNumberName: `northward_${name}` }, data: vectors.map(([, v]) => v) },
  ];
}

// Wind direction is where the wind comes FROM (meteorological convention)
function windVector({ wind_speed_10m: speed, wind_direction_10m: direction }) {
  if (speed == null || direction == null) return [0, 0];
  const rad = direction * Math.PI / 180;
  return [round(-speed * Math.sin(rad), 2), round(-speed * Math.cos(rad), 2)];
}

// Current direction is where the current flows TO (oceanographic convention), velocity in km/h.
// Land has no value and becomes 0, so no particles move there.
function currentVector({ ocean_current_velocity: velocity, ocean_current_direction: direction }) {
  if (velocity == null || direction == null) return [0, 0];
  const speed = velocity / 3.6;
  const rad = direction * Math.PI / 180;
  return [round(speed * Math.sin(rad), 3), round(speed * Math.cos(rad), 3)];
}

const wind = await fetchCurrent('https://api.open-meteo.com/v1/forecast', {
  current: 'wind_speed_10m,wind_direction_10m',
  wind_speed_unit: 'ms',
});
const marine = await fetchCurrent('https://marine-api.open-meteo.com/v1/marine', {
  current: 'ocean_current_velocity,ocean_current_direction',
});
if (marine[0].current_units.ocean_current_velocity !== 'km/h') {
  throw new Error(`Unexpected current unit: ${marine[0].current_units.ocean_current_velocity}`);
}

const outputs = {
  'wind/wind-mauritius.json': toVelocityRecords(wind, 'wind', windVector),
  'wind/currents-mauritius.json': toVelocityRecords(marine, 'current', currentVector),
};
for (const [file, records] of Object.entries(outputs)) {
  await writeFile(new URL(`../${file}`, import.meta.url), JSON.stringify(records) + '\n');
  console.log(`${file}: ${nx}x${ny} grid, ${records[0].header.refTime}`);
}
