import { prisma } from "../config/prisma.js";
import crypto from "node:crypto";
import { BadRequestError, NotFoundError } from "../utils/AppError.js";
import { digest, normalizeMobile, securityAudit } from "./otpService.js";

const assigneeSelect = {
  select: { id: true, name: true, avatarUrl: true },
};

export async function listTickets({ page, pageSize, status, priority, search, sortBy = "createdAt", sortOrder = "desc" }, actor = null) {
  const where = {
    ...(status && { status }),
    ...(priority && { priority }),
    ...(search && { OR: [{ title: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }] }),
  };

  const [items, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: { assignee: assigneeSelect, _count: { select: { comments: true } } },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);

  const canSeePhone = !actor || ["ADMIN", "MANAGER"].includes(actor.role);
  if (canSeePhone && actor && items.some((ticket) => ticket.customerPhone)) {
    await securityAudit(prisma, "ticket.personal_data.listed", "ticket-list", { actorId: actor.id, count: items.filter((ticket) => ticket.customerPhone).length });
  }
  return {
    items: items.map((ticket) => ({
      ...ticket,
      customerPhone: canSeePhone ? ticket.customerPhone : maskPhone(ticket.customerPhone),
      trackingCodeHash: undefined,
      customerPhoneHash: undefined,
      attachmentPath: undefined,
      attachmentMime: undefined,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export function listTicketAssignees() {
  return prisma.user.findMany({ where: { status: "ACTIVE", role: "STAFF" }, select: { id: true, name: true }, orderBy: { name: "asc" } });
}

export async function getTicketById(id, actor = null) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      assignee: assigneeSelect,
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  });
  if (!ticket) throw new NotFoundError("تیکت یافت نشد");
  if (actor && ticket.customerPhone) {
    await securityAudit(prisma, "ticket.personal_data.viewed", id, { actorId: actor.id, role: actor.role });
  }
  const history = await prisma.securityAudit.findMany({
    where: { subject: digest(id), action: "ticket.status_changed" },
    orderBy: { createdAt: "asc" },
  });
  const canSeePhone = !actor || ["ADMIN", "MANAGER"].includes(actor.role);
  return {
    ...ticket,
    customerPhone: canSeePhone ? ticket.customerPhone : maskPhone(ticket.customerPhone),
    trackingCodeHash: undefined,
    customerPhoneHash: undefined,
    attachmentPath: undefined,
    attachmentAvailable: Boolean(ticket.attachmentPath),
    statusHistory: history.map((entry) => ({ ...entry.details, createdAt: entry.createdAt })),
  };
}

export async function getTicketAttachment(id, actor) {
  const ticket = await prisma.ticket.findUnique({ where: { id }, select: { attachmentPath: true, attachmentMime: true } });
  if (!ticket?.attachmentPath) throw new NotFoundError("پیوستی برای این تیکت ثبت نشده است.");
  await securityAudit(prisma, "ticket.attachment.viewed", id, { actorId: actor.id, role: actor.role });
  return ticket;
}

export async function createTicket(data) {
  return prisma.ticket.create({ data, include: { assignee: assigneeSelect } });
}

export async function updateTicket(id, data) {
  const { actorId, ...changes } = data;
  return prisma.$transaction(async (tx) => {
    const existing = await tx.ticket.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("تیکت یافت نشد");
    const ticket = await tx.ticket.update({ where: { id }, data: changes, include: { assignee: assigneeSelect } });
    if (existing.status !== ticket.status) {
      await securityAudit(tx, "ticket.status_changed", id, { actorId, from: existing.status, to: ticket.status });
    }
    if (existing.assignedTo !== ticket.assignedTo) {
      await securityAudit(tx, "ticket.assignee_changed", id, { actorId, assignedTo: ticket.assignedTo });
    }
    return ticket;
  });
}

export async function deleteTicket(id) {
  const deleted = await prisma.ticket.delete({ where: { id } }).catch(() => null);
  if (!deleted) throw new NotFoundError("تیکت یافت نشد");
}

export async function addComment(ticketId, authorId, content) {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundError("تیکت یافت نشد");
    if (ticket.status === "CLOSED") throw new BadRequestError("ابتدا وضعیت تیکت بسته را باز کنید.");
    const [comment] = await Promise.all([
      tx.comment.create({ data: { content, ticketId, authorId }, include: { author: { select: { id: true, name: true, avatarUrl: true } } } }),
      tx.ticketMessage.create({ data: { content, ticketId, authorId, sender: "STAFF" } }),
    ]);
    if (ticket.status !== "CLOSED") {
      const updated = await tx.ticket.update({ where: { id: ticketId }, data: { status: "RESOLVED" } });
      if (ticket.status !== updated.status) {
        await securityAudit(tx, "ticket.status_changed", ticketId, { actorId: authorId, from: ticket.status, to: updated.status });
      }
    }
    await securityAudit(tx, "ticket.staff_replied", ticketId, { actorId: authorId });
    return comment;
  });
}

function maskPhone(value) {
  const phone = String(value ?? "");
  return phone.length > 6 ? `${phone.slice(0, 4)}***${phone.slice(-2)}` : "***";
}

export async function createPublicTicket({ name, phone: rawPhone, title, category, message, orderNumber, attachment }) {
  const phone = normalizeMobile(rawPhone);
  if (orderNumber) {
    const order = await prisma.chatOrder.findFirst({ where: { orderNumber, customerPhone: phone }, select: { id: true } });
    if (!order) throw new BadRequestError("شماره سفارش با این شماره موبایل تطبیق ندارد.");
  }
  const code = crypto.randomBytes(5).toString("hex").toUpperCase();
  const ticket = await prisma.ticket.create({
    data: {
      title,
      description: message,
      priority: "MEDIUM",
      customerName: name,
      customerPhone: phone,
      customerPhoneHash: digest(phone),
      trackingCodeHash: digest(code),
      category,
      orderNumber: orderNumber || null,
      attachmentPath: attachment?.filename ?? null,
      attachmentMime: attachment?.mime ?? null,
      messages: { create: { sender: "CUSTOMER", content: message } },
    },
    select: { id: true, title: true, status: true, createdAt: true },
  });
  await securityAudit(prisma, "ticket.public.created", ticket.id, { category, hasAttachment: Boolean(attachment) });
  return { ticket, trackingCode: code };
}

export async function getPublicTicket({ phone: rawPhone, trackingCode }) {
  const phone = normalizeMobile(rawPhone);
  const ticket = await prisma.ticket.findFirst({
    where: { customerPhoneHash: digest(phone), trackingCodeHash: digest(trackingCode.trim().toUpperCase()) },
    include: { messages: { orderBy: { createdAt: "asc" }, select: { id: true, sender: true, content: true, createdAt: true } } },
  });
  if (!ticket) throw new NotFoundError("تیکت پیدا نشد یا اطلاعات پیگیری نادرست است.");
  await securityAudit(prisma, "ticket.public.tracked", ticket.id, { messageCount: ticket.messages.length });
  return {
    trackingCode: trackingCode.trim().toUpperCase(),
    title: ticket.title,
    description: ticket.description,
    category: ticket.category,
    status: ticket.status,
    createdAt: ticket.createdAt,
    attachmentAvailable: Boolean(ticket.attachmentPath),
    messages: ticket.messages,
  };
}

export async function replyPublicTicket({ phone: rawPhone, trackingCode, content }) {
  const phone = normalizeMobile(rawPhone);
  const codeHash = digest(trackingCode.trim().toUpperCase());
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findFirst({ where: { customerPhoneHash: digest(phone), trackingCodeHash: codeHash } });
    if (!ticket) throw new NotFoundError("تیکت پیدا نشد یا اطلاعات پیگیری نادرست است.");
    if (ticket.status === "CLOSED") throw new BadRequestError("این تیکت بسته شده است.");
    const message = await tx.ticketMessage.create({ data: { ticketId: ticket.id, sender: "CUSTOMER", content } });
    const updated = await tx.ticket.update({ where: { id: ticket.id }, data: { status: "OPEN" } });
    if (ticket.status !== updated.status) {
      await securityAudit(tx, "ticket.status_changed", ticket.id, { actor: "CUSTOMER", from: ticket.status, to: updated.status });
    }
    await securityAudit(tx, "ticket.public.replied", ticket.id, { messageId: message.id });
    return { createdAt: message.createdAt };
  });
}
