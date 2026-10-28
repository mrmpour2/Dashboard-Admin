import { prisma } from "../config/prisma.js";

export async function getDashboard() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 6);
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  monthStart.setUTCMonth(monthStart.getUTCMonth() - 11);
  const clubActiveSince = new Date();
  clubActiveSince.setUTCDate(clubActiveSince.getUTCDate() - 30);
  const [revenue, activeUsers, orders, openTickets, pendingOrders, pendingReviews, lowStock, weekOrders, monthOrders, recentOrders, clubMembers, newClubMembers, activeClubMembers, clubPoints, topClubMembers] = await Promise.all([
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
    prisma.order.findMany({ where: { createdAt: { gte: monthStart }, status: { not: "CANCELLED" } }, select: { createdAt: true, totalAmount: true } }),
    prisma.order.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { customer: { select: { name: true } } } }),
    prisma.clubMember.count(),
    prisma.clubMember.count({ where: { joinedAt: { gte: monthStart } } }),
    prisma.clubMember.count({ where: { lastLoginAt: { gte: clubActiveSince } } }),
    prisma.clubPointTransaction.aggregate({ where: { status: "available" }, _sum: { points: true } }),
    prisma.clubMember.findMany({ take: 5, orderBy: [{ pointsBalance: "desc" }, { joinedAt: "asc" }], select: { id: true, name: true, pointsBalance: true } }),
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
  const monthlyBuckets = new Map();
  for (const order of monthOrders) {
    const key = `${order.createdAt.getUTCFullYear()}-${String(order.createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = monthlyBuckets.get(key) ?? { revenue: 0, orders: 0 };
    bucket.revenue += Number(order.totalAmount);
    bucket.orders += 1;
    monthlyBuckets.set(key, bucket);
  }
  const monthlyRevenue = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(monthStart);
    date.setUTCMonth(date.getUTCMonth() + index);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date);
    return { date: key, label, ...(monthlyBuckets.get(key) ?? { revenue: 0, orders: 0 }) };
  });
  return {
    stats: { revenue: Number(revenue._sum.totalAmount || 0), activeUsers, orders, openTickets, pendingOrders, pendingReviews, lowStock },
    weeklyRevenue,
    monthlyRevenue,
    club: { members: clubMembers, newMembers: newClubMembers, activeMembers: activeClubMembers, availablePoints: Number(clubPoints._sum.points || 0), topMembers: topClubMembers },
    abandonedCarts: { tracked: false, reason: "سبدهای خرید پیش از ثبت سفارش در این سامانه ذخیره نمی‌شوند." },
    recentOrders,
  };
}
