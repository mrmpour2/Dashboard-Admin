import { prisma } from "../config/prisma.js";
import { NotFoundError } from "../utils/AppError.js";
import { securityAudit } from "./otpService.js";

export function listPublicFaq() {
  return prisma.faqItem.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] });
}

export function listAdminFaq() {
  return prisma.faqItem.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] });
}

export async function createFaq(data, actorId) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.faqItem.create({ data });
    await securityAudit(tx, "faq.created", item.id, { actorId });
    return item;
  });
}

export async function updateFaq(id, data, actorId) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.faqItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("پرسش متداول پیدا نشد.");
    const item = await tx.faqItem.update({ where: { id }, data });
    await securityAudit(tx, "faq.updated", item.id, { actorId, fields: Object.keys(data) });
    return item;
  });
}
