import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { digest, normalizeMobile } from "../src/services/otpService.js";

// During this remediation, writes are strictly limited to the disposable database.
const url = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.port !== "55439" || url.pathname !== "/elin_audit") throw new Error("Only the disposable audit database is allowed");
const db = new PrismaClient();
const apply = process.argv.includes("--apply");
try {
  const result = await db.$transaction(async tx => {
    if (apply) await tx.$executeRaw`LOCK TABLE products, chat_orders IN SHARE ROW EXCLUSIVE MODE`;
    const products = await tx.product.findMany({ orderBy: { id: "asc" } });
    const holds = await tx.chatOrder.findMany({ where: { status: "PENDING_PAYMENT", phoneHash: null }, include: { items: true } });
    const totals = new Map();
    for (const order of holds) for (const item of order.items) totals.set(item.productId, (totals.get(item.productId) || 0) + item.quantity);
    const report = [];
    for (const product of products) {
      const existing = await tx.productStock.findUnique({ where: { skuId: product.id } });
      const reserved = totals.get(product.id) || 0;
      report.push({ skuId: product.id, currentStock: product.stock, onHand: product.stock + reserved, reserved, skipped: Boolean(existing) });
      if (apply && !existing) await tx.productStock.create({ data: { skuId: product.id, onHand: product.stock + reserved, reserved } });
    }
    if (apply) for (const order of holds) {
      const expiresAt = new Date(order.createdAt.getTime() + 900000);
      const quantities = new Map();
      for (const item of order.items) quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
      // Refuse partial/inconsistent backfills rather than silently double reserving.
      if (report.some(r => quantities.has(r.skuId) && r.skipped)) throw new Error("Existing stock with an unmigrated legacy hold; manual reconciliation required");
      for (const [skuId, qty] of quantities) await tx.stockReservation.create({ data: { orderId: order.id, skuId, qty, expiresAt } });
      await tx.chatOrder.update({ where: { id: order.id }, data: { expiresAt, phoneHash: digest(normalizeMobile(order.customerPhone)), ipHash: "legacy_unknown_ip" } });
    }
    return { dryRun: !apply, products: report, legacyOrders: holds.length };
  }, { timeout: 30000 });
  console.log(JSON.stringify(result, null, 2));
} finally { await db.$disconnect(); }
