// این اسکریپت دیتابیس را با منوی واقعی رستوران پر می‌کند (فقط برای محیط توسعه/دمو).
// اجرا: npm run seed
//
// اجرای دوباره بی‌خطر است: محصولات با «نام» شناسایی و به‌روزرسانی می‌شوند و
// سایزهای هر پیتزا با `upsert` هم‌سان می‌مانند. تیکت نمونه هم فقط یک‌بار ساخته
// می‌شود.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** سه سایز استاندارد پیتزا؛ همان‌هایی که در سایت قابل انتخاب هستند. */
const pizzaSizes = (single, double, six) => [
  { label: "تک نفره", labelEn: "Single serving (1 person)", price: single, sortOrder: 0 },
  { label: "دو نفره", labelEn: "Double serving (2 people)", price: double, sortOrder: 1 },
  { label: "شش نفره", labelEn: "Party size (6 people)", price: six, sortOrder: 2 },
];

/**
 * منوی رستوران. `price` قیمت پایه است و برای پیتزاها همان قیمت سایز تک‌نفره
 * است؛ پس کارت منو و صفحه محصول یک عدد نشان می‌دهند.
 *
 * دسته‌بندی‌ها با کلیدواژه‌هایی نوشته شده‌اند که
 * `src/services/publicMenuService.js` به دسته‌های سایت نگاشت می‌کند:
 * «برگر» → burgers، «پیتزا» → pizza، «ساید» → sides، «نوشیدنی» → drinks و
 * «پک» → combos.
 *
 * `addOns` نام محصولاتی است که در پنل مشتری «مخلفات پیشنهادی» این غذا می‌شوند
 * (نوشیدنی و ساید). پک و خود ساید/نوشیدنی مخلفات ندارند. این فهرست بعد از ساخت
 * همه محصولات وصل می‌شود، پس ترتیب تعریف مهم نیست.
 */
const SIDE_AND_DRINK = ["فرایز امبر", "کولای لیموی تازه"];
const DRINK_AND_RINGS = ["حلقه‌های طلایی", "کولای لیموی تازه"];

const menu = [
  {
    name: "اسموکی اسمش",
    description: "دو پتی لبه‌برشته، چدار دودی و سس مخصوص خانه.",
    price: 485000,
    stock: 40,
    category: "برگر",
    addOns: SIDE_AND_DRINK,
  },
  {
    name: "فایرهاوس دوبل",
    description: "گوشت دوبل، سس آتشین، هالوپینو و پنیر آب‌شده.",
    price: 525000,
    stock: 35,
    category: "برگر",
    addOns: SIDE_AND_DRINK,
  },
  {
    name: "کریسپی زعفرانی",
    description: "مرغ باترمیلک، آیولی زعفرانی و خیارشور ترد.",
    price: 445000,
    stock: 30,
    category: "برگر",
    addOns: SIDE_AND_DRINK,
  },
  {
    name: "گاردن چار",
    description: "پتی سبزیجات گریل‌شده، سبزی تازه و سس ارده.",
    price: 395000,
    stock: 25,
    category: "برگر",
    addOns: SIDE_AND_DRINK,
  },
  {
    name: "پیتزا مارگاریتا",
    description: "گوجه سان‌مارزانو، پنیر فیوردیلاته و ریحان تازه روی خمیر حباب‌دار.",
    price: 235000,
    stock: 20,
    category: "پیتزا",
    variants: pizzaSizes(235000, 425000, 980000),
    addOns: DRINK_AND_RINGS,
  },
  {
    name: "پیتزا پپرونی",
    description: "پپرونی گوشت، موزارلا و عسل فلفلی.",
    price: 285000,
    stock: 20,
    category: "پیتزا",
    variants: pizzaSizes(285000, 495000, 1150000),
    addOns: DRINK_AND_RINGS,
  },
  {
    name: "پیتزا مخصوص الین",
    description: "گوشت ادویه‌دار، قارچ سیر، فلفل گریل و چدار دودی.",
    price: 315000,
    stock: 15,
    category: "پیتزا",
    variants: pizzaSizes(315000, 545000, 1280000),
    addOns: DRINK_AND_RINGS,
  },
  {
    name: "پیتزا سبزیجات گاردن",
    description: "کدوی گریل، قارچ، گوجه گیلاسی و پستوی ریحان.",
    price: 265000,
    stock: 18,
    category: "پیتزا",
    variants: pizzaSizes(265000, 465000, 1090000),
    addOns: DRINK_AND_RINGS,
  },
  {
    name: "فرایز امبر",
    description: "سیب‌زمینی پوست‌دار ترد، ادویه امبر و دیپ سیر برشته.",
    price: 185000,
    stock: 60,
    category: "ساید",
  },
  {
    name: "حلقه‌های طلایی",
    description: "حلقه‌های پیاز سوخاری با دیپ خردل ترش.",
    price: 210000,
    stock: 45,
    category: "ساید",
  },
  {
    name: "کولای لیموی تازه",
    description: "کولای دست‌ساز یخی، لیموی تازه و نعناع خردشده.",
    price: 125000,
    stock: 80,
    category: "نوشیدنی",
  },
  {
    name: "ضیافت شب",
    description: "دو برگر ویژه، فرایز مخصوص و دو نوشیدنی خنک.",
    price: 1050000,
    stock: 10,
    category: "پک",
  },
];

/**
 * روایت‌های بخش «Table Talk» صفحهٔ اصلی.
 *
 * این سه روایت تا امروز به‌صورت متن ثابت در `website/src/data/content.ts`
 * بودند و روی سایت منتشر شده‌اند؛ اینجا فقط یک‌بار به دیتابیس منتقل می‌شوند تا
 * از پنل مدیریت قابل ویرایش/حذف باشند. هیچ امتیاز یا سفارشی برایشان ساخته
 * نمی‌شود: امتیازشان خالی می‌ماند چون دادهٔ واقعی پشتش نیست.
 */
const tableTalk = [
  {
    authorName: "نیما رضایی",
    authorNameEn: "Nima R.",
    body: "چیز برگرد واقعا خوش طعم  است، اما طعم گوشت را پنهان نمی‌کند. بهترین برگر آخر شب شهر.",
    bodyEn: "The Firehouse has real heat without hiding the beef. Best late-night burger in town.",
  },
  {
    authorName: "سارا محمودی",
    authorNameEn: "Sara M.",
    body: "سرویس سریع، پرسنل خوش‌برخورد و آن سس زعفرانی باعث می‌شود همیشه برگردم.",
    bodyEn: "Fast service, thoughtful staff and that saffron sauce keeps me coming back.",
  },
  {
    authorName: "آرمان کریمی",
    authorNameEn: "Arman K.",
    body: "یک منوی جمع‌وجور که درست اجرا شده؛ لبه‌های ترد، نان نرم و بدون شلوغ‌کاری اضافه.",
    bodyEn: "A focused menu done properly. Crisp edges, soft buns, and no unnecessary fuss.",
  },
];

/** روایت را با نام نویسنده پیدا می‌کند، وگرنه می‌سازد (idempotent). */
async function upsertTableTalk(entry, featuredOrder) {
  const existing = await prisma.review.findFirst({
    where: { authorName: entry.authorName },
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.review.create({
    data: { ...entry, status: "APPROVED", featured: true, featuredOrder },
  });
}

/** محصول را با نام پیدا و به‌روزرسانی می‌کند، وگرنه می‌سازد (idempotent). */
async function upsertProduct(entry) {
  const { variants = [], ...product } = entry;
  const existing = await prisma.product.findFirst({
    where: { name: product.name },
    select: { id: true },
  });

  const saved = existing
    ? await prisma.product.update({ where: { id: existing.id }, data: product })
    : await prisma.product.create({ data: product });

  for (const variant of variants) {
    await prisma.productVariant.upsert({
      where: { productId_label: { productId: saved.id, label: variant.label } },
      create: { productId: saved.id, ...variant },
      update: variant,
    });
  }

  return saved;
}

/**
 * مخلفات پیشنهادی یک غذا را با «نام» محصول پیدا و ثبت می‌کند (idempotent).
 * ترتیب فهرست، ترتیب نمایش در پنل مشتری است.
 */
async function syncAddOns(productId, addOnNames) {
  for (const [index, name] of addOnNames.entries()) {
    const addOn = await prisma.product.findFirst({
      where: { name },
      select: { id: true },
    });
    // مخلفاتِ تعریف‌نشده یا خود محصول نادیده گرفته می‌شود.
    if (!addOn || addOn.id === productId) continue;

    await prisma.productAddOn.upsert({
      where: { productId_addOnId: { productId, addOnId: addOn.id } },
      create: { productId, addOnId: addOn.id, sortOrder: index },
      update: { sortOrder: index, isActive: true },
    });
  }
}

async function main() {
  const passwordHash = await bcrypt.hash("Passw0rd!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "mr.mpour2@gmail.com" },
    update: {},
    create: {
      name: "محمدرضا محمدی پور",
      email: "mr.mpour2@gmail.com",
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

  // محصولات اول ساخته می‌شوند و مخلفات در پاس دوم وصل می‌شوند تا ترتیب فهرست
  // بالا مهم نباشد (ساید و نوشیدنی بعد از برگرها و پیتزاها تعریف شده‌اند).
  const addOnPlan = [];
  for (const entry of menu) {
    // `addOns` فیلد رابطه‌ای است و مستقیم روی Product نوشته نمی‌شود.
    const { addOns = [], ...productEntry } = entry;
    const saved = await upsertProduct(productEntry);
    if (addOns.length > 0) addOnPlan.push({ productId: saved.id, addOnNames: addOns });
  }
  for (const plan of addOnPlan) {
    await syncAddOns(plan.productId, plan.addOnNames);
  }

  // روایت‌های Table Talk؛ اجرای دوبارهٔ seed آن‌ها را تکراری نمی‌کند.
  for (const [index, entry] of tableTalk.entries()) {
    await upsertTableTalk(entry, index);
  }

  // تیکت نمونه فقط یک‌بار ساخته می‌شود تا اجرای دوباره seed داده را شلوغ نکند.
  const existingTicket = await prisma.ticket.findFirst({
    where: { title: "مشکل در پرداخت آنلاین" },
    select: { id: true },
  });
  if (!existingTicket) {
    await prisma.ticket.create({
      data: {
        title: "مشکل در پرداخت آنلاین",
        description: "کاربر گزارش داده که درگاه پرداخت با خطای ۵۰۲ مواجه می‌شود.",
        status: "OPEN",
        priority: "HIGH",
        assignedTo: admin.id,
      },
    });
  }

  const variantCount = await prisma.productVariant.count();
  const reviewCount = await prisma.review.count();
  const addOnCount = await prisma.productAddOn.count();
  console.log("✅ منوی رستوران با موفقیت ثبت شد.");
  console.log(`   ${menu.length} محصول و ${variantCount} سایز/واریانت.`);
  console.log(`   ${addOnCount} مخلفات پیشنهادی بین غذاها.`);
  console.log(`   ${reviewCount} روایت Table Talk در دیتابیس.`);
  console.log(`   ایمیل ادمین: ${admin.email}  |  رمز عبور: Passw0rd!`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
