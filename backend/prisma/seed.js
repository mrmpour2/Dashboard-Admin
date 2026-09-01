// این اسکریپت دیتابیس را با داده‌های نمونه پر می‌کند (فقط برای محیط توسعه/دمو).
// اجرا: npm run seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Passw0rd!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@nebula.local" },
    update: {},
    create: {
      name: "محمدرضا محمدی پور",
      email: "admin@nebula.local",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "sara@nebula.local" },
    update: {},
    create: {
      name: "سارا احمدی",
      email: "sara@nebula.local",
      passwordHash,
      role: "STAFF",
      status: "ACTIVE",
    },
  });

  await prisma.product.createMany({
    data: [
      { name: "هدفون بی‌سیم مدل Aria", price: 1250000, stock: 34, category: "لوازم جانبی" },
      { name: "کیبورد مکانیکی Nova", price: 3200000, stock: 12, category: "لوازم جانبی" },
      { name: "مانیتور ۲۷ اینچ QHD", price: 9800000, stock: 5, category: "مانیتور" },
    ],
    skipDuplicates: true,
  });

  await prisma.ticket.create({
    data: {
      title: "مشکل در پرداخت آنلاین",
      description: "کاربر گزارش داده که درگاه پرداخت با خطای ۵۰۲ مواجه می‌شود.",
      status: "OPEN",
      priority: "HIGH",
      assignedTo: admin.id,
    },
  });

  console.log("✅ داده‌های نمونه با موفقیت اضافه شدند.");
  console.log("   ایمیل ادمین: admin@nebula.local  |  رمز عبور: Passw0rd!");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
