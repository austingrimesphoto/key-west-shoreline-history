const IMAGES = {
  "key-west-1954": {
    url: "https://www.floridamemory.com/fpc/commerce/c019604.jpg",
    source: "State Archives of Florida / Florida Memory, C019604",
  },
  "key-west-1956": {
    url: "https://www.floridamemory.com/fpc/prints/pr24184.jpg",
    source: "State Archives of Florida / Florida Memory, PR24184",
  },
};

export default async (request) => {
  const url = new URL(request.url);
  const item = IMAGES[url.searchParams.get("id")];
  if (!item) {
    return new Response("Unknown historical image.", {
      status: 404,
      headers: { "content-type": "text/plain", "cache-control": "no-store" },
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(item.url, {
      signal: controller.signal,
      headers: { "user-agent": "KeyWestShorelineHistory/1.0 archival-research-map" },
    });
    if (!response.ok) throw new Error(`Florida Memory returned HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") || "image/jpeg";
    return new Response(response.body, {
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=86400, s-maxage=604800",
        "x-historical-source": item.source,
      },
    });
  } catch (error) {
    const message = error?.name === "AbortError" ? "Historical image request timed out." : error?.message || "Historical image request failed.";
    return new Response(message, {
      status: 502,
      headers: { "content-type": "text/plain", "cache-control": "no-store" },
    });
  } finally {
    clearTimeout(timer);
  }
};
