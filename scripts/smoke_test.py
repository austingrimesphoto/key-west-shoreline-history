#!/usr/bin/env python3
"""Check manifests, fixed map states, archival aerials, and optional NOAA behavior."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


manifest = json.loads((ROOT / "data/periods.json").read_text(encoding="utf-8"))
archive_aerials = json.loads((ROOT / "data/archive-aerial-periods.json").read_text(encoding="utf-8"))
archive_sources = json.loads((ROOT / "data/archive-sources.json").read_text(encoding="utf-8"))
periods = [*manifest["periods"], *archive_aerials.get("periods", [])]
milestones = manifest["milestones"]
archive_maps = manifest.get("archiveMaps", [])
aerial = manifest["aerialDiscovery"]
sources = [
    *json.loads((ROOT / "data/sources.json").read_text(encoding="utf-8"))["sources"],
    *archive_sources.get("sources", []),
]
coverage = json.loads((ROOT / "data/survey-coverage.geojson").read_text(encoding="utf-8"))

source_ids = {item["id"] for item in sources}
coverage_ids = {item["properties"]["coverage_id"] for item in coverage["features"]}
period_ids = [period["id"] for period in periods]

if len(periods) < 8:
    fail(f"Expected at least eight fixed map states, found {len(periods)}")
if len(set(period_ids)) != len(period_ids):
    fail("Fixed period IDs must be unique")
if set(period_ids) & {milestone["id"] for milestone in milestones}:
    fail("A date cannot be both a selectable map state and an unmapped milestone")

identities: list[str] = []
approximate_count = 0
for period in periods:
    overlay = period.get("overlay")
    if not isinstance(overlay, dict):
        fail(f"{period['id']}: selectable map state has no overlay")
    identity = overlay.get("identity")
    if not identity:
        fail(f"{period['id']}: overlay identity is required")
    identities.append(identity)
    overlay_type = overlay.get("type")
    if overlay_type not in {"xyz", "image", "modern-line"}:
        fail(f"{period['id']}: unsupported fixed overlay type {overlay_type}")
    if overlay_type == "image":
        approximate_count += 1
        if not overlay.get("adjustable") or not overlay.get("approximate"):
            fail(f"{period['id']}: image overlays must be explicitly adjustable and approximate")
        coordinates = overlay.get("coordinates")
        if not isinstance(coordinates, list) or len(coordinates) != 4:
            fail(f"{period['id']}: image overlay must contain four corner coordinates")
        image_url = str(overlay.get("url", ""))
        if not image_url.startswith("https://"):
            fail(f"{period['id']}: image overlay must load from a direct HTTPS image URL")
        if "floridamemory.com/fpc/" in image_url or "/.netlify/functions/historical-image" in image_url:
            fail(f"{period['id']}: blocked Florida Memory image proxy must not be used")
    for source_id in period.get("sourceIds", []):
        if source_id not in source_ids:
            fail(f"{period['id']}: unknown source {source_id}")
    if period.get("coverageId") and period["coverageId"] not in coverage_ids:
        fail(f"{period['id']}: unknown coverage {period['coverageId']}")

if approximate_count < 6:
    fail(f"Expected at least six experimental historical image overlays, found {approximate_count}")
if len(set(identities)) != len(identities):
    fail("Selectable fixed periods reuse the same overlay identity")

for milestone in milestones:
    for source_id in milestone.get("sourceIds", []):
        if source_id not in source_ids:
            fail(f"milestone {milestone['id']}: unknown source {source_id}")

archive_ids = [item.get("id") for item in archive_maps]
if len(set(archive_ids)) != len(archive_ids):
    fail("Archive map IDs must be unique")
for item in archive_maps:
    if item.get("sourceId") not in source_ids:
        fail(f"archive map {item.get('id')}: unknown source {item.get('sourceId')}")
    if item.get("periodId") and item["periodId"] not in period_ids:
        fail(f"archive map {item.get('id')}: unknown mapped period {item.get('periodId')}")

if aerial.get("sourceId") not in source_ids:
    fail("Aerial discovery references an unknown source")
catalog_services = aerial.get("catalogServices", [])
if len(catalog_services) < 3:
    fail("Aerial diagnostics must retain RGB, CIR, and single-band NOAA catalogs")
for catalog in catalog_services:
    if not str(catalog.get("service", "")).startswith("https://imagery.coast.noaa.gov/"):
        fail("Every aerial catalog must use an official NOAA imagery service")
if manifest.get("aerialBounds") != aerial.get("bounds"):
    fail("Aerial discovery bounds must match the Lower Keys manifest bounds")
if aerial.get("catalogProxy") != "/.netlify/functions/noaa-aerial-catalog":
    fail("Aerial diagnostics must use the same-origin Netlify proxy")

app = "\n".join(
    (ROOT / "assets" / name).read_text(encoding="utf-8")
    for name in ("app-core.js", "app-periods.js", "app-map.js", "app-init.js")
)
index = (ROOT / "index.html").read_text(encoding="utf-8")
contracts = {
    "refreshAerialPeriods": app,
    "LOWER_KEYS_BOUNDS": app,
    "APP_MAX_BOUNDS": app,
    'status: "legacy-only"': app,
    "archive-aerial-periods.json?v=20260723-7": app,
    "archive-sources.json?v=20260723-7": app,
    'overlay.type === "image"': app,
    "setCoordinates": app,
    "adjustAlignment": app,
    "alignment-controls": index,
    "retry-aerials": index,
    ">Lower Keys<": index,
    "Loading historical map states": index,
    "Early maps": index,
}
for required, haystack in contracts.items():
    if required not in haystack:
        fail(f"Missing app contract: {required}")

if "Checking available map evidence" in index:
    fail("The static page must not imply that NOAA blocks map startup")
if "fetchJsonCandidates" in app:
    fail("Production NOAA discovery must not fall back to a cross-origin browser request")
if "setTimeout(refreshAerialPeriods" in app:
    fail("NOAA live-mosaic diagnostics must not run automatically")
if "fit(period?.focusBounds" in app or "fit(period.focusBounds" in app:
    fail("Changing periods must not fit the camera to regional source extents")
if "function selectPeriod(index, updateUrl = true, refit = false)" not in app:
    fail("Period selection must preserve the current Lower Keys camera by default")
if "fit(LOWER_KEYS_BOUNDS, 0)" not in app:
    fail("Map startup must fit the Lower Keys viewport")
if (ROOT / "netlify/functions/historical-image.mjs").exists():
    fail("Blocked historical-image proxy must be removed")

noaa_proxy = ROOT / "netlify/functions/noaa-aerial-catalog.mjs"
if not noaa_proxy.exists():
    fail("NOAA aerial diagnostic function is missing")
noaa_proxy_text = noaa_proxy.read_text(encoding="utf-8")
for required in ("3Band_RGB_8Bit_Imagery", "3Band_CIR_8Bit_Imagery", "IR_Band_8Bit_Imagery", "Promise.allSettled"):
    if required not in noaa_proxy_text:
        fail(f"NOAA multi-catalog proxy contract missing: {required}")

print(
    "Smoke test passed: "
    f"{len(periods)} fixed states ({approximate_count} adjustable historical images), "
    "direct archival image URLs, NOAA live mosaics treated as a documented coverage gap, "
    f"{len(milestones)} unmapped milestones, {len(archive_maps)} archive records, {len(sources)} sources."
)
