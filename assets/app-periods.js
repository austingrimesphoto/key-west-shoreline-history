"use strict";

function aerialPeriodFromGroup(year, records, config) {
  const byService = new Map();
  for (const record of records) {
    const service = record.ServiceUrl || config.service;
    if (!service) continue;
    if (!byService.has(service)) byService.set(service, []);
    byService.get(service).push(record);
  }
  const candidates = [...byService.entries()].map(([service, serviceRecords]) => ({
    service,
    records: serviceRecords,
    priority: Math.min(...serviceRecords.map((record) => Number(record.ServicePriority) || 99)),
    label: serviceRecords.find((record) => record.ServiceLabel)?.ServiceLabel || "NOAA imagery",
    id: serviceRecords.find((record) => record.ServiceId)?.ServiceId || "imagery",
  })).sort((a, b) => b.records.length - a.records.length || a.priority - b.priority);
  const selected = candidates[0];
  if (!selected) return null;
  const objectIds = [...new Set(selected.records.map((record) => Number(record.OBJECTID)).filter(Number.isFinite))]
    .slice(0, config.maxRasterIdsPerYear);
  const missions = [...new Set(selected.records.map((record) => record.Mission).filter((value) => value !== null && value !== undefined))];
  const sensors = [...new Set(selected.records.map((record) => record.Sensor).filter(Boolean))];
  const resolutions = selected.records.map((record) => Number(record.Resolution)).filter((value) => Number.isFinite(value) && value > 0);
  const resolutionText = resolutions.length
    ? `${Math.min(...resolutions).toFixed(2)}–${Math.max(...resolutions).toFixed(2)} m listed resolution`
    : "Resolution varies by frame";
  const bbox = config.bounds || state.manifest.aerialBounds || state.manifest.studyBounds;
  return {
    id: `aerial-${year}`,
    shortLabel: String(year),
    sortYear: year,
    kind: "aerial",
    kicker: "NOAA georeferenced historical aerial imagery",
    title: `${year} aerial coverage of the Lower Keys`,
    summary: `NOAA returned ${objectIds.length} ${selected.label} historical aerial frame${objectIds.length === 1 ? "" : "s"} from ${year} intersecting the Lower Keys search area.`,
    confidenceLabel: "Georeferenced aerial",
    dataStatus: `${objectIds.length} NOAA frame${objectIds.length === 1 ? "" : "s"}`,
    evidenceCount: objectIds.length,
    highlights: [
      `Selected NOAA catalog: ${selected.label}.`,
      missions.length ? `Catalog mission identifiers: ${missions.join(", ")}.` : "NOAA catalog mission metadata is incomplete for these frames.",
      sensors.length ? `Sensors represented: ${sensors.join(", ")}.` : "Sensor metadata is not listed for every frame.",
      `${resolutionText}. NOAA warns that these photographs are georeferenced but not orthorectified.`,
    ],
    sourceIds: [config.sourceId],
    focusBounds: LOWER_KEYS_BOUNDS,
    overlay: {
      type: "arcgis-image",
      identity: `${config.identityPrefix}-${year}-${selected.id}`,
      title: `${year} NOAA ${selected.label} aerial mosaic`,
      service: selected.service,
      rasterIds: objectIds,
      bbox,
      imageSize: config.imageSize,
      attribution: `NOAA historical aerial imagery, ${year} (${selected.label})`,
      defaultOpacity: 0.78,
    },
  };
}

async function discoverAerialPeriods(config) {
  const endpoint = aerialProxyUrl(config);
  if (!endpoint) throw new Error("The NOAA proxy is not configured for this deployment.");
  const data = await fetchJson(endpoint, { timeoutMs: 7000, cache: "no-cache" });
  const periods = periodUtils.groupAerialAttributes(data.features || [], config)
    .map(([year, records]) => aerialPeriodFromGroup(year, records, config))
    .filter((period) => period && period.overlay.rasterIds.length > 0);
  return periods;
}

function periodSortValue(period) {
  if (Number.isFinite(period.sortYear)) return period.sortYear;
  const parsed = Number.parseInt(period.id, 10);
  return Number.isFinite(parsed) ? parsed : 9999;
}

function rebuildPeriods() {
  state.periods = periodUtils.enforceDistinctMapStates(
    [...state.manifest.periods, ...state.aerialPeriods].sort((a, b) => periodSortValue(a) - periodSortValue(b)),
  );
}

async function refreshAerialPeriods() {
  if (state.aerialDiscovery.status === "checking") return;
  const selectedId = state.periods[state.index]?.id;
  state.aerialDiscovery = { status: "checking", years: 0, frames: 0 };
  buildTimeline();
  try {
    const discovered = await discoverAerialPeriods(state.manifest.aerialDiscovery);
    state.aerialPeriods = discovered;
    state.aerialDiscovery = discovered.length
      ? { status: "loaded", years: discovered.length, frames: discovered.reduce((sum, period) => sum + period.evidenceCount, 0) }
      : { status: "empty", years: 0, frames: 0 };
  } catch (error) {
    state.aerialPeriods = [];
    state.aerialDiscovery = {
      status: "unavailable",
      years: 0,
      frames: 0,
      error: error?.name === "AbortError" ? "The NOAA catalog request timed out." : error.message,
    };
  } finally {
    rebuildPeriods();
    buildTimeline();
    const nextIndex = state.periods.findIndex((period) => period.id === selectedId);
    selectPeriod(nextIndex >= 0 ? nextIndex : 0, false, false);
  }
}

function buildTimeline() {
  const slider = $("period-slider");
  slider.max = String(Math.max(0, state.periods.length - 1));
  slider.disabled = state.periods.length < 2;
  $("timeline-labels").innerHTML = state.periods.length
    ? `<span>${escapeHtml(state.periods[0].shortLabel)}</span><span>${escapeHtml(state.periods.at(-1).shortLabel)}</span>`
    : "";
  $("period-buttons").replaceChildren(...state.periods.map((period, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "period-button";
    button.textContent = period.shortLabel;
    button.setAttribute("aria-label", `Show ${period.title}`);
    button.addEventListener("click", () => selectPeriod(index));
    return button;
  }));

  const note = $("availability-note");
  const status = $("aerial-status");
  const retry = $("retry-aerials");
  if (state.aerialDiscovery.status === "legacy-only") {
    note.textContent = "NOAA's live Digital Coast mosaics contain no Lower Keys catalog frames for 1930–1980. The timeline now uses dated Florida archival aerial photographs; legacy NOAA film holdings are indexed separately through APOS and NARA.";
    status.textContent = "No live mosaic coverage";
    retry.hidden = true;
  } else if (state.aerialDiscovery.status === "loaded") {
    note.textContent = `${state.aerialDiscovery.years} NOAA aerial years were verified (${state.aerialDiscovery.frames} catalog frames).`;
    status.textContent = `${state.aerialDiscovery.years} years loaded`;
    retry.hidden = false;
    retry.disabled = false;
    retry.textContent = "Refresh NOAA aerials";
  } else if (state.aerialDiscovery.status === "checking") {
    note.textContent = "The local historical maps are ready. NOAA is being checked for up to seven seconds.";
    status.textContent = "Checking (7-second limit)";
    retry.hidden = false;
    retry.disabled = true;
  } else if (state.aerialDiscovery.status === "empty") {
    note.textContent = "NOAA's live imagery mosaics returned no historical Lower Keys frames. Dated Florida archival aerials remain available in the timeline.";
    status.textContent = "No matching frames";
    retry.hidden = false;
    retry.disabled = false;
    retry.textContent = "Check NOAA again";
  } else if (state.aerialDiscovery.status === "unavailable") {
    note.textContent = `NOAA aerial discovery is unavailable: ${state.aerialDiscovery.error || "request failed"}. All local map states remain usable.`;
    status.textContent = "Unavailable";
    retry.hidden = false;
    retry.disabled = false;
    retry.textContent = "Retry NOAA";
  } else {
    note.textContent = "Historical overlays are loaded locally. NOAA aerial discovery is optional.";
    status.textContent = "Not checked";
    retry.hidden = false;
    retry.disabled = false;
    retry.textContent = "Check NOAA aerials";
  }
  updatePeriodButtons();
}

function updatePeriodButtons() {
  document.querySelectorAll(".period-button").forEach((button, index) => {
    const active = index === state.index;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "true" : "false");
  });
}

function selectPeriod(index, updateUrl = true, refit = false) {
  state.index = Math.max(0, Math.min(index, state.periods.length - 1));
  $("period-slider").value = String(state.index);
  updatePeriodButtons();
  const period = state.periods[state.index];
  if (updateUrl && period) {
    const url = new URL(window.location.href);
    url.searchParams.set("period", period.id);
    history.replaceState({}, "", url);
  }
  renderPeriod();
  if (refit && state.mapReady) fit(LOWER_KEYS_BOUNDS);
}
