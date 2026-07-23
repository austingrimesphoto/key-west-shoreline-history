# Implementation status

## Current map behavior

The timeline no longer treats narrative dates as though they were mapped periods.

A selectable map state must have a unique spatial identity:

1. **1907 chart** — fixed Wikimaps Warper tile source, used once.
2. **NOAA aerial years** — discovered at runtime from NOAA's historical-imagery ImageServer. The application queries the Key West study bounds, groups exact catalog records by `Year`, and constructs a locked raster mosaic from that year's returned `OBJECTID` values.
3. **2016+ modern reference** — NOAA CUSP shoreline and the 2016 project-coverage envelope.

If NOAA returns no exact aerial records for a year, that year does not appear. If the NOAA catalog is unavailable, no guessed aerial dates are inserted.

## Documented but unmapped milestones

The following remain visible as research milestones but are intentionally excluded from the slider:

- 1859 Coast Survey chart;
- 1904 NOAA western-end shoreline survey;
- 1912 NOAA waterfront survey and railway arrival;
- 1935 closure of the Overseas Railway route.

They will become selectable only after their own georeferenced raster or vector is imported and reviewed.

## Distinct-source safeguards

- Fixed periods must have unique `overlay.identity` values.
- Dynamically discovered aerial years receive identities of the form `noaa-aerial-YYYY`.
- The application removes duplicate identities before building the timeline.
- The smoke test fails if a fixed period lacks spatial evidence or reuses another period's identity.
- The 1907 raster is not listed under 1904 or 1912.

## Historical aerial method

The application queries:

`NOAA Imagery/3Band_RGB_8Bit_Imagery ImageServer`

within the Key West study bounds for primary catalog records dated 1944–1969. Each year is exported with an ArcGIS `esriMosaicLockRaster` rule using only the raster IDs verified for that year.

NOAA describes this historical imagery as georeferenced but not orthorectified. It should be interpreted as visual historical evidence, not survey-grade positional truth.

## Remaining major work

1. Acquire and import the actual 1904 and 1912 NOAA shoreline vectors.
2. Georeference the 1859 Coast Survey chart with documented control and residuals.
3. Derive period land polygons only after shoreline definitions are reconciled.
4. Map Trumbo fill and railway geometry from reviewed sources.
5. Add quantitative land-area and reclamation calculations.
