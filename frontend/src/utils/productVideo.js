const safeUrl = (value) => {
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
};

export function normalizeProductVideoUrl(value) {
  if (!value?.trim()) return "";
  const url = safeUrl(value);
  if (!url) return null;
  if ([".mp4", ".webm", ".ogg"].some((extension) => url.pathname.toLowerCase().endsWith(extension))) return url.href;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  let id = "";
  if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] ?? "";
  if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) {
    id = url.pathname === "/watch" ? url.searchParams.get("v") ?? "" : url.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})\/?$/)?.[1] ?? "";
  }
  if (/^[A-Za-z0-9_-]{11}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
  if (host === "aparat.com") {
    const aparat = url.pathname.match(/^\/v\/([A-Za-z0-9_-]{5,40})\/?$/)?.[1]
      ?? url.pathname.match(/^\/video\/video\/embed\/videohash\/([A-Za-z0-9_-]{5,40})(?:\/vt\/frame)?\/?$/)?.[1];
    if (aparat) return `https://www.aparat.com/video/video/embed/videohash/${aparat}/vt/frame`;
  }
  return null;
}
