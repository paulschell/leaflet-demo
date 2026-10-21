"""Convert shapefile exports from geoportal.govmu.org into GeoJSON files in data/.

The exports are zip files that contain a second zip with the shapefile. They are
read from downloads/ (not part of the repository), reprojected to WGS84 where
needed, reduced to the attributes shown in the popups and, for lines and
polygons, simplified to keep the files small.

Usage (needs pyshp, pyproj and shapely):
    pip install pyshp pyproj shapely
    python scripts/convert-geoportal.py
"""

import io
import json
import zipfile
from pathlib import Path

import numpy as np
import shapefile
import shapely
from pyproj import Transformer
from shapely.geometry import mapping, shape

ROOT = Path(__file__).resolve().parent.parent
DOWNLOADS = ROOT / 'downloads'
DATA = ROOT / 'data'

UTM_40S_TO_WGS84 = Transformer.from_crs('EPSG:32740', 'EPSG:4326', always_xy=True)


def utm_to_wgs84(coords):
    return np.column_stack(UTM_40S_TO_WGS84.transform(coords[:, 0], coords[:, 1]))


def phones(record):
    return ', '.join(tel for tel in (record['Tel1'], record['Tel2']) if tel)


# Output file -> export, attributes for the popups, simplification tolerance
# (in the units of the source CRS) and whether the source is in UTM zone 40S
DATASETS = {
    'social_welfare_centres.geojson': {
        'zip': 'Social Welfare Centres.zip',
        'properties': lambda r: {'name': r['Name']},
    },
    'police_stations.geojson': {
        'zip': 'Police Stations.zip',
        'properties': lambda r: {'name': r['Name'], 'phone': phones(r)},
    },
    'atms.geojson': {
        'zip': 'ATMs.zip',
        'properties': lambda r: {'name': r['ATM'], 'bank': r['Bank_Name'], 'address': r['Address'],
                                 'services': r['Services']},
    },
    # The ROAD column is shifted against CODE in the export, so it is left out
    'speed_cameras.geojson': {
        'zip': 'Fix speed cameras.zip',
        'properties': lambda r: {'name': r['NAME'], 'code': r['CODE'], 'location': r['LOCATION'],
                                 'region': r['REGION']},
    },
    'dangerous_bathing.geojson': {
        'zip': 'Dangerous Bathing.zip',
        'properties': lambda r: {'name': r['Beach'], 'district': r['District']},
    },
    'districts.geojson': {
        'zip': 'Districts.zip',
        'properties': lambda r: {'name': r['name'], 'area_km2': r['Area'], 'population': r['Pop_total'],
                                 'male': r['Pop_male'], 'female': r['Pop_female']},
        'tolerance': 20,
        'utm': True,
    },
    # The export has no attributes besides the feature ID
    'bus_routes.geojson': {
        'zip': 'bustransport.zip',
        'properties': lambda r: {},
        'tolerance': 0.0001,
    },
}


def read_shapefile(zip_path):
    """Open the shapefile inside the inner zip of a geoportal export."""
    with zipfile.ZipFile(zip_path) as outer:
        inner = zipfile.ZipFile(io.BytesIO(outer.read(outer.namelist()[0])))
    files = {Path(name).suffix: name for name in inner.namelist()}
    encoding = inner.read(files['.cst']).decode().strip() if '.cst' in files else 'latin-1'
    return shapefile.Reader(
        shp=io.BytesIO(inner.read(files['.shp'])),
        shx=io.BytesIO(inner.read(files['.shx'])),
        dbf=io.BytesIO(inner.read(files['.dbf'])),
        encoding=encoding,
    )


def round_coords(coords, digits):
    if isinstance(coords[0], (int, float)):
        return [round(c, digits) for c in coords]
    return [round_coords(c, digits) for c in coords]


def convert(name, config):
    reader = read_shapefile(DOWNLOADS / config['zip'])
    features = []
    for record, geometry in zip(reader.records(), reader.shapes()):
        geom = shape(geometry.__geo_interface__)
        if 'tolerance' in config:
            geom = geom.simplify(config['tolerance'], preserve_topology=True)
        if config.get('utm'):
            geom = shapely.transform(geom, utm_to_wgs84)
        geojson = mapping(geom)

        properties = {key: value.strip() if isinstance(value, str) else value
                      for key, value in config['properties'](record).items()}
        features.append({
            'type': 'Feature',
            'properties': {key: value for key, value in properties.items() if value not in ('', None)},
            'geometry': {'type': geojson['type'], 'coordinates': round_coords(geojson['coordinates'], 5)},
        })

    path = DATA / name
    path.write_text(json.dumps({'type': 'FeatureCollection', 'features': features},
                               ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'{path.relative_to(ROOT)}: {len(features)} features, {path.stat().st_size // 1024} KB')


if __name__ == '__main__':
    for name, config in DATASETS.items():
        convert(name, config)
