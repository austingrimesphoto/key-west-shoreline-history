(function exposePeriodUtils(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.KeyWestPeriodUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createPeriodUtils() {
  "use strict";

  function groupAerialAttributes(features, config) {
    const groups = new Map();
    for (const feature of features || []) {
      const attributes = feature?.attributes || {};
      if (attributes.Year === null || attributes.Year === undefined || attributes.Year === "") continue;
      if (attributes.OBJECTID === null || attributes.OBJECTID === undefined || attributes.OBJECTID === "") continue;
      const year = Number(attributes.Year);
      const objectId = Number(attributes.OBJECTID);
      if (!Number.isInteger(year) || year < config.yearMin || year > config.yearMax) continue;
      if (!Number.isInteger(objectId) || objectId <= 0) continue;
      if (!groups.has(year)) groups.set(year, []);
      groups.get(year).push({ ...attributes, OBJECTID: objectId, Year: year });
    }
    return [...groups.entries()].sort(([a], [b]) => a - b);
  }

  function buildAerialQueryUrl(config, bbox) {
    if (!config?.service || !Array.isArray(bbox) || bbox.length !== 4) {
      throw new Error("Aerial discovery is missing its service or study bounds.");
    }
    const params = new URLSearchParams({
      where: config.queryWhere,
      geometry: bbox.join(","),
      geometryType: "esriGeometryEnvelope",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields: config.outFields,
      returnGeometry: "false",
      resultRecordCount: "1000",
      f: "json",
    });
    return `${config.service}/query?${params.toString()}`;
  }

  function enforceDistinctMapStates(periods) {
    const seen = new Set();
    return (periods || []).filter((period) => {
      const identity = period?.overlay?.identity;
      if (!identity || seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
  }

  function buildArcGisExportUrl(overlay) {
    if (!overlay?.service || !Array.isArray(overlay.bbox) || overlay.bbox.length !== 4) {
      throw new Error("ArcGIS image overlay is missing its service or bounding box.");
    }
    if (!Array.isArray(overlay.rasterIds) || overlay.rasterIds.length === 0) {
      throw new Error("ArcGIS image overlay has no locked raster IDs.");
    }
    const [west, south, east, north] = overlay.bbox;
    const mosaicRule = {
      mosaicMethod: "esriMosaicLockRaster",
      lockRasterIds: overlay.rasterIds,
      ascending: true,
      mosaicOperation: "MT_FIRST",
    };
    const size = Array.isArray(overlay.imageSize) && overlay.imageSize.length === 2
      ? overlay.imageSize
      : [2400, 1800];
    const params = new URLSearchParams({
      bbox: [west, south, east, north].join(","),
      bboxSR: "4326",
      imageSR: "4326",
      size: size.join(","),
      format: "jpgpng",
      transparent: "true",
      interpolation: "RSP_BilinearInterpolation",
      mosaicRule: JSON.stringify(mosaicRule),
      validateExtent: "true",
      f: "image",
    });
    return `${overlay.service}/exportImage?${params.toString()}`;
  }

  return { groupAerialAttributes, buildAerialQueryUrl, enforceDistinctMapStates, buildArcGisExportUrl };
});
