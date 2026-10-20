import { prisma } from "../config/prisma.js";
export async function listComments({ page, pageSize, search, sortBy = "createdAt", sortOrder = "desc" }) {
  const where = search ? { OR: [{ content: { contains: search, mode: "insensitive" } }, { author: { name: { contains: search, mode: "insensitive" } } }] } : {};
  const [items,total]=await Promise.all([
    prisma.comment.findMany({ where, include: { author: { select: { id:true,name:true,email:true,avatarUrl:true } }, ticket: { select: { id:true,title:true } } }, orderBy:{[sortBy]:sortOrder}, skip:(page-1)*pageSize, take:pageSize }),
    prisma.comment.count({where}),
  ]);
  return { items, pagination:{page,pageSize,total,totalPages:Math.ceil(total/pageSize)} };
}
