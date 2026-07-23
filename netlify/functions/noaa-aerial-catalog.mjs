const SERVICES = [
  { id: "rgb8", label: "RGB 8-bit", priority: 1, url: "https://imagery.coast.noaa.gov/arcgis/rest/services/Imagery/3Band_RGB_8Bit_Imagery/ImageServer" },
  { id: "cir8", label: "color-infrared 8-bit", priority: 2, url: "https://imagery.coast.noaa.gov/arcgis/rest/services/Imagery/3Band_CIR_8Bit_Imagery/ImageServer" },
  { id: "ir8", label: "single-band infrared/grayscale 8-bit", priority: 3, url: "https://imagery.coast.noaa.gov/arcgis/rest/services/Imagery/IR_Band_8Bit_Imagery/ImageServer" },
];
const LIMITS = { west: -82.3, east: -80.8, south: 24.1, north: 25.1, yearMin: 1930, yearMax: 1980 };

function number(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function queryCatalog(service, params, signal) {
  const response = await fetch(`${service.url}/query?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`${service.label} returned HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.error) throw new Error(`${service.label}: ${payload.error.message || "ArcGIS error"}`);
  const features = (payload.features || []).map((feature) => ({
    ...feature,
    attributes: {
      ...(feature.attributes || {}),
      ServiceId: service.id,
      ServiceLabel: service.label,
      ServicePriority: service.priority,
      ServiceUrl: service.url,
    },
  }));
  return { id: service.id, label: service.label, count: features.length, features };
}

export default async (request) => {
  const url = new URL(request.url);
  const west = number(url.searchParams.get("west"), -82.15);
  const south = number(url.searchParams.get("south"), 24.30);
  const east = number(url.searchParams.get("east"), -80.95);
  const north = number(url.searchParams.get("north"), 24.90);
  const yearMin = number(url.searchParams.get("yearMin"), 1930);
  const yearMax = number(url.searchParams.get("yearMax"), 1980);

  const validBounds = west >= LIMITS.west && east <= LIMITS.east && south >= LIMITS.south && north <= LIMITS.north && west < east && south < north;
  const validYears = yearMin >= LIMITS.yearMin && yearMax <= LIMITS.yearMax && yearMin <= yearMax;
  if (!validBounds || !validYears) {
    return new Response(JSON.stringify({ error: "Query bounds or years are outside the permitted Lower Keys range." }), {
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
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const settled = await Promise.allSettled(SERVICES.map((service) => queryCatalog(service, params, controller.signal)));
    const catalogs = settled.map((result, index) => result.status === "fulfilled"
      ? { id: result.value.id, label: result.value.label, status: "ok", count: result.value.count }
      : { id: SERVICES[index].id, label: SERVICES[index].label, status: "error", count: 0, error: result.reason?.message || "request failed" });
    const features = settled.flatMap((result) => result.status === "fulfilled" ? result.value.features : []);
    const successes = catalogs.filter((catalog) => catalog.status === "ok").length;
    if (!successes) throw new Error(catalogs.map((catalog) => catalog.error).filter(Boolean).join("; ") || "All NOAA catalogs failed");
    return new Response(JSON.stringify({ features, catalogs, search: { west, south, east, north, yearMin, yearMax } }), {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    const message = error?.name === "AbortError" ? "NOAA catalog requests timed out" : error?.message || "NOAA catalog requests failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } finally {
    clearTimeout(timer);
  }
};
