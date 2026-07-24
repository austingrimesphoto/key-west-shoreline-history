import { readFile } from "node:fs/promises";

const parsed = JSON.parse(await readFile("data/urban-map-periods.json", "utf8"));
const images = (parsed.periods || [])
  .filter((period) => period?.overlay?.type === "image")
  .map((period) => ({ id: period.id, url: period.overlay.url }));

const failures = [];
for (const image of images) {
  if (!image.url.startsWith("https://")) {
    failures.push(`${image.id}: image URL is not HTTPS`);
    continue;
  }
  if (image.url.includes("commons.wikimedia.org/wiki/Special:Redirect")) {
    failures.push(`${image.id}: page-level Wikimedia redirects are forbidden`);
    continue;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(image.url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Range: "bytes=0-1023",
        "User-Agent": "KeyWestShorelineHistory-CI/1.0",
      },
    });
    const contentType = response.headers.get("content-type") || "";
    const allowOrigin = response.headers.get("access-control-allow-origin") || "";
    if (!response.ok && response.status !== 206) {
      failures.push(`${image.id}: HTTP ${response.status}`);
    } else if (!contentType.toLowerCase().startsWith("image/")) {
      failures.push(`${image.id}: expected image MIME type, received ${contentType || "none"}`);
    } else if (allowOrigin !== "*") {
      failures.push(`${image.id}: expected Access-Control-Allow-Origin: *, received ${allowOrigin || "none"}`);
    } else {
      console.log(`${image.id}: ${response.status} ${contentType} CORS=${allowOrigin}`);
    }
  } catch (error) {
    failures.push(`${image.id}: ${error?.name === "AbortError" ? "timed out" : error.message}`);
  } finally {
    clearTimeout(timer);
  }
}

if (images.length !== 4) failures.push(`expected four Sanborn overlays, found ${images.length}`);

if (failures.length) {
  console.error("Sanborn image validation failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("Validated all four Sanborn image overlays.");
