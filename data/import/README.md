# Import workspace

Do not place large archival source files in the deployed `data/` folders.

Recommended local structure, ignored by Git:

```text
working/
  raw/
    noaa/
    loc/
    uf-aerials/
    keys-history-center/
  georeferenced/
  qgis/
  exports/
```

## Published folder roles

- `data/land/`: complete land extent for a selected period.
- `data/fill/`: land present in the selected period but not the immediately prior period.
- `data/rail/`: railway centerlines, yards, or terminal alignments supported by evidence.

## Feature schema

```json
{
  "type": "Feature",
  "properties": {
    "source_id": "noaa-modern-2016",
    "source_title": "Shoreline Mapping Program of Key West, FL, FL1611-TB-N",
    "source_url": "https://www.fisheries.noaa.gov/inport/item/61479",
    "evidence_class": "surveyed",
    "survey_or_image_date": "2016-04",
    "confidence": "high",
    "notes": "Describe derivation and exclusions."
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": []
  }
}
```

Run validation before committing:

```bash
python3 scripts/validate_geojson.py
```
