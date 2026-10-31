import { URL } from "node:url";

const DIRECT_VIDEO_TYPES = new Map([
  [".mp4", "video/mp4"],
  [".webm", "video/webm"],
  [".ogg", "video/ogg"],
]);

function safeUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function youtubeId(url) {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  let id = "";
  if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] ?? "";
  if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) {
    if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
    else id = url.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})\/?$/)?.[1] ?? "";
  }
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

function aparatId(url) {
  if (url.hostname.toLowerCase().replace(/^www\./, "") !== "aparat.com") return null;
  return url.pathname.match(/^\/v\/([A-Za-z0-9_-]{5,40})\/?$/)?.[1]
    ?? url.pathname.match(/^\/video\/video\/embed\/videohash\/([A-Za-z0-9_-]{5,40})(?:\/vt\/frame)?\/?$/)?.[1]
    ?? null;
}

export function normalizeProductVideoUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  const url = safeUrl(value.trim());
  if (!url) return null;
  if ([...DIRECT_VIDEO_TYPES.keys()].some((extension) => url.pathname.toLowerCase().endsWith(extension))) return url.href;
  const youtube = youtubeId(url);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube}`;
  const aparat = aparatId(url);
  if (aparat) return `https://www.aparat.com/video/video/embed/videohash/${aparat}/vt/frame`;
  return null;
}

export function productVideoKind(value) {
  const normalized = normalizeProductVideoUrl(value);
  if (!normalized) return null;
  const url = new URL(normalized);
  const extension = [...DIRECT_VIDEO_TYPES.keys()].find((suffix) => url.pathname.toLowerCase().endsWith(suffix));
  return extension ? { kind: "file", src: normalized, mimeType: DIRECT_VIDEO_TYPES.get(extension) } : { kind: "embed", src: normalized };
}
