import { prisma } from "../config/prisma.js";

export async function getDashboard() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 6);
  const [revenue, activeUsers, orders, openTickets, pendingOrders, pendingReviews, lowStock, weekOrders, recentOrders] = await Promise.all([
    prisma.order.aggregate({ where: { status: { not: "CANCELLED" } }, _sum: { totalAmount: true } }),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.order.count(),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    // نظرهای ثبت‌شده در سایت که هنوز تأیید/رد نشده‌اند؛ زنگ اعلان‌های TopBar از
    // همین عدد پر می‌شود تا مدیر بداند کاری در انتظار بررسی دارد.
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { stock: { lte: 5 }, isActive: true } }),
    prisma.order.findMany({ where: { createdAt: { gte: start }, status: { not: "CANCELLED" } }, select: { createdAt: true, totalAmount: true } }),
    prisma.order.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { customer: { select: { name: true } } } }),
  ]);
  const totals = new Map();
  for (const order of weekOrders) {
    const day = order.createdAt.toISOString().slice(0, 10);
    totals.set(day, (totals.get(day) || 0) + Number(order.totalAmount));
  }
  const weeklyRevenue = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    const day = date.toISOString().slice(0, 10);
    return { date: day, revenue: totals.get(day) || 0 };
  });
  return { stats: { revenue: Number(revenue._sum.totalAmount || 0), activeUsers, orders, openTickets, pendingOrders, pendingReviews, lowStock }, weeklyRevenue, recentOrders };
}
