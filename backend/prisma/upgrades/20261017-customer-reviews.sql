-- ارتقای دیتابیس: جدول نظرهای مشتریان (`reviews`) برای بخش «Table Talk» صفحهٔ
-- اصلی و بخش «نظر مهمان‌ها» در صفحهٔ محصول.
--
-- چرا فایل داخل `prisma/upgrades` و نه migration؟
-- همان دلیل `20261016-product-variants.sql`: بخشی از جدول‌ها فقط در
-- `schema.prisma` تعریف شده‌اند و در پوشهٔ `prisma/migrations` نیستند، پس یک
-- migration تازه روی دیتابیس موجود شکست می‌خورد. منبع حقیقت ساختار همچنان
-- `schema.prisma` است؛ روی محیط‌هایی که با `prisma db push` ساخته می‌شوند اجرای
-- این فایل لازم نیست.
--
-- این اسکریپت idempotent است: اجرای دوباره‌اش تغییری ایجاد نمی‌کند.
--
-- اعمال دستی (پس از پشتیبان‌گیری):
--   npx prisma db execute --file prisma/upgrades/20261017-customer-reviews.sql --schema prisma/schema.prisma

BEGIN;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReviewStatus') THEN
    CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "reviews" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorNameEn" TEXT,
    "authorPhone" TEXT,
    "rating" INTEGER,
    "body" TEXT NOT NULL,
    "bodyEn" TEXT,
    "orderNumber" TEXT,
    "orderVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "featuredOrder" INTEGER NOT NULL DEFAULT 0,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "replyBody" TEXT,
    "replyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- امتیاز اختیاری است؛ روی دیتابیس‌هایی که نسخهٔ پیشین جدول را با `NOT NULL`
-- ساخته‌اند هم اجرای دوبارهٔ این فایل آن را درست می‌کند.
ALTER TABLE "reviews" ALTER COLUMN "rating" DROP NOT NULL;

-- شمارهٔ تماس اختیاری مشتری (دادهٔ داخلی پنل). روی دیتابیس‌هایی که جدول را پیش از
-- افزودن این فیلد ساخته‌اند، همین دستور ستون را اضافه می‌کند؛ روی جدول تازه بی‌اثر است.
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "authorPhone" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reviews_productId_status_createdAt_idx" ON "reviews"("productId", "status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reviews_status_featured_featuredOrder_idx" ON "reviews"("status", "featured", "featuredOrder");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_productId_fkey') THEN
    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- بازگشت (rollback) — دستی و پس از پشتیبان‌گیری:
--
--   DROP TABLE IF EXISTS "reviews";
--   DROP TYPE IF EXISTS "ReviewStatus";
-- ---------------------------------------------------------------------------
