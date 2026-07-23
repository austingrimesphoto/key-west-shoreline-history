#!/usr/bin/env python3
"""Check manifest links and critical app contracts."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


periods = json.loads((ROOT / "data/periods.json").read_text(encoding="utf-8"))["periods"]
sources = json.loads((ROOT / "data/sources.json").read_text(encoding="utf-8"))["sources"]
coverage = json.loads((ROOT / "data/survey-coverage.geojson").read_text(encoding="utf-8"))

source_ids = {item["id"] for item in sources}
coverage_ids = {item["properties"]["coverage_id"] for item in coverage["features"]}

if len(periods) != 8:
    fail(f"Expected 8 periods, found {len(periods)}")

for period in periods:
    for source_id in period["sourceIds"]:
        if source_id not in source_ids:
            fail(f"{period['id']}: unknown source {source_id}")
    if period.get("coverageId") and period["coverageId"] not in coverage_ids:
        fail(f"{period['id']}: unknown coverage {period['coverageId']}")
    for path in period["layers"].values():
        local = ROOT / path.removeprefix("./")
        if not local.exists():
            fail(f"{period['id']}: missing layer {local}")

app = (ROOT / "assets/app.js").read_text(encoding="utf-8")
index = (ROOT / "index.html").read_text(encoding="utf-8")
period_text = (ROOT / "data/periods.json").read_text(encoding="utf-8")
contracts = {
    "CUSP_QUERY_URL": app,
    "survey-coverage": app,
    "warper.wmflabs.org": period_text,
    "focus-trumbo": index,
}
for required, haystack in contracts.items():
    if required not in haystack:
        fail(f"Missing app contract: {required}")

print(f"Smoke test passed: {len(periods)} periods, {len(sources)} sources, {len(coverage['features'])} survey footprints.")
