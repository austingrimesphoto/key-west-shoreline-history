import { readFile } from "node:fs/promises";

const core = await readFile("assets/app-core.js", "utf8");
const map = await readFile("assets/app-map.js", "utf8");
const init = await readFile("assets/app-init.js", "utf8");

const required = [
  [core, "overlayLoadGeneration"],
  [core, "loadedImageUrls: new Set()"],
  [map, "function preloadImageOverlay"],
  [map, "await preloadImageOverlay(overlay.url)"],
  [map, "generation !== state.overlayLoadGeneration"],
  [map, "The previous map remains visible."],
  [init, "expectedCancellation"],
  [init, "ajaxerror"],
  [init, "load failed"],
];

for (const [text, token] of required) {
  if (!text.includes(token)) throw new Error(`Missing overlay loading contract: ${token}`);
}

const installerStart = map.indexOf("async function installEvidenceOverlay");
const installerEnd = map.indexOf("function setLayerVisibility", installerStart);
const installer = map.slice(installerStart, installerEnd);
const preloadIndex = installer.indexOf("await preloadImageOverlay(overlay.url)");
const removeIndex = installer.indexOf("removeActiveEvidence();", preloadIndex);
if (installerStart < 0 || installerEnd < 0 || preloadIndex < 0 || removeIndex < preloadIndex) {
  throw new Error("Replacement images must preload before active evidence is removed.");
}

if (!map.includes("async function renderPeriod()")) {
  throw new Error("Period rendering must be asynchronous for serialized image replacement.");
}

console.log("Overlay loading contract passed.");
