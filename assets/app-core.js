"use strict";

const $ = (id) => document.getElementById(id);
const periodUtils = window.KeyWestPeriodUtils;
if (!periodUtils) throw new Error("Period utilities failed to load.");

const TRUMBO_BOUNDS = [[-81.814, 24.543], [-81.770, 24.571]];
const LOWER_KEYS_BOUNDS = [[-82.15, 24.30], [-80.95, 24.90]];
const APP_MAX_BOUNDS = [[-105, 4], [-55, 36.5]];
const BASE_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const CUSP_QUERY_URL =
  "https://services.arcgis.com/rD2ylXRs80UroD90/ArcGIS/rest/services/NOAA_Coastal_Shoreline/FeatureServer/0/query" +
  "?where=1%3D1" +
  "&geometry=-81.84%2C24.46%2C-81.68%2C24.73" +
  "&geometryType=esriGeometryEnvelope" +
  "&inSR=4326" +
  "&spatialRel=esriSpatialRelIntersects" +
  "&outFields=FEATURE_ID%2CSOURCE_ID%2CSRC_DATE%2CHOR_ACC%2CATTRIBUTE%2CDATA_SOURC%2CEX_METH%2CSRC_CITA" +
  "&returnGeometry=true&outSR=4326&resultRecordCount=2000&f=geojson";

const state = {
  manifest: null,
  periods: [],
  sources: [],
  coverage: null,
  index: 0,
  mapReady: false,
  activeEvidence: null,
  cuspLoaded: false,
  aerialPeriods: [],
  aerialDiscovery: { status: "not-checked", years: 0, frames: 0 },
  alignment: {},
};

let map = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchJson(url, { timeoutMs = 15000, cache = "no-cache" } = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache, signal: controller.signal });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const data = await response.json();
    if (data?.error) throw new Error(data.error.message || data.error || "The remote GIS service returned an error.");
    return data;
  } finally {
    window.clearTimeout(timer);
  }
}

function showMapMessage(text) {
  const node = $("map-message");
  node.textContent = text;
  node.hidden = false;
}

function clearMapMessage() {
  $("map-message").hidden = true;
}

function studyFitBounds() {
  const [west, south, east, north] = state.manifest.studyBounds;
  return [[west, south], [east, north]];
}

function fit(bounds, duration = 700) {
  if (!map || !bounds) return;
  map.fitBounds(bounds, { padding: { top: 42, right: 42, bottom: 42, left: 42 }, duration });
}

function sourceById(id) {
  return state.sources.find((source) => source.id === id);
}

function renderSourceLinks(container, sourceIds, className = "source-link") {
  container.replaceChildren(...sourceIds.map(sourceById).filter(Boolean).map((source) => {
    const link = document.createElement("a");
    link.className = className;
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.innerHTML = `
      <span class="source-title">${escapeHtml(source.title)}</span>
      <span class="source-meta">${escapeHtml(source.institution)} · ${escapeHtml(source.coverage)}</span>`;
    return link;
  }));
}

function buildSourceCatalog() {
  $("source-catalog").replaceChildren(...state.sources.map((source) => {
    const link = document.createElement("a");
    link.className = "source-card";
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.innerHTML = `
      <span class="source-title">${escapeHtml(source.title)}</span>
      <span class="source-meta">${escapeHtml(source.institution)} · ${escapeHtml(source.coverage)}</span>
      <span class="source-meta">${escapeHtml(source.use)}</span>`;
    return link;
  }));
}

function buildMilestones() {
  $("milestone-list").replaceChildren(...state.manifest.milestones.map((milestone) => {
    const article = document.createElement("article");
    article.className = "milestone-card";
    article.innerHTML = `
      <div class="milestone-year">${escapeHtml(milestone.year)}</div>
      <div><h4>${escapeHtml(milestone.title)}</h4><p>${escapeHtml(milestone.status)}</p><div class="milestone-sources"></div></div>`;
    renderSourceLinks(article.querySelector(".milestone-sources"), milestone.sourceIds, "source-chip");
    return article;
  }));
}

function activateTab(tabId) {
  document.querySelectorAll('[role="tab"]').forEach((candidate) => {
    const active = candidate.id === tabId;
    candidate.classList.toggle("is-active", active);
    candidate.setAttribute("aria-selected", String(active));
    $(candidate.getAttribute("aria-controls")).hidden = !active;
  });
}

function buildArchiveMaps() {
  const maps = state.manifest.archiveMaps || [];
  $("archive-map-list").replaceChildren(...maps.map((item) => {
    const source = sourceById(item.sourceId);
    const article = document.createElement("article");
    article.className = "archive-map-card";
    article.innerHTML = `
      <div class="archive-map-year">${escapeHtml(item.year)}</div>
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.scope)}</p>
        <p class="archive-map-status">${escapeHtml(item.status)}</p>
        <div class="archive-map-actions"></div>
      </div>`;
    const actions = article.querySelector(".archive-map-actions");
    if (item.periodId) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button button-inline";
      button.textContent = "Show experimental overlay";
      button.addEventListener("click", () => {
        const index = state.periods.findIndex((period) => period.id === item.periodId);
        if (index >= 0) {
          activateTab("tab-story");
          selectPeriod(index);
        }
      });
      actions.append(button);
    }
    if (source) {
      const link = document.createElement("a");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "Open source record";
      actions.append(link);
    }
    return article;
  }));
}

function aerialProxyUrl(config) {
  if (!config.catalogProxy) return null;
  const [west, south, east, north] = config.bounds || state.manifest.aerialBounds || state.manifest.studyBounds;
  const params = new URLSearchParams({ west, south, east, north, yearMin: config.yearMin, yearMax: config.yearMax });
  return `${config.catalogProxy}?${params.toString()}`;
}
