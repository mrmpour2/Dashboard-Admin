// کاتالوگ اولیهٔ پاداش‌های باشگاه مشتریان. اجرا: npm run seed:club
//
// اجرای دوباره بی‌خطر است: پاداش‌ها با `code` شناسایی می‌شوند و فقط متن/امتیاز/
// سطح به‌روزرسانی می‌شود؛ موجودی و وضعیت فعال‌بودن دست‌نخورده می‌ماند تا اجرای
// مجدد، موجودی فروش‌رفته را دوباره پر نکند.
import { PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";

const prisma = new PrismaClient();

export const CLUB_REWARDS = [
  {
    code: "FRIES-ON-US",
    titleFa: "سیب‌زمینی سرخ‌کرده مهمان ما",
    titleEn: "Fries on us",
    descriptionFa: "یک پرس سیب‌زمینی تازه با سس مخصوص خانه.",
    descriptionEn: "A portion of fresh fries with our house sauce.",
    costPoints: 100,
    minTier: "BRONZE",
    sortOrder: 10,
  },
  {
    code: "DRINK-ON-US",
    titleFa: "نوشیدنی دلخواه",
    titleEn: "Any drink",
    descriptionFa: "یک لیوان نوشیدنی از منوی رستوران.",
    descriptionEn: "One drink from the restaurant menu.",
    costPoints: 180,
    minTier: "BRONZE",
    sortOrder: 20,
  },
  {
    code: "BURGER-OF-CHOICE",
    titleFa: "برگر به انتخاب شما",
    titleEn: "Burger of your choice",
    descriptionFa: "هر برگر کلاسیک منو، همراه با سیب‌زمینی کنار آن.",
    descriptionEn: "Any classic burger, served with fries.",
    costPoints: 450,
    minTier: "SILVER",
    stock: 100,
    sortOrder: 30,
  },
  {
    code: "CHEF-TASTING",
    titleFa: "تجربهٔ چشایی سرآشپز",
    titleEn: "Chef tasting",
    descriptionFa: "دو برگر امضای خانه و دو نوشیدنی.",
    descriptionEn: "Two signature burgers and two drinks.",
    costPoints: 900,
    minTier: "GOLD",
    stock: 20,
    sortOrder: 40,
  },
];

export async function seedClubRewards(client = prisma) {
  for (const reward of CLUB_REWARDS) {
    await client.clubReward.upsert({
      where: { code: reward.code },
      create: reward,
      update: {
        titleFa: reward.titleFa,
        titleEn: reward.titleEn,
        descriptionFa: reward.descriptionFa,
        descriptionEn: reward.descriptionEn,
        costPoints: reward.costPoints,
        minTier: reward.minTier,
        sortOrder: reward.sortOrder,
      },
    });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedClubRewards()
    .then(() => console.log("Club rewards seeded."))
    .finally(() => prisma.$disconnect());
}
