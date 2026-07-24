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
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(image.url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Origin: "https://deploy-preview.example.netlify.app",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    const contentType = response.headers.get("content-type") || "";
    const allowOrigin = response.headers.get("access-control-allow-origin") || "";
    if (!response.ok) {
      failures.push(`${image.id}: HTTP ${response.status}`);
      continue;
    }
    if (!contentType.toLowerCase().startsWith("image/")) {
      failures.push(`${image.id}: expected image MIME type, received ${contentType || "none"}`);
      continue;
    }
    if (allowOrigin !== "*" && allowOrigin !== "https://deploy-preview.example.netlify.app") {
      failures.push(`${image.id}: non-permissive CORS header ${allowOrigin || "none"}`);
      continue;
    }
    const reader = response.body?.getReader();
    const firstChunk = reader ? await reader.read() : { value: null };
    await reader?.cancel();
    if (!firstChunk.value?.byteLength) {
      failures.push(`${image.id}: response body contained no image bytes`);
      continue;
    }
    console.log(`${image.id}: ${response.status} ${contentType} CORS=${allowOrigin} firstChunk=${firstChunk.value.byteLength}`);
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
