import test from "node:test";
import assert from "node:assert/strict";
import { createProductSchema } from "../src/validators/productValidators.js";
import { normalizeProductVideoUrl, productVideoKind } from "../src/utils/productVideo.js";

const productBody = (videoUrl) => ({
  name: "Video test burger",
  price: 580000,
  stock: 4,
  videoUrl,
});

test("direct video files retain their URL and expose an explicit media MIME type", () => {
  const source = "https://cdn.example.test/menu.mp4?token=demo";
  assert.equal(normalizeProductVideoUrl(source), source);
  assert.deepEqual(productVideoKind(source), { kind: "file", src: source, mimeType: "video/mp4" });
  assert.equal(productVideoKind("https://cdn.example.test/menu.webm").mimeType, "video/webm");
  assert.equal(productVideoKind("https://cdn.example.test/menu.ogg").mimeType, "video/ogg");
});

test("YouTube and Aparat page URLs normalize to whitelisted embed URLs", () => {
  assert.equal(
    normalizeProductVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  );
  assert.equal(
    normalizeProductVideoUrl("https://www.aparat.com/v/Abc123xyz"),
    "https://www.aparat.com/video/video/embed/videohash/Abc123xyz/vt/frame",
  );
  assert.equal(productVideoKind("https://youtu.be/dQw4w9WgXcQ").kind, "embed");
});

test("unsupported and unsafe URLs are rejected instead of silently stored", () => {
  for (const source of [
    "https://www.youtube.com/channel/example",
    "https://example.test/watch",
    "javascript:alert(1)",
    "https://user:secret@cdn.example.test/movie.mp4",
  ]) {
    assert.equal(normalizeProductVideoUrl(source), null);
    assert.equal(productVideoKind(source), null);
    assert.equal(createProductSchema.safeParse({ body: productBody(source) }).success, false);
  }
});

test("product validation stores normalized platform embeds", () => {
  const youtube = createProductSchema.safeParse({ body: productBody("https://youtu.be/dQw4w9WgXcQ") });
  assert.equal(youtube.success, true);
  assert.equal(youtube.data.body.videoUrl, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");

  const direct = createProductSchema.safeParse({ body: productBody("https://cdn.example.test/menu.mp4") });
  assert.equal(direct.success, true);
  assert.equal(direct.data.body.videoUrl, "https://cdn.example.test/menu.mp4");
});
