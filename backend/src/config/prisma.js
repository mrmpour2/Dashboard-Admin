import { PrismaClient } from "@prisma/client";
import { env, isProd } from "./env.js";

// یک نمونه واحد از PrismaClient در کل عمر برنامه (جلوگیری از اتصال‌های تکراری به دیتابیس)
export const prisma = new PrismaClient({
  log: env.NODE_ENV === "test" ? [] : isProd ? ["error", "warn"] : ["error", "warn", "query"],
});
