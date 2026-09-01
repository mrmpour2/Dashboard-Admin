import { prisma } from "../config/prisma.js";
import { NotFoundError } from "../utils/AppError.js";

const assigneeSelect = {
  select: { id: true, name: true, avatarUrl: true },
};

export async function listTickets({ page, pageSize, status, priority }) {
  const where = {
    ...(status && { status }),
    ...(priority && { priority }),
  };

  const [items, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: { assignee: assigneeSelect, _count: { select: { comments: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);

  return {
    items,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function getTicketById(id) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      assignee: assigneeSelect,
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  });
  if (!ticket) throw new NotFoundError("تیکت یافت نشد");
  return ticket;
}

export async function createTicket(data) {
  return prisma.ticket.create({ data, include: { assignee: assigneeSelect } });
}

export async function updateTicket(id, data) {
  const ticket = await prisma.ticket
    .update({ where: { id }, data, include: { assignee: assigneeSelect } })
    .catch(() => null);
  if (!ticket) throw new NotFoundError("تیکت یافت نشد");
  return ticket;
}

export async function deleteTicket(id) {
  const deleted = await prisma.ticket.delete({ where: { id } }).catch(() => null);
  if (!deleted) throw new NotFoundError("تیکت یافت نشد");
}

export async function addComment(ticketId, authorId, content) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new NotFoundError("تیکت یافت نشد");

  return prisma.comment.create({
    data: { content, ticketId, authorId },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });
}
