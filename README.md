# Key West: The Island That Grew

A public, evidence-based historical GIS project showing how Key West changed through shoreline modification, land reclamation, the Florida East Coast Railway terminal at Trumbo Point, wartime naval development, and postwar expansion.

## Current state

This repository is a complete deployable **research scaffold**, not a finished historical reconstruction.

It includes:

- a responsive MapLibre timeline interface;
- eight target periods from the earliest Coast Survey through the present;
- dedicated Trumbo Point and Overseas Railway story stages;
- a documented source catalog;
- GeoJSON layer contracts for historical land, newly added land, and railway geometry;
- a validation script and GitHub Actions gate;
- Netlify configuration;
- an explicit rule against invented coastlines.

All historical GeoJSON files intentionally begin empty. Geometry is published only after it is tied to source evidence and reviewed.

## Run locally

Because this is a static site, any local web server works:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

Do not open `index.html` directly from Finder; browser security rules may block local JSON loading.

## Publish the public GitHub repository

From the project directory:

```bash
chmod +x scripts/publish-to-github.sh
./scripts/publish-to-github.sh
```

The script creates or updates:

`https://github.com/austingrimesphoto/key-west-shoreline-history`

It requires GitHub CLI:

```bash
brew install gh
gh auth login
```

## Deploy to Netlify

1. In Netlify, choose **Add new project → Import an existing project**.
2. Select the GitHub repository.
3. Leave the build command blank.
4. Set the publish directory to `.`.
5. Publish.

`netlify.toml` already records the publish directory and basic headers.

## Validate GIS layers

```bash
python3 scripts/validate_geojson.py
```

The validator checks:

- expected geometry type for each layer;
- required provenance and confidence fields;
- finite coordinates;
- a broad Key West geographic envelope.

## Data workflow

Read these before adding geometry:

- [`docs/DATA_METHOD.md`](docs/DATA_METHOD.md)
- [`docs/SOURCE_LEDGER.md`](docs/SOURCE_LEDGER.md)
- [`docs/PHASES.md`](docs/PHASES.md)
- [`data/import/README.md`](data/import/README.md)

## Basemap and attribution

The application uses MapLibre GL JS with OpenFreeMap’s Liberty style and OpenStreetMap-derived data. Historical datasets and images retain their own source and rights statements.

## License

Code is MIT licensed. Historical data, scans, photographs, and derived GIS layers may have different terms; see [`DATA_LICENSE.md`](DATA_LICENSE.md).
