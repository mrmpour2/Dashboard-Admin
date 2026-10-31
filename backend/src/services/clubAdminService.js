import crypto from "node:crypto";
import ExcelJS from "exceljs";
import { prisma } from "../config/prisma.js";
import { BadRequestError, NotFoundError } from "../utils/AppError.js";
import { digest, normalizeMobile, securityAudit } from "./otpService.js";

const tierFor = (points) => points >= 1500 ? "gold" : points >= 500 ? "silver" : "bronze";
const eligibleOrder = { status: { in: ["PAID", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] } };
const safeXlsxRow = row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === "string" && /^[=+\-@]/.test(value) ? `'${value}` : value]));

export async function listClubMembers({ page = 1, pageSize = 20, search, consent, tier, actor }) {
  const where = { ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }] } : {}), ...(consent === undefined ? {} : { marketingConsent: consent }), ...(tier === "bronze" ? { pointsBalance: { lt: 500 } } : tier === "silver" ? { pointsBalance: { gte: 500, lt: 1500 } } : tier === "gold" ? { pointsBalance: { gte: 1500 } } : {}) };
  const [rows, total] = await Promise.all([
    prisma.clubMember.findMany({ where, orderBy: { joinedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, name: true, phone: true, birthDate: true, joinedAt: true, marketingConsent: true, marketingConsentAt: true, isActive: true, pointsBalance: true, _count: { select: { transactions: true } } } }),
    prisma.clubMember.count({ where }),
  ]);
  const ids = rows.map(x => x.id);
  const [orders, points, carts] = await Promise.all([
    prisma.chatOrder.groupBy({ by: ["customerPhone"], where: { ...eligibleOrder, customerPhone: { in: rows.map(x => x.phone) } }, _count: { _all: true }, _sum: { totalAmount: true }, _max: { createdAt: true } }),
    prisma.clubPointTransaction.groupBy({ by: ["memberId", "type"], where: { memberId: { in: ids }, type: { in: ["EARN", "REDEEM"] } }, _sum: { points: true } }),
    prisma.cartSnapshot.groupBy({ by: ["clubMemberId"], where: { clubMemberId: { in: ids }, status: "ABANDONED" }, _count: { _all: true }, _sum: { totalAmount: true } }),
  ]);
  const result = rows.map(m => {
    const ord = orders.find(o => o.customerPhone === m.phone);
    const earned = points.find(p => p.memberId === m.id && p.type === "EARN")?._sum.points || 0;
    const spent = points.find(p => p.memberId === m.id && p.type === "REDEEM")?._sum.points || 0;
    const cart = carts.find(c => c.clubMemberId === m.id);
    return { ...m, tier: tierFor(m.pointsBalance), pointsEarned: earned, pointsSpent: Math.abs(spent), purchaseCount: ord?._count._all || 0, purchaseValue: Number(ord?._sum.totalAmount || 0), latestOrderAt: ord?._max.createdAt || null, abandonedCartCount: cart?._count._all || 0, abandonedCartValue: Number(cart?._sum.totalAmount || 0) };
  });
  await securityAudit(prisma, "club.members.listed", "club-members", { actorId: actor.id, page, pageSize, search: Boolean(search), consent: consent ?? null, tier: tier ?? null, count: result.length });
  return { items: result, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

export async function exportClubMembers(filters, actor) {
  const first = await listClubMembers({ ...filters, page: 1, pageSize: 100, actor });
  const all = [...first.items];
  for (let page = 2; page <= first.pagination.totalPages; page += 1) {
    const result = await listClubMembers({ ...filters, page, pageSize: 100, actor });
    all.push(...result.items);
  }
  await securityAudit(prisma, "club.members.exported", "club-members", { actorId: actor.id, search: Boolean(filters.search), consent: filters.consent ?? null, tier: filters.tier ?? null, count: all.length, format: "xlsx" });
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("اعضای باشگاه", { views: [{ rightToLeft: true }] });
  sheet.columns = [
    { header: "نام", key: "name", width: 24 }, { header: "موبایل", key: "phone", width: 16 },
    { header: "تاریخ تولد", key: "birthDate", width: 16 }, { header: "تاریخ عضویت", key: "joinedAt", width: 18 },
    { header: "سطح", key: "tier", width: 12 }, { header: "امتیاز کسب‌شده", key: "pointsEarned", width: 18 },
    { header: "امتیاز مصرف‌شده", key: "pointsSpent", width: 18 }, { header: "مانده امتیاز", key: "pointsBalance", width: 16 },
    { header: "تعداد خرید", key: "purchaseCount", width: 14 }, { header: "ارزش خرید", key: "purchaseValue", width: 18 },
    { header: "آخرین سفارش", key: "latestOrderAt", width: 20 }, { header: "رضایت تبلیغاتی", key: "marketingConsent", width: 18 },
    { header: "تعداد سبد رهاشده", key: "abandonedCartCount", width: 18 }, { header: "ارزش سبد رهاشده", key: "abandonedCartValue", width: 18 },
  ];
  sheet.addRows(all.map(m => safeXlsxRow({ ...m, birthDate: m.birthDate?.toISOString().slice(0, 10) || "", joinedAt: m.joinedAt.toISOString(), latestOrderAt: m.latestOrderAt?.toISOString() || "", marketingConsent: m.marketingConsent ? "بله" : "خیر" })));
  sheet.getRow(1).font = { bold: true };
  return workbook.xlsx.writeBuffer();
}

export async function listNonMembers({ page = 1, pageSize = 20, search, consent, actor }) {
  const matchingOrders = await prisma.chatOrder.findMany({
    where: { ...eligibleOrder, phoneHash: { not: null }, ...(search ? { OR: [{ customerName: { contains: search, mode: "insensitive" } }, { customerPhone: { contains: search } }] } : {}) },
    distinct: ["phoneHash"], orderBy: [{ createdAt: "desc" }], select: { phoneHash: true, customerPhone: true },
  });
  const hashes = [...new Set(matchingOrders.map(o => o.phoneHash).filter(Boolean))];
  const memberHashes = new Set((await prisma.clubMember.findMany({ select: { phone: true } })).map(m => digest(m.phone)));
  const guests = hashes.filter(h => !memberHashes.has(h));
  const [aggregates, consentRows] = await Promise.all([
    prisma.chatOrder.groupBy({ by: ["phoneHash"], where: { ...eligibleOrder, phoneHash: { in: guests } }, _count: { _all: true }, _sum: { totalAmount: true }, _max: { createdAt: true } }),
    prisma.customerMarketingConsent.findMany({ where: { phoneHash: { in: guests } } }),
  ]);
  const latest = await prisma.chatOrder.findMany({ where: { phoneHash: { in: guests }, ...eligibleOrder }, orderBy: { createdAt: "desc" }, distinct: ["phoneHash"], select: { phoneHash: true, customerName: true, customerPhone: true } });
  const latestByHash = new Map(latest.map(x => [x.phoneHash, x]));
  const consentByHash = new Map(consentRows.map(x => [x.phoneHash, x]));
  let items = aggregates.map(a => { const row = latestByHash.get(a.phoneHash); const c = consentByHash.get(a.phoneHash); return { phoneHash: a.phoneHash, name: row?.customerName || "", phone: row?.customerPhone || "", orderCount: a._count._all, orderValue: Number(a._sum.totalAmount || 0), latestOrderAt: a._max.createdAt, marketingConsent: Boolean(c?.marketingAllowed), consentAt: c?.consentAt || null }; });
  if (consent !== undefined) items = items.filter(x => x.marketingConsent === consent);
  items.sort((a,b) => new Date(b.latestOrderAt).getTime() - new Date(a.latestOrderAt).getTime());
  const total = items.length;
  const result = items.slice((page - 1) * pageSize, page * pageSize);
  await securityAudit(prisma, "club.nonmembers.listed", "club-nonmembers", { actorId: actor.id, page, pageSize, search: Boolean(search), consent: consent ?? null, count: result.length });
  return { items: result, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

export async function exportNonMembers({ search, consent }, actor) {
  const first = await listNonMembers({ page: 1, pageSize: 100, search, consent, actor });
  const items = [...first.items];
  for (let page = 2; page <= first.pagination.totalPages; page += 1) items.push(...(await listNonMembers({ page, pageSize: 100, search, consent, actor })).items);
  await securityAudit(prisma, "club.nonmembers.exported", "club-nonmembers", { actorId: actor.id, search: Boolean(search), consent: consent ?? null, count: items.length, format: "xlsx" });
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("مشتریان غیرعضو", { views: [{ rightToLeft: true }] });
  sheet.columns = [{ header: "نام", key: "name", width: 24 }, { header: "موبایل", key: "phone", width: 16 }, { header: "تعداد سفارش", key: "orderCount", width: 16 }, { header: "ارزش سفارش‌ها", key: "orderValue", width: 20 }, { header: "آخرین سفارش", key: "latestOrderAt", width: 22 }, { header: "رضایت تبلیغاتی", key: "marketingConsent", width: 20 }];
  sheet.addRows(items.map(x => safeXlsxRow({ ...x, latestOrderAt: x.latestOrderAt?.toISOString() || "", marketingConsent: x.marketingConsent ? "بله" : "خیر" })));
  sheet.getRow(1).font = { bold: true };
  return workbook.xlsx.writeBuffer();
}

export async function getClubMember(id, actor) {
  const member = await prisma.clubMember.findUnique({ where: { id }, select: { id: true, name: true, phone: true, birthDate: true, joinedAt: true, marketingConsent: true, marketingConsentAt: true, marketingConsentSource: true, isActive: true, pointsBalance: true, transactions: { orderBy: { createdAt: "desc" }, take: 100 }, carts: { where: { status: "ABANDONED" }, orderBy: { lastActivity: "desc" }, take: 50 } } });
  if (!member) throw new NotFoundError("عضو پیدا نشد");
  const orders = await prisma.chatOrder.findMany({ where: { ...eligibleOrder, customerPhone: member.phone }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, orderNumber: true, totalAmount: true, status: true, createdAt: true } });
  await securityAudit(prisma, "club.member.viewed", id, { actorId: actor.id, role: actor.role });
  return { ...member, orders, tier: tierFor(member.pointsBalance) };
}

export async function adjustClubPoints(id, delta, reason, actor) {
  if (!Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > 100000) throw new BadRequestError("تغییر امتیاز معتبر نیست");
  const sourceId = crypto.randomUUID();
  return prisma.$transaction(async tx => {
    const member = await tx.clubMember.findUnique({ where: { id } });
    if (!member) throw new NotFoundError("عضو پیدا نشد");
    const balance = member.pointsBalance + delta;
    if (balance < 0) throw new BadRequestError("موجودی امتیاز نمی‌تواند منفی شود");
    await tx.clubMember.update({ where: { id }, data: { pointsBalance: balance } });
    const entry = await tx.clubPointTransaction.create({ data: { memberId: id, type: "ADJUST", source: "ADJUSTMENT", sourceId, points: delta, balanceAfter: balance, description: reason.trim() } });
    await securityAudit(tx, "club.points.adjusted", id, { actorId: actor.id, delta, balanceAfter: balance, reason: reason.trim() });
    return entry;
  });
}

export async function setMarketingConsent(id, allowed, actor, source = "admin") {
  return prisma.$transaction(async tx => {
    const member = await tx.clubMember.update({ where: { id }, data: { marketingConsent: allowed, marketingConsentAt: new Date(), marketingConsentSource: source } }).catch(() => null);
    if (!member) throw new NotFoundError("عضو پیدا نشد");
    await tx.customerMarketingConsent.upsert({ where: { phoneHash: digest(normalizeMobile(member.phone)) }, create: { phoneHash: digest(normalizeMobile(member.phone)), marketingAllowed: allowed, consentAt: allowed ? new Date() : null, source }, update: { marketingAllowed: allowed, consentAt: allowed ? new Date() : null, source } });
    await securityAudit(tx, "club.marketing_consent.changed", id, { actorId: actor.id, allowed });
    return { marketingConsent: allowed };
  });
}
