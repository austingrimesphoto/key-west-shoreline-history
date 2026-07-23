# Key West: The Island That Grew

A public, evidence-based historical GIS showing how Key West changed through shoreline modification, land reclamation, the Florida East Coast Railway terminal at Trumbo Point, wartime naval development, and postwar expansion.

## Working release

The timeline is now evidence-gated: **a date appears as a selectable map state only when it resolves to its own spatial source over Key West.**

The application includes:

- one fixed, georeferenced 1907 harbor-chart overlay;
- runtime discovery of NOAA historical aerial frames intersecting Key West;
- one locked NOAA raster mosaic for each exact aerial year the catalog returns;
- a modern NOAA shoreline reference;
- whole-island and Trumbo Point views;
- explicit source and uncertainty information;
- a separate milestone list for important dates that are documented but not yet spatially publishable;
- automated manifest, GeoJSON, and JavaScript validation;
- Netlify configuration.

The 1907 chart is never reused under another date. The NOAA aerial catalog is queried before the timeline is constructed, and duplicate overlay identities are rejected.

## Why some historically important dates are not selectable

The project currently documents 1859, 1904, 1912, and 1935 as milestones. They remain outside the map slider until a distinct georeferenced raster or vector is acquired for each date. This avoids presenting the modern basemap—or the 1907 chart—as though it were evidence from those years.

## Run locally

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

The basemap, NOAA historical-aerial discovery, NOAA image export, NOAA modern shoreline, and the 1907 raster tiles require internet access.

## Validate

```bash
python3 scripts/validate_geojson.py
python3 scripts/smoke_test.py
node scripts/test_period_utils.mjs
node --check assets/period-utils.js
node --check assets/app.js
```

The smoke test enforces:

- unique map-state IDs;
- unique overlay identities;
- a spatial source for every selectable fixed date;
- separation between selectable dates and unmapped milestones;
- use of NOAA’s official historical-imagery service for dynamically discovered aerial years.

## Repository

The public source repository is:

`https://github.com/austingrimesphoto/key-west-shoreline-history`

The `main` branch is the deployable source of truth.

## Deploy to Netlify

1. Choose **Add new project → Import an existing project**.
2. Select `key-west-shoreline-history`.
3. Leave the build command blank.
4. Use `.` as the publish directory.
5. Publish.

## Data limitations

NOAA states that its historical aerial photographs are georeferenced but not orthorectified. They are useful for visual comparison, but positional error may remain. The application locks each displayed aerial year to the exact NOAA catalog raster IDs returned over Key West and reports the number of source frames used.

Survey-coverage polygons are metadata envelopes, not historical coastlines. No coastline or reclamation polygon is invented to make a period appear complete.

## Documentation

- [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md)
- [`docs/DATA_METHOD.md`](docs/DATA_METHOD.md)
- [`docs/SOURCE_LEDGER.md`](docs/SOURCE_LEDGER.md)
- [`docs/PHASES.md`](docs/PHASES.md)

## License

Original code is MIT licensed. Historical data and imagery retain their source-specific terms; see [`DATA_LICENSE.md`](DATA_LICENSE.md).
