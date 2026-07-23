#!/usr/bin/env python3
"""Check manifest links and the verified-map-state contract."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


manifest = json.loads((ROOT / "data/periods.json").read_text(encoding="utf-8"))
periods = manifest["periods"]
milestones = manifest["milestones"]
aerial = manifest["aerialDiscovery"]
sources = json.loads((ROOT / "data/sources.json").read_text(encoding="utf-8"))["sources"]
coverage = json.loads((ROOT / "data/survey-coverage.geojson").read_text(encoding="utf-8"))

source_ids = {item["id"] for item in sources}
coverage_ids = {item["properties"]["coverage_id"] for item in coverage["features"]}

if len(periods) < 2:
    fail(f"Expected at least two fixed map states, found {len(periods)}")

period_ids = [period["id"] for period in periods]
milestone_ids = [milestone["id"] for milestone in milestones]
if len(set(period_ids)) != len(period_ids):
    fail("Fixed period IDs must be unique")
if set(period_ids) & set(milestone_ids):
    fail("A date cannot be both a selectable map state and an unmapped milestone")

identities: list[str] = []
for period in periods:
    overlay = period.get("overlay")
    if not isinstance(overlay, dict):
        fail(f"{period['id']}: selectable map state has no overlay")
    identity = overlay.get("identity")
    if not identity:
        fail(f"{period['id']}: overlay identity is required")
    identities.append(identity)
    if overlay.get("type") not in {"xyz", "modern-line"}:
        fail(f"{period['id']}: unsupported fixed overlay type {overlay.get('type')}")
    for source_id in period.get("sourceIds", []):
        if source_id not in source_ids:
            fail(f"{period['id']}: unknown source {source_id}")
    if period.get("coverageId") and period["coverageId"] not in coverage_ids:
        fail(f"{period['id']}: unknown coverage {period['coverageId']}")

if len(set(identities)) != len(identities):
    fail("Selectable fixed periods reuse the same overlay identity")

for milestone in milestones:
    for source_id in milestone.get("sourceIds", []):
        if source_id not in source_ids:
            fail(f"milestone {milestone['id']}: unknown source {source_id}")

if aerial.get("sourceId") not in source_ids:
    fail("Aerial discovery references an unknown source")
if not str(aerial.get("service", "")).startswith("https://imagery.coast.noaa.gov/"):
    fail("Aerial discovery must use the official NOAA imagery service")
if aerial.get("yearMin") >= aerial.get("yearMax"):
    fail("Aerial discovery year range is invalid")
if not aerial.get("identityPrefix"):
    fail("Aerial discovery identity prefix is required")

app = (ROOT / "assets/app.js").read_text(encoding="utf-8")
utils = (ROOT / "assets/period-utils.js").read_text(encoding="utf-8")
index = (ROOT / "index.html").read_text(encoding="utf-8")
contracts = {
    "discoverAerialPeriods": app,
    "esriMosaicLockRaster": utils,
    "arcgis-image": app,
    "buildArcGisExportUrl": app,
    "enforceDistinctMapStates": utils,
    "period-utils.js": index,
    "CUSP_QUERY_URL": app,
    "verified map state": index.lower(),
    "milestone-list": index,
    "focus-trumbo": index,
}
for required, haystack in contracts.items():
    if required not in haystack:
        fail(f"Missing app contract: {required}")

print(
    "Smoke test passed: "
    f"{len(periods)} fixed map states, dynamic NOAA aerial discovery, "
    f"{len(milestones)} unmapped milestones, {len(sources)} sources, "
    f"{len(coverage['features'])} survey footprints."
)
