-- ارتقای دیتابیس: مخلفات پیشنهادی محصول (نوشیدنی/ساید/سس) و اتصال ردیف مخلفات
-- به ردیف غذای اصلی در سفارش.
--
-- چرا فایل داخل `prisma/upgrades` و نه migration؟ مثل
-- `20261016-product-variants.sql`، جدول‌های سفارش/گفتگو در `prisma/migrations`
-- ساخته نشده‌اند و یک migration تازه روی دیتابیس اصلی شکست می‌خورد. این فایل یک
-- «پیش‌نویس قابل بازبینی» است: ابتدا روی کپی دیتابیس اجرا و بررسی می‌شود، سپس
-- روی اصلی (راهنما: dashboard/HANDOFF_FA.md). منبع حقیقت ساختار همچنان
-- `schema.prisma` است؛ روی محیط‌هایی که با `prisma db push` ساخته می‌شوند
-- (از جمله اسکیمای تست) اجرای این فایل لازم نیست.
--
-- idempotent است: اجرای دوباره‌اش تغییری ایجاد نمی‌کند و اگر جدول
-- `chat_order_items` وجود نداشته باشد، فقط جدول مخلفات را می‌سازد.
--
-- تغییر داده: هیچ رکوردی بازنویسی نمی‌شود. مخلفات هر غذا را مدیر از پنل
-- (فرم محصول → «مخلفات پیشنهادی») تعیین می‌کند.

BEGIN;

-- CreateTable
CREATE TABLE IF NOT EXISTS "product_addons" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_addons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "product_addons_productId_addOnId_key" ON "product_addons"("productId", "addOnId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "product_addons_productId_sortOrder_idx" ON "product_addons"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "product_addons_addOnId_idx" ON "product_addons"("addOnId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_addons_productId_fkey') THEN
    ALTER TABLE "product_addons" ADD CONSTRAINT "product_addons_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_addons_addOnId_fkey') THEN
    ALTER TABLE "product_addons" ADD CONSTRAINT "product_addons_addOnId_fkey"
      FOREIGN KEY ("addOnId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AlterTable: پیوند ردیف مخلفات به ردیف غذای اصلی (فقط اگر جدول وجود داشته باشد)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_order_items') THEN
    ALTER TABLE "chat_order_items" ADD COLUMN IF NOT EXISTS "parentItemId" TEXT;

    CREATE INDEX IF NOT EXISTS "chat_order_items_parentItemId_idx" ON "chat_order_items"("parentItemId");

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_order_items_parentItemId_fkey') THEN
      ALTER TABLE "chat_order_items" ADD CONSTRAINT "chat_order_items_parentItemId_fkey"
        FOREIGN KEY ("parentItemId") REFERENCES "chat_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- بازگشت (rollback) — در صورت نیاز، دستی و پس از پشتیبان‌گیری:
--
--   ALTER TABLE "chat_order_items" DROP CONSTRAINT IF EXISTS "chat_order_items_parentItemId_fkey";
--   DROP INDEX IF EXISTS "chat_order_items_parentItemId_idx";
--   ALTER TABLE "chat_order_items" DROP COLUMN IF EXISTS "parentItemId";
--   DROP TABLE IF EXISTS "product_addons";
---------------------------------------------------------------------------
