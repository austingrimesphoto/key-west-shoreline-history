# Implementation status

## Completed directly in this release

- Replaced speculative timeline dates with evidence-backed anchors:
  - 1859 Coast Survey chart;
  - 1904 NOAA western-end survey;
  - 1907 georeferenced Admiralty chart;
  - 1912 NOAA waterfront survey and railway arrival;
  - 1935 railway closure;
  - 1957 NOAA harbor survey;
  - circa-1965 aerial target;
  - 2016 NOAA high-resolution shoreline reference.
- Added exact NOAA metadata coverage footprints for 1904, 1912, 1957, and 2016.
- Added a live georeferenced 1907 chart tile overlay with opacity control.
- Added a live NOAA CUSP shoreline request clipped to the Key West study area.
- Added whole-island and Trumbo Point map views.
- Added source cards and archival 1859 chart preview.
- Recorded the 134-acre / 140-acre Trumbo discrepancy rather than choosing one without resolving the definitions.
- Preserved empty historical land/fill/rail layers instead of fabricating geometry.
- Added automated validation and smoke tests.

## Important limitation

The NOAA InPort records expose project metadata and direct users to the NOAA Shoreline Data Explorer for vector downloads. The downloadable shapefile packages could not be acquired through the current execution environment. Consequently:

- NOAA project envelopes are published;
- the live CUSP comparison line is requested at runtime;
- the actual 1904, 1912, 1957, and 2016 National Shoreline vectors are not yet bundled;
- no false coastline polygons have been substituted.

## Next direct implementation work

1. Acquire the NOAA vector packages through NSDE.
2. Inspect line and polygon feature classes and retain original metadata.
3. Convert to EPSG:4326 and clip to the Key West study area.
4. Publish the 1912 waterfront shoreline first.
5. Georeference and trace the 1859 Coast Survey chart.
6. Acquire dated aerial frames for circa 1935, 1940s, and 1960s.
7. Derive compatible land polygons and incremental reclamation only after shoreline definitions are reconciled.
