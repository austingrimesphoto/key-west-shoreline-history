# Implementation phases

## Phase 1 — Evidence-backed working map

Status: **complete**

- evidence-backed period timeline;
- 1907 georeferenced raster overlay;
- exact NOAA survey-project footprints;
- live NOAA modern shoreline request;
- Trumbo focus and source discrepancy handling;
- validation, smoke tests, and Netlify deployment configuration.

## Phase 2 — NOAA shoreline vectors

Status: **blocked only on binary package acquisition**

- import 1904 western-end vector;
- import 1912 waterfront vector;
- import 1957 harbor vector;
- import 2016 high-resolution vector;
- preserve source attributes and CRS metadata;
- publish shoreline lines before deriving land polygons.

## Phase 3 — Early island and railway land polygons

- georeference the 1859 Coast Survey chart;
- build a defensible early-island land polygon;
- reconcile shoreline definitions across periods;
- derive Trumbo fill from pre-terminal versus 1912 evidence;
- map railway track and terminal geometry from documented maps.

## Phase 4 — Aerial-derived wartime and postwar growth

- acquire dated 1930s, 1940s, and 1960s aerial frames;
- georeference and trace whole-island land extent;
- map New Town, airport, Sigsbee, Fleming Key, and Navy changes;
- keep nearby artificial islands topologically distinct.

## Phase 5 — Analysis and public-history polish

- calculate land area by period;
- calculate incremental fill;
- add a true swipe comparator;
- add image callouts and local-history review;
- publish version 1.0.
