import test from "node:test";
import assert from "node:assert/strict";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { createFixture } from "./fixture.mjs";

test("product image upload accepts verified images and rejects invalid uploads", async (t) => {
  const fixture = await createFixture();
  const { default: app } = await import("../src/app.js");
  const { signAccessToken } = await import("../src/utils/tokens.js");
  const { productUploadsDirectory } = await import("../src/middleware/upload.js");
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const headers = { Authorization: `Bearer ${signAccessToken(fixture.admin)}` };
  const uploadedPaths = [];
  t.after(async () => {
    server.close();
    await Promise.all(uploadedPaths.map((path) => unlink(path).catch(() => undefined)));
    await fixture.cleanup();
  });

  const created = await fetch(`${base}/products`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Upload integration product", price: 1200, stock: 4, category: "test" }),
  });
  assert.equal(created.status, 201);
  const product = (await created.json()).product;

  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j+ioAAAAASUVORK5CYII=", "base64");
  const upload = async (bytes, mimeType, filename = "photo.png") => {
    const form = new FormData();
    form.append("image", new Blob([bytes], { type: mimeType }), filename);
    return fetch(`${base}/products/${product.id}/image`, { method: "POST", headers, body: form });
  };

  const response = await upload(png, "image/png");
  assert.equal(response.status, 200, await response.clone().text());
  const body = await response.json();
  assert.match(body.product.imageUrl, /^\/uploads\/products\/[a-f0-9]{32}\.png$/);
  uploadedPaths.push(path.join(productUploadsDirectory, path.basename(body.product.imageUrl)));

  const served = await fetch(`http://127.0.0.1:${server.address().port}${body.product.imageUrl}`);
  assert.equal(served.status, 200);
  assert.match(served.headers.get("content-type"), /image\/png/);
  assert.deepEqual(Buffer.from(await served.arrayBuffer()), png);
  const ranged = await fetch(`http://127.0.0.1:${server.address().port}${body.product.imageUrl}`, { headers: { Range: "bytes=0-7" } });
  assert.equal(ranged.status, 206);
  assert.equal((await ranged.arrayBuffer()).byteLength, 8);

  const invalidType = await upload(png, "image/gif", "photo.gif");
  assert.equal(invalidType.status, 400);
  assert.match((await invalidType.json()).message, /JPG|PNG|WebP/);

  const fakePng = await upload(Buffer.from("not an image"), "image/png");
  assert.equal(fakePng.status, 400);
  assert.match((await fakePng.json()).message, /مطابقت/);

  const tooLarge = await upload(Buffer.alloc(5 * 1024 * 1024 + 1), "image/png");
  assert.equal(tooLarge.status, 400);
  assert.match((await tooLarge.json()).message, /۵ مگابایت/);
});
