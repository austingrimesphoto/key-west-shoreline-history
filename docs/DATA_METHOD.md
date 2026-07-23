# Historical GIS method

## Standard of proof

The project is more rigorous than a visual collage but deliberately avoids a publication-grade survey of every shoreline segment. The goal is a defensible public history map with transparent uncertainty and limited manual fine-tuning.

No historical boundary may be drawn solely from intuition, modern parcel lines, or an artist’s impression.

## Evidence classes

### Surveyed

Use when geometry comes directly from:

- NOAA historical shoreline vectors;
- NOAA modern shoreline vectors;
- a georeferenced Coast Survey sheet with adequate positional control.

Display: solid boundary.

### Aerial-derived

Use when shoreline is digitized from a dated aerial image that has been georeferenced against stable control points.

Display: solid boundary with metadata identifying the image date and georeferencing residual.

### Mapped

Use when geometry is digitized from a historical map, such as a Sanborn sheet, and the map has adequate fixed control points.

Display: solid or lightly differentiated line. Do not claim survey-level accuracy.

### Approximate

Use only when evidence is incomplete but the feature is historically important.

Display: dashed boundary. The notes field must explain the uncertainty.

## QGIS project settings

Recommended project CRS:

- **EPSG:4326** for web-export GeoJSON.
- Use an appropriate Florida State Plane or UTM CRS during measurement and digitizing, then export to EPSG:4326.

Keep source rasters in a non-deployed working directory. Do not commit multi-hundred-megabyte scans or TIFFs to the public site.

## Georeferencing workflow

1. Record the archival item, date, institution, rights statement, and permanent URL in `docs/SOURCE_LEDGER.md`.
2. Download the highest practical resolution.
3. Identify stable control points:
   - street intersections on original ground;
   - enduring masonry structures;
   - fixed fortifications;
   - surveyed monuments where available.
4. Avoid using later reclaimed shorelines as control points for earlier maps.
5. Use at least six well-distributed points for a full-island image where possible.
6. Start with a first-order polynomial or Helmert transform.
7. Inspect residuals and distortion. More control points do not automatically improve a bad source.
8. Save the QGIS GCP report and note the RMS error in the ledger.
9. Digitize land extent, fill increments, railway alignments, and over-water structures as separate feature classes.
10. Export simplified copies for the web while retaining the full-resolution working geometry outside the deployed bundle.

## Topology rules

- Land polygons must not self-intersect.
- Fill for period N should represent land present in N that was absent in N-1.
- Piers and elevated structures over water are not land unless the source shows permanent fill.
- Nearby artificial land such as Sigsbee or Fleming Key must not be silently merged into Key West proper.
- All periods must use a consistent operational definition of shoreline before calculating area gain.

## Required feature properties

Every published feature must include:

```json
{
  "source_id": "noaa-historical-harbor",
  "source_title": "Shoreline Data Rescue Project of Key West Harbor, Florida, PH5805",
  "source_url": "https://www.fisheries.noaa.gov/inport/item/62571",
  "evidence_class": "surveyed",
  "survey_or_image_date": "YYYY-MM-DD or documented year",
  "confidence": "high",
  "notes": "What was traced, transformed, excluded, or inferred."
}
```

Allowed evidence classes:

- `surveyed`
- `aerial-derived`
- `mapped`
- `approximate`

Allowed confidence values:

- `high`
- `medium`
- `low`

## Railway-specific rules

The Trumbo story must keep these distinct:

- reclaimed terminal ground;
- track centerlines;
- rail yard extent;
- passenger and freight buildings;
- piers;
- bridges or trestles;
- later Navy reuse.

Rail lines should be digitized from mapped or aerial evidence. Do not infer track paths merely from modern roads.

## Publication threshold

A period may be labeled “mapped” only when:

- land geometry is present;
- every feature has provenance fields;
- the validator passes;
- the source ledger identifies the relevant archival item;
- a human has compared the web output against the source;
- uncertainty is visible rather than hidden.
