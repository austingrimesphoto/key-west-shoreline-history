import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const utils = require("../assets/period-utils.js");

const config = { yearMin: 1944, yearMax: 1969 };
const groups = utils.groupAerialAttributes([
  { attributes: { OBJECTID: 17, Year: 1957, Mission: 1 } },
  { attributes: { OBJECTID: 18, Year: 1957, Mission: 1 } },
  { attributes: { OBJECTID: 40, Year: 1965, Mission: 2 } },
  { attributes: { OBJECTID: 99, Year: 1972 } },
  { attributes: { OBJECTID: null, Year: 1960 } },
], config);
assert.deepEqual(groups.map(([year]) => year), [1957, 1965]);
assert.deepEqual(groups[0][1].map((record) => record.OBJECTID), [17, 18]);

const queryUrl = utils.buildAerialQueryUrl({
  service: "https://imagery.coast.noaa.gov/example/ImageServer",
  queryWhere: "Category = 1 AND Year >= 1944 AND Year <= 1969",
  outFields: "OBJECTID,Year",
}, [-81.825, 24.525, -81.690, 24.615]);
const query = new URL(queryUrl);
assert.equal(query.pathname.endsWith("/query"), true);
assert.equal(query.searchParams.get("geometry"), "-81.825,24.525,-81.69,24.615");
assert.equal(query.searchParams.get("geometryType"), "esriGeometryEnvelope");
assert.equal(query.searchParams.get("inSR"), "4326");
assert.equal(query.searchParams.get("returnGeometry"), "false");
assert.match(query.searchParams.get("where"), /Year >= 1944/);

const distinct = utils.enforceDistinctMapStates([
  { id: "1907", overlay: { identity: "chart-1907" } },
  { id: "fake-1912", overlay: { identity: "chart-1907" } },
  { id: "1957", overlay: { identity: "aerial-1957" } },
  { id: "missing" },
]);
assert.deepEqual(distinct.map((period) => period.id), ["1907", "1957"]);

const exportUrl = utils.buildArcGisExportUrl({
  service: "https://imagery.example.test/ImageServer",
  bbox: [-81.825, 24.525, -81.690, 24.615],
  rasterIds: [17, 18],
  imageSize: [2400, 1800],
});
const parsed = new URL(exportUrl);
assert.equal(parsed.pathname.endsWith("/exportImage"), true);
assert.equal(parsed.searchParams.get("bbox"), "-81.825,24.525,-81.69,24.615");
assert.equal(parsed.searchParams.get("f"), "image");
const rule = JSON.parse(parsed.searchParams.get("mosaicRule"));
assert.equal(rule.mosaicMethod, "esriMosaicLockRaster");
assert.deepEqual(rule.lockRasterIds, [17, 18]);

assert.throws(() => utils.buildArcGisExportUrl({ service: "x", bbox: [1, 2, 3, 4], rasterIds: [] }));

console.log("Period utility tests passed.");
