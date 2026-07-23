# Codex handoff prompt

Use this in a fresh Codex session after the repository is created.

---

You are working in the public repository `austingrimesphoto/key-west-shoreline-history`.

Mission: implement Phase 1 from `docs/PHASES.md`: import a defensible modern NOAA shoreline reference and complete the NOAA historical source inventory needed for later Key West reconstruction.

Read first:

- `README.md`
- `docs/DATA_METHOD.md`
- `docs/SOURCE_LEDGER.md`
- `docs/PHASES.md`
- `data/import/README.md`

Non-negotiable constraints:

1. Do not invent, sketch, or approximate a coastline merely to make the map look complete.
2. Use primary NOAA sources for modern shoreline geometry and metadata.
3. Preserve provenance in every published feature.
4. Do not commit huge TIFFs, archival scans, or raw source packages to the deployed site.
5. Keep the project static and compatible with Netlify.
6. Do not add a database, authentication, serverless function, or paid map service.
7. Publicly visible claims must be source-grounded.
8. Do not proceed past Phase 1 unless needed to make Phase 1 work.

Required work:

1. Identify and download the best current NOAA Key West shoreline vector package, prioritizing FL2403-CS-N if downloadable and geographically complete; otherwise use FL1611-TB-N and document why.
2. Preserve the downloaded package outside the deploy bundle or in a clearly ignored working directory.
3. Inspect CRS, fields, survey dates, and feature classifications.
4. Create a reproducible conversion script using GDAL/ogr2ogr or Python geospatial tooling.
5. Clip to the repository study area and export web-safe EPSG:4326 GeoJSON.
6. Populate `data/land/2026.geojson` with appropriate land geometry. Do not turn every NOAA cartographic line into a land polygon without a defensible method.
7. Update `docs/SOURCE_LEDGER.md` with exact package URL, identifier, date, CRS, method, limitations, and review notes.
8. Inventory NOAA projects PH5805, GC20A04, and GC20A10, including exact survey dates and downloadable products when available.
9. Update period labels if the evidence establishes better dates.
10. Add tests or validation needed for the conversion pipeline.
11. Run `python3 scripts/validate_geojson.py`.
12. Serve the site locally and visually confirm that the modern layer aligns with the basemap around the whole island and Trumbo Point.
13. Commit and push the completed Phase 1 work.

Stop conditions:

- If NOAA data cannot be downloaded programmatically, document the exact manual download steps and stop before fabricating a substitute.
- If shoreline lines cannot be defensibly converted to land polygons, publish the surveyed line as a distinct layer after updating the schema and UI; do not guess a polygon.
- If source dates conflict, retain both records and explain the conflict.

Final response must report:

- exact source products used;
- exact files changed;
- geometry and CRS method;
- validation results;
- visual review result;
- commit SHA;
- remaining manual steps;
- anything that is still approximate or unresolved.

Reasoning level: Terra/high for the first source/data pipeline implementation. Use a fresh bounded session.
