"use strict";

function installGeoJsonSource(id, data) {
  const existing = map.getSource(id);
  if (existing) existing.setData(data);
  else map.addSource(id, { type: "geojson", data });
}

function addLayerIfMissing(layer, beforeId) {
  if (!map.getLayer(layer.id)) map.addLayer(layer, beforeId);
}

function installBaseLayers() {
  installGeoJsonSource("survey-coverage", state.coverage);
  addLayerIfMissing({ id: "survey-coverage-fill", type: "fill", source: "survey-coverage", paint: { "fill-color": "#0f5d6c", "fill-opacity": 0.1 }, filter: ["==", ["get", "coverage_id"], "__none__"] });
  addLayerIfMissing({ id: "survey-coverage-line", type: "line", source: "survey-coverage", paint: { "line-color": "#0f5d6c", "line-width": 2.4, "line-dasharray": [2, 1.5] }, filter: ["==", ["get", "coverage_id"], "__none__"] });
}

async function installCuspLayer() {
  $("cusp-status").textContent = "Loading…";
  try {
    const geojson = await fetchJson(CUSP_QUERY_URL, { timeoutMs: 12000 });
    installGeoJsonSource("modern-cusp", geojson);
    addLayerIfMissing({ id: "modern-cusp-line", type: "line", source: "modern-cusp", paint: { "line-color": "#006de6", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.2, 15, 3], "line-opacity": 0.9 } });
    state.cuspLoaded = true;
    $("cusp-status").textContent = `${geojson.features?.length || 0} segments`;
  } catch {
    state.cuspLoaded = false;
    $("cusp-status").textContent = "Unavailable";
  }
  updateLayerVisibility();
}

function removeActiveEvidence() {
  if (!state.activeEvidence) return;
  if (map.getLayer(state.activeEvidence.layerId)) map.removeLayer(state.activeEvidence.layerId);
  if (map.getSource(state.activeEvidence.sourceId)) map.removeSource(state.activeEvidence.sourceId);
  state.activeEvidence = null;
}

function evidenceLayerIds(identity) {
  const safe = identity.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  return { sourceId: `evidence-source-${safe}`, layerId: `evidence-layer-${safe}` };
}

function alignmentKey(identity) {
  return `key-west-map-alignment:${identity}`;
}

function alignmentFor(overlay) {
  if (!state.alignment[overlay.identity]) {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(alignmentKey(overlay.identity))); } catch { /* ignore */ }
    state.alignment[overlay.identity] = {
      dx: Number(saved?.dx) || 0,
      dy: Number(saved?.dy) || 0,
      scale: Number(saved?.scale) || 1,
      rotation: Number(saved?.rotation) || 0,
    };
  }
  return state.alignment[overlay.identity];
}

function transformedCoordinates(overlay) {
  const transform = alignmentFor(overlay);
  const coordinates = overlay.coordinates.map(([lng, lat]) => [Number(lng), Number(lat)]);
  const centerLng = coordinates.reduce((sum, point) => sum + point[0], 0) / coordinates.length;
  const centerLat = coordinates.reduce((sum, point) => sum + point[1], 0) / coordinates.length;
  const radians = transform.rotation * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const latitudeScale = Math.cos(centerLat * Math.PI / 180) || 1;
  return coordinates.map(([lng, lat]) => {
    const x = (lng - centerLng) * latitudeScale * transform.scale;
    const y = (lat - centerLat) * transform.scale;
    const xr = x * cos - y * sin;
    const yr = x * sin + y * cos;
    return [centerLng + xr / latitudeScale + transform.dx, centerLat + yr + transform.dy];
  });
}

function preloadImageOverlay(url, timeoutMs = 20000) {
  if (state.loadedImageUrls.has(url)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = window.setTimeout(() => {
      image.src = "";
      reject(new Error("image request timed out"));
    }, timeoutMs);
    const finish = (callback) => {
      window.clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      callback();
    };
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => finish(async () => {
      try { if (image.decode) await image.decode(); } catch { /* the load event already verified the image */ }
      state.loadedImageUrls.add(url);
      resolve();
    });
    image.onerror = () => finish(() => reject(new Error("image host returned a browser load failure")));
    image.src = url;
  });
}

async function installEvidenceOverlay(overlay, generation) {
  if (!overlay || overlay.type === "modern-line") {
    if (generation === state.overlayLoadGeneration) removeActiveEvidence();
    return true;
  }

  if (overlay.type === "image") {
    $("overlay-status").textContent = `Loading ${overlay.title}…`;
    await preloadImageOverlay(overlay.url);
    if (generation !== state.overlayLoadGeneration) return false;
  }

  if (generation !== state.overlayLoadGeneration) return false;
  removeActiveEvidence();
  const ids = evidenceLayerIds(overlay.identity);
  const beforeId = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
  if (overlay.type === "xyz") {
    map.addSource(ids.sourceId, { type: "raster", tiles: overlay.tiles, tileSize: overlay.tileSize || 256, minzoom: overlay.minzoom || 0, maxzoom: overlay.maxzoom || 22, attribution: overlay.attribution || "" });
  } else if (overlay.type === "arcgis-image") {
    const [west, south, east, north] = overlay.bbox;
    map.addSource(ids.sourceId, { type: "image", url: periodUtils.buildArcGisExportUrl(overlay), coordinates: [[west, north], [east, north], [east, south], [west, south]] });
  } else if (overlay.type === "image") {
    map.addSource(ids.sourceId, { type: "image", url: overlay.url, coordinates: transformedCoordinates(overlay) });
  } else {
    throw new Error(`Unsupported evidence overlay type: ${overlay.type}`);
  }
  map.addLayer({ id: ids.layerId, type: "raster", source: ids.sourceId, paint: { "raster-opacity": Number($("evidence-opacity").value) / 100, "raster-fade-duration": 0, "raster-resampling": "linear" } }, beforeId);
  state.activeEvidence = { ...ids, identity: overlay.identity, type: overlay.type };
  $("overlay-status").textContent = overlay.title;
  return true;
}

function setLayerVisibility(layerId, visible) {
  if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
}

function updateLayerVisibility() {
  if (!state.mapReady || !state.periods.length) return;
  const period = state.periods[state.index];
  const evidenceVisible = $("toggle-evidence").checked;
  const modernVisible = period.kind === "modern" ? evidenceVisible : $("toggle-modern-shoreline").checked;
  if (state.activeEvidence) setLayerVisibility(state.activeEvidence.layerId, evidenceVisible);
  setLayerVisibility("modern-cusp-line", modernVisible);
  setLayerVisibility("survey-coverage-fill", $("toggle-coverage").checked);
  setLayerVisibility("survey-coverage-line", $("toggle-coverage").checked);
}

function setEvidenceOpacity(value) {
  const opacity = Number(value) / 100;
  $("evidence-opacity-output").textContent = `${Math.round(opacity * 100)}%`;
  if (state.activeEvidence && map.getLayer(state.activeEvidence.layerId)) map.setPaintProperty(state.activeEvidence.layerId, "raster-opacity", opacity);
  const period = state.periods[state.index];
  if (period?.kind === "modern" && map.getLayer("modern-cusp-line")) map.setPaintProperty("modern-cusp-line", "line-opacity", opacity);
}

function updateCoverageFilter(period) {
  const filter = period.coverageId ? ["==", ["get", "coverage_id"], period.coverageId] : ["==", ["get", "coverage_id"], "__none__"];
  if (map.getLayer("survey-coverage-fill")) map.setFilter("survey-coverage-fill", filter);
  if (map.getLayer("survey-coverage-line")) map.setFilter("survey-coverage-line", filter);
}

function alignmentSummary(overlay) {
  const value = alignmentFor(overlay);
  $("alignment-status").textContent = `Shift ${value.dx.toFixed(2)}°, ${value.dy.toFixed(2)}° · Scale ${value.scale.toFixed(3)} · Rotate ${value.rotation.toFixed(1)}°`;
}

function updateEvidenceControls(period) {
  const overlay = period.overlay;
  const hasRaster = overlay.type !== "modern-line";
  $("toggle-evidence").disabled = false;
  $("evidence-opacity").disabled = false;
  $("evidence-label").textContent = period.kind === "modern" ? "Selected modern shoreline evidence" : "Selected historical evidence overlay";
  $("evidence-opacity-label").textContent = hasRaster ? "Evidence opacity" : "Shoreline opacity";
  const opacity = Math.round((overlay.defaultOpacity ?? 0.75) * 100);
  $("evidence-opacity").value = String(opacity);
  $("evidence-opacity-output").textContent = `${opacity}%`;
  $("toggle-modern-shoreline").disabled = period.kind === "modern";
  $("alignment-controls").hidden = !overlay.adjustable;
  if (overlay.adjustable) alignmentSummary(overlay);
}

function adjustAlignment(action) {
  const period = state.periods[state.index];
  const overlay = period?.overlay;
  if (!overlay?.adjustable) return;
  const transform = alignmentFor(overlay);
  const lngs = overlay.coordinates.map((point) => point[0]);
  const lats = overlay.coordinates.map((point) => point[1]);
  const stepX = (Math.max(...lngs) - Math.min(...lngs)) * 0.015;
  const stepY = (Math.max(...lats) - Math.min(...lats)) * 0.015;
  if (action === "left") transform.dx -= stepX;
  if (action === "right") transform.dx += stepX;
  if (action === "up") transform.dy += stepY;
  if (action === "down") transform.dy -= stepY;
  if (action === "larger") transform.scale *= 1.025;
  if (action === "smaller") transform.scale /= 1.025;
  if (action === "rotate-left") transform.rotation -= 0.5;
  if (action === "rotate-right") transform.rotation += 0.5;
  if (action === "reset") Object.assign(transform, { dx: 0, dy: 0, scale: 1, rotation: 0 });
  localStorage.setItem(alignmentKey(overlay.identity), JSON.stringify(transform));
  const source = state.activeEvidence && map.getSource(state.activeEvidence.sourceId);
  if (source?.setCoordinates) source.setCoordinates(transformedCoordinates(overlay));
  alignmentSummary(overlay);
}

function renderPeriodText(period) {
  $("period-kicker").textContent = period.kicker;
  $("period-title").textContent = period.title;
  $("period-summary").textContent = period.summary;
  $("period-confidence").textContent = period.confidenceLabel;
  $("data-status").textContent = period.dataStatus;
  $("overlay-status").textContent = period.overlay.title;
  $("evidence-count").textContent = String(period.evidenceCount || 1);
  $("period-highlights").replaceChildren(...period.highlights.map((text) => { const item = document.createElement("li"); item.textContent = text; return item; }));
  renderSourceLinks($("period-sources"), period.sourceIds);
  let note = "This map state uses a unique source and is not a relabeled copy of another date.";
  if (period.kind === "approximate-map") note = "Experimental alignment: useful for visual exploration, but not suitable for measuring historical shoreline position.";
  if (period.kind === "aerial") note = `NOAA catalog rasters are locked to ${period.shortLabel}; NOAA describes the imagery as georeferenced but not orthorectified.`;
  if (period.kind === "modern") note = "This is the modern shoreline reference, not a historical overlay.";
  $("data-note").textContent = note;
}

async function renderPeriod() {
  if (!state.periods.length) return;
  const period = state.periods[state.index];
  const generation = ++state.overlayLoadGeneration;
  renderPeriodText(period);
  updateEvidenceControls(period);
  if (!state.mapReady) return;
  clearMapMessage();
  try {
    const installed = await installEvidenceOverlay(period.overlay, generation);
    if (!installed || generation !== state.overlayLoadGeneration) return;
    updateCoverageFilter(period);
    setEvidenceOpacity($("evidence-opacity").value);
    updateLayerVisibility();
  } catch (error) {
    if (generation !== state.overlayLoadGeneration) return;
    $("overlay-status").textContent = "Image unavailable";
    showMapMessage(`The ${period.shortLabel} evidence image could not be loaded. ${error.message}. The previous map remains visible.`);
  }
}
