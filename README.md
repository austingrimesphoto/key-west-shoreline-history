# Key West: The Island That Grew

A public, evidence-based historical GIS showing how Key West changed through shoreline modification, land reclamation, the Florida East Coast Railway terminal at Trumbo Point, wartime naval development, and postwar expansion.

## Working release

This is now a functional historical research map rather than an empty UI scaffold.

It includes:

- an eight-period evidence-backed timeline from 1859 through the modern shoreline;
- a georeferenced 1907 harbor-chart overlay with opacity control;
- exact NOAA survey-project coverage envelopes for 1904, 1912, 1957, and 2016;
- a live request to NOAA’s CUSP modern shoreline ArcGIS service;
- whole-island and Trumbo Point map views;
- explicit source cards and uncertainty labels;
- an archival preview of the public-domain 1859 Coast Survey chart;
- empty, evidence-gated historical land/fill/rail layers ready for actual vectors;
- automated validation and smoke testing;
- Netlify configuration.

The map does **not** draw an imagined early coastline. Survey coverage polygons are visibly labeled as metadata envelopes, not shoreline.

## Repository

The public source repository is:

`https://github.com/austingrimesphoto/key-west-shoreline-history`

The `main` branch is the deployable source of truth. Pushes and pull requests run the GeoJSON validator, manifest smoke test, and JavaScript syntax check through GitHub Actions.

## Run locally

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

The basemap, NOAA CUSP line, historical raster tiles, and archival preview require internet access.

## Validate

```bash
python3 scripts/validate_geojson.py
python3 scripts/smoke_test.py
node --check assets/app.js
```

## Deploy to Netlify

1. Choose **Add new project → Import an existing project**.
2. Select `key-west-shoreline-history`.
3. Leave the build command blank.
4. Use `.` as the publish directory.
5. Publish.

## Project documentation

- [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md)
- [`docs/DATA_METHOD.md`](docs/DATA_METHOD.md)
- [`docs/SOURCE_LEDGER.md`](docs/SOURCE_LEDGER.md)
- [`docs/PHASES.md`](docs/PHASES.md)

## Data honesty

The current execution environment could access authoritative metadata pages and remote map services but could not download NOAA’s binary shoreline packages from NSDE. This release therefore publishes real survey extents and live services, while leaving the historical geometry empty until the actual vectors can be acquired.

## License

Original code is MIT licensed. Historical data and imagery retain their source-specific terms; see [`DATA_LICENSE.md`](DATA_LICENSE.md).
