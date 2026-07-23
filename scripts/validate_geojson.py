#!/usr/bin/env python3
"""Validate published Key West historical GIS data without third-party dependencies."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
KEY_WEST_ENVELOPE = (-82.0, 24.3, -81.5, 24.8)
ALLOWED_GEOMETRIES = {
    "land": {"Polygon", "MultiPolygon"},
    "fill": {"Polygon", "MultiPolygon"},
    "rail": {"LineString", "MultiLineString"},
}
REQUIRED_PROPERTIES = {
    "source_id",
    "source_title",
    "source_url",
    "evidence_class",
    "survey_or_image_date",
    "confidence",
    "notes",
}
EVIDENCE_CLASSES = {"surveyed", "aerial-derived", "mapped", "approximate"}
CONFIDENCE_VALUES = {"high", "medium", "low"}


def iter_numbers(value: Any) -> Iterable[float]:
    if isinstance(value, (int, float)):
        yield float(value)
    elif isinstance(value, list):
        for item in value:
            yield from iter_numbers(item)


def coordinate_pairs(value: Any) -> Iterable[tuple[float, float]]:
    if (
        isinstance(value, list)
        and len(value) >= 2
        and isinstance(value[0], (int, float))
        and isinstance(value[1], (int, float))
    ):
        yield float(value[0]), float(value[1])
        return
    if isinstance(value, list):
        for item in value:
            yield from coordinate_pairs(item)


def validate_coordinates(prefix: str, coordinates: Any) -> list[str]:
    errors: list[str] = []
    values = list(iter_numbers(coordinates))
    if any(not math.isfinite(value) for value in values):
        errors.append(f"{prefix}: coordinates contain non-finite values")

    min_lon, min_lat, max_lon, max_lat = KEY_WEST_ENVELOPE
    for lon, lat in coordinate_pairs(coordinates):
        if not (min_lon <= lon <= max_lon and min_lat <= lat <= max_lat):
            errors.append(f"{prefix}: coordinate ({lon}, {lat}) falls outside Key West envelope")
            break
    return errors


def validate_period_file(path: Path) -> list[str]:
    errors: list[str] = []
    category = path.parent.name
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return [f"{path.relative_to(ROOT)}: invalid JSON: {exc}"]

    if data.get("type") != "FeatureCollection":
        errors.append(f"{path.relative_to(ROOT)}: root type must be FeatureCollection")

    features = data.get("features")
    if not isinstance(features, list):
        errors.append(f"{path.relative_to(ROOT)}: features must be a list")
        return errors

    allowed = ALLOWED_GEOMETRIES[category]
    for index, feature in enumerate(features):
        prefix = f"{path.relative_to(ROOT)} feature {index}"
        geometry = feature.get("geometry") or {}
        if geometry.get("type") not in allowed:
            errors.append(f"{prefix}: invalid geometry for {category}")

        properties = feature.get("properties")
        if not isinstance(properties, dict):
            errors.append(f"{prefix}: properties must be an object")
            continue

        missing = sorted(REQUIRED_PROPERTIES - properties.keys())
        if missing:
            errors.append(f"{prefix}: missing properties: {', '.join(missing)}")
        if properties.get("evidence_class") not in EVIDENCE_CLASSES:
            errors.append(f"{prefix}: invalid evidence_class")
        if properties.get("confidence") not in CONFIDENCE_VALUES:
            errors.append(f"{prefix}: invalid confidence")
        errors.extend(validate_coordinates(prefix, geometry.get("coordinates", [])))

    return errors


def validate_coverage(path: Path) -> list[str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    errors: list[str] = []
    if data.get("type") != "FeatureCollection":
        errors.append("survey-coverage.geojson: root type must be FeatureCollection")
        return errors

    required = {"period_id", "coverage_id", "source_id", "source_title", "survey_date", "notice"}
    for index, feature in enumerate(data.get("features", [])):
        prefix = f"survey-coverage.geojson feature {index}"
        geometry = feature.get("geometry") or {}
        if geometry.get("type") != "Polygon":
            errors.append(f"{prefix}: coverage must be Polygon")
        properties = feature.get("properties") or {}
        missing = sorted(required - properties.keys())
        if missing:
            errors.append(f"{prefix}: missing properties: {', '.join(missing)}")
        if "not the" not in str(properties.get("notice", "")).lower():
            errors.append(f"{prefix}: notice must explicitly distinguish coverage from shoreline")
        errors.extend(validate_coordinates(prefix, geometry.get("coordinates", [])))
    return errors


def main() -> int:
    paths = sorted(
        path
        for category in ALLOWED_GEOMETRIES
        for path in (DATA_DIR / category).glob("*.geojson")
    )
    all_errors: list[str] = []
    for path in paths:
        all_errors.extend(validate_period_file(path))
    all_errors.extend(validate_coverage(DATA_DIR / "survey-coverage.geojson"))

    if all_errors:
        print("\n".join(all_errors), file=sys.stderr)
        return 1

    print(f"Validated {len(paths)} period GeoJSON files and survey coverage.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
