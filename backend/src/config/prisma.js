import { PrismaClient } from "@prisma/client";
import { isProd } from "./env.js";

// یک نمونه واحد از PrismaClient در کل عمر برنامه (جلوگیری از اتصال‌های تکراری به دیتابیس)
export const prisma = new PrismaClient({
  log: isProd ? ["error", "warn"] : ["error", "warn", "query"],
});
