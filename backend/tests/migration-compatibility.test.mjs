import test from "node:test";
import assert from "node:assert/strict";
import { createFixture } from "./fixture.mjs";

test("video and cart migrations preserve legacy products and have a verified local rollback", async () => {
  const fixture = await createFixture();
  try {
    const legacyProduct = await fixture.client.product.create({ data: { name: "Legacy seed burger", price: 450000, stock: 4, category: "burgers", isActive: true } });
    const modernProduct = await fixture.client.product.create({ data: { name: "Video seed burger", price: 550000, stock: 6, category: "burgers", isActive: true, videoUrl: "https://example.invalid/test-video.mp4" } });
    assert.equal((await fixture.client.product.findUnique({ where: { id: legacyProduct.id }, select: { videoUrl: true } })).videoUrl, null);
    assert.equal((await fixture.client.product.findUnique({ where: { id: modernProduct.id }, select: { videoUrl: true } })).videoUrl, "https://example.invalid/test-video.mp4");
    await fixture.client.cartSnapshot.create({ data: { sessionHash: "a".repeat(64), items: [{ productId: legacyProduct.id, quantity: 1 }], totalAmount: 450000 } });
    assert.equal(await fixture.client.cartSnapshot.count(), 1);

    await fixture.client.$executeRawUnsafe('DROP TABLE "cart_snapshots"');
    await fixture.client.$executeRawUnsafe('DROP TYPE "CartSnapshotStatus"');
    await fixture.client.$executeRawUnsafe('ALTER TABLE "products" DROP COLUMN "videoUrl"');
    const remainingColumn = await fixture.client.$queryRaw`SELECT COUNT(*)::int AS count FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'products' AND column_name = 'videoUrl'`;
    const remainingTable = await fixture.client.$queryRaw`SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'cart_snapshots'`;
    assert.equal(remainingColumn[0].count, 0);
    assert.equal(remainingTable[0].count, 0);
  } finally { await fixture.cleanup(); }
});
