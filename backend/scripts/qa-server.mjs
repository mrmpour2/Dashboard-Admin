import { createFixture } from "../tests/fixture.mjs";
const fixture = await createFixture();
const { default: app } = await import("../src/app.js");
const { prisma } = await import("../src/config/prisma.js");
for (let index = 1; index <= 12; index++) {
  await fixture.client.product.create({ data: { name: `دفتر یادداشت ${index}`, price: 85000 + index * 10000, stock: index, category: "لوازم تحریر", imageUrl: "" } });
}
await fixture.client.coupon.create({ data: { code: "WELCOME10", discountValue: 10, maxUses: 10 } });
const ticket = await fixture.client.ticket.create({ data: { title: "پیگیری ارسال سفارش", description: "لطفاً وضعیت ارسال سفارش را بررسی کنید.", priority: "HIGH", assignedTo: fixture.staff.id } });
await fixture.client.comment.create({ data: { ticketId: ticket.id, authorId: fixture.admin.id, content: "درخواست شما در حال بررسی است." } });
const product = await fixture.client.product.findFirst();
await fixture.client.order.create({ data: { orderNumber: "ORD-QA-1001", customerId: fixture.staff.id, subtotalAmount: product.price, totalAmount: product.price, items: { create: { productId: product.id, quantity: 1, unitPrice: product.price } } } });
const server = app.listen(4100, "127.0.0.1", () => console.log("QA_READY http://127.0.0.1:4100 — isolated disposable data"));
async function stop() {
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
  await fixture.cleanup();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
