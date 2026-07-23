const SERVICE = "https://imagery.coast.noaa.gov/arcgis/rest/services/Imagery/3Band_RGB_8Bit_Imagery/ImageServer/query";
const LIMITS = { west: -82.2, east: -81.2, south: 24.2, north: 25.0, yearMin: 1930, yearMax: 1980 };

function number(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default async (request) => {
  const url = new URL(request.url);
  const west = number(url.searchParams.get("west"), -81.825);
  const south = number(url.searchParams.get("south"), 24.525);
  const east = number(url.searchParams.get("east"), -81.69);
  const north = number(url.searchParams.get("north"), 24.615);
  const yearMin = number(url.searchParams.get("yearMin"), 1944);
  const yearMax = number(url.searchParams.get("yearMax"), 1969);

  const validBounds = west >= LIMITS.west && east <= LIMITS.east && south >= LIMITS.south && north <= LIMITS.north && west < east && south < north;
  const validYears = yearMin >= LIMITS.yearMin && yearMax <= LIMITS.yearMax && yearMin <= yearMax;
  if (!validBounds || !validYears) {
    return new Response(JSON.stringify({ error: "Query bounds or years are outside the permitted Key West range." }), {
      status: 400,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }

  const params = new URLSearchParams({
    where: `Category = 1 AND Year >= ${Math.trunc(yearMin)} AND Year <= ${Math.trunc(yearMax)}`,
    geometry: [west, south, east, north].join(","),
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "OBJECTID,Name,Mission,Year,Metalink,Resolution,Sensor,Horizontal_Accuracy,TideControlled",
    returnGeometry: "false",
    resultRecordCount: "1000",
    f: "json",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`${SERVICE}?${params.toString()}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
    const payload = await response.json();
    if (payload?.error) throw new Error(payload.error.message || "NOAA returned an ArcGIS error");
    return new Response(JSON.stringify({ features: payload.features || [] }), {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    const message = error?.name === "AbortError" ? "NOAA catalog request timed out" : error?.message || "NOAA catalog request failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } finally {
    clearTimeout(timer);
  }
};
