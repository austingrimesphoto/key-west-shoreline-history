"use strict";

function configureTabs() {
  document.querySelectorAll('[role="tab"]').forEach((tab) => tab.addEventListener("click", () => activateTab(tab.id)));
}

function configureControls() {
  $("period-slider").addEventListener("input", (event) => selectPeriod(Number(event.target.value)));
  $("toggle-evidence").addEventListener("change", updateLayerVisibility);
  $("toggle-modern-shoreline").addEventListener("change", updateLayerVisibility);
  $("toggle-coverage").addEventListener("change", updateLayerVisibility);
  $("evidence-opacity").addEventListener("input", (event) => setEvidenceOpacity(event.target.value));
  const retryAerials = $("retry-aerials");
  if (retryAerials) retryAerials.hidden = true;
  document.querySelectorAll("[data-align-action]").forEach((button) => button.addEventListener("click", () => adjustAlignment(button.dataset.alignAction)));
  $("reset-view").addEventListener("click", () => fit(LOWER_KEYS_BOUNDS));
  $("focus-trumbo").addEventListener("click", () => fit(TRUMBO_BOUNDS));
  const dialog = $("about-dialog");
  $("open-about").addEventListener("click", () => dialog.showModal());
  $("close-about").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  window.addEventListener("keydown", (event) => {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "BUTTON") return;
    if (event.key === "ArrowLeft") selectPeriod(state.index - 1);
    if (event.key === "ArrowRight") selectPeriod(state.index + 1);
  });
}

async function initializeData() {
  try {
    $("availability-note").textContent = "Loading locally stored historical map states…";
    const [manifest, sources, coverage, archiveAerials, urbanMaps, archiveSources] = await Promise.all([
      fetchJson("./data/periods.json?v=20260723-8"),
      fetchJson("./data/sources.json?v=20260723-8"),
      fetchJson("./data/survey-coverage.geojson?v=20260723-8"),
      fetchJson("./data/archive-aerial-periods.json?v=20260723-8"),
      fetchJson("./data/urban-map-periods.json?v=20260723-8"),
      fetchJson("./data/archive-sources.json?v=20260723-8"),
    ]);
    manifest.periods = [
      ...manifest.periods,
      ...(urbanMaps.periods || []),
      ...(archiveAerials.periods || []),
    ];
    state.manifest = manifest;
    state.sources = [...sources.sources, ...(archiveSources.sources || [])];
    state.coverage = coverage;
    state.aerialDiscovery = { status: "legacy-only", years: 0, frames: 0 };
    buildSourceCatalog();
    buildMilestones();
    buildArchiveMaps();
    rebuildPeriods();
    buildTimeline();
    const requested = new URL(window.location.href).searchParams.get("period");
    const requestedIndex = state.periods.findIndex((period) => period.id === requested);
    selectPeriod(requestedIndex >= 0 ? requestedIndex : 0, false, false);
  } catch (error) {
    $("period-title").textContent = "Project manifest unavailable";
    $("period-summary").textContent = error.message;
    showMapMessage(error.message);
    throw error;
  }
}

function startMap(dataReady) {
  if (!window.maplibregl) {
    $("overlay-status").textContent = "Map engine unavailable";
    $("data-note").textContent = "The historical catalog loaded, but the external MapLibre library did not.";
    showMapMessage("The map engine could not load. The historical catalog remains available in the sidebar.");
    return;
  }
  map = new maplibregl.Map({
    container: "map",
    style: BASE_STYLE,
    center: [-81.7736, 24.5557],
    zoom: 12,
    minZoom: 2,
    maxZoom: 18,
    maxBounds: APP_MAX_BOUNDS,
    attributionControl: true,
    maplibreLogo: true,
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  map.addControl(new maplibregl.FullscreenControl(), "top-right");
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "imperial" }), "bottom-right");
  map.on("load", async () => {
    state.mapReady = true;
    try { await dataReady; } catch { return; }
    if (!state.manifest || !state.coverage) return;
    installBaseLayers();
    renderPeriod();
    fit(LOWER_KEYS_BOUNDS, 0);
    installCuspLayer();
  });
  map.on("error", (event) => {
    const message = event?.error?.message || "";
    if (message && !message.includes("Failed to fetch")) showMapMessage(message);
  });
}

configureTabs();
configureControls();
const dataReady = initializeData();
startMap(dataReady);
