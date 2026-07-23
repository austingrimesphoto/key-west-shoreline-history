# Implementation phases

## Phase 1 — Evidence-gated working map

Status: **complete**

- fixed 1907 georeferenced chart overlay, used once;
- live discovery of exact NOAA historical-aerial years over Key West;
- one locked raster mosaic per verified aerial year;
- modern NOAA shoreline reference;
- explicit separation between selectable map states and unmapped milestones;
- exact NOAA survey-project footprints;
- Trumbo focus and source discrepancy handling;
- validation, executable period-discovery tests, and Netlify configuration.

## Phase 2 — NOAA shoreline vectors

Status: **blocked on vector-package acquisition**

- import 1904 western-end vector;
- import 1912 waterfront vector;
- import 1957 harbor vector;
- import 2016 high-resolution vector;
- preserve source attributes and CRS metadata;
- promote 1904 and 1912 from milestones to map states only after validation;
- publish shoreline lines before deriving land polygons.

## Phase 3 — Early island and railway land polygons

- georeference the 1859 Coast Survey chart;
- build a defensible early-island land polygon;
- reconcile shoreline definitions across periods;
- derive Trumbo fill from pre-terminal versus 1912 evidence;
- map railway track and terminal geometry from documented maps.

## Phase 4 — Aerial-derived land reconstruction

- review the NOAA aerial years discovered over Key West;
- select frames with adequate island coverage and metadata;
- trace whole-island land extent for defensible representative years;
- map New Town, airport, Sigsbee, Fleming Key, and Navy changes;
- keep nearby artificial islands topologically distinct;
- record registration limitations and reviewer decisions.

## Phase 5 — Analysis and public-history polish

- calculate land area by period;
- calculate incremental fill;
- add a true swipe comparator;
- add image callouts and local-history review;
- publish version 1.0.
