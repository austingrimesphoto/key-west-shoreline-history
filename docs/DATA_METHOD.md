# Data method

## Publication rule

A date is selectable in the interactive map only when it has a distinct spatial evidence source. Historical importance alone is not sufficient.

The project separates:

- **map states** — dates with a georeferenced raster or vector that can be displayed spatially;
- **milestones** — important dates supported by documents or metadata but not yet represented by a publishable spatial layer.

## Runtime NOAA aerial discovery

At startup, the application queries NOAA's historical-imagery ImageServer catalog using the Key West study envelope in EPSG:4326.

The query requests primary imagery records with years from 1944 through 1969 and retrieves:

- object ID;
- image name;
- mission;
- year;
- source link;
- resolution;
- sensor;
- horizontal-accuracy notes;
- tide-control metadata.

Returned records are grouped by their exact `Year`. A year appears in the timeline only when at least one valid raster object ID is returned.

For display, the application calls the ImageServer `exportImage` operation with an `esriMosaicLockRaster` rule. The rule contains only the object IDs returned for the selected year. This prevents the service from silently substituting imagery from another date.

## Fixed historical chart

The 1907 Admiralty chart is supplied through Wikimaps Warper map 4655. It has five published control points and is treated as interpretation-grade rather than survey-grade.

It is displayed only for 1907.

## Modern shoreline

The blue modern shoreline is requested from NOAA's CUSP feature service. It is a modern comparison line and not a replacement for NOAA's higher-control National Shoreline products.

## Accuracy language

Evidence classes used by the broader project remain:

- **surveyed** — NOAA vector shoreline or Coast Survey manuscript with documented control;
- **aerial-derived** — traced from dated, georeferenced aerial imagery;
- **mapped** — traced from a georeferenced historical map;
- **approximate** — incomplete evidence, visibly labeled as uncertain.

NOAA historical aerial imagery is georeferenced but not orthorectified. Apparent displacement between dates may include image-registration error, relief displacement, or mosaic effects.

## Coverage envelopes

NOAA survey-project envelopes are retained as metadata coverage. They are styled as dashed rectangles and explicitly described as not being shoreline geometry.

## No invented completion

Empty land, fill, and railway GeoJSON files remain evidence-gated working contracts. They are not displayed merely to create the appearance of a complete timeline.
