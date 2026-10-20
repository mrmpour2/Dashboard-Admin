-- ارتقای دیتابیس: واریانت‌های محصول (سایز/بسته) و اتصال آن‌ها به آیتم‌های سفارش.
--
-- چرا فایل داخل `prisma/upgrades` و نه migration؟
-- جدول‌های سفارش/گفتگو (`chat_orders`, `chat_order_items`, ...) در پوشه
-- `prisma/migrations` ساخته نشده‌اند و فقط در `schema.prisma` تعریف شده‌اند؛ پس
-- یک migration تازه روی دیتابیس اصلی شکست می‌خورد. مثل
-- `20261012-store-rebuild.sql`، این فایل یک «پیش‌نویس قابل بازبینی» است:
-- ابتدا روی کپی دیتابیس اجرا و بررسی می‌شود، سپس روی اصلی (راهنما:
-- dashboard/HANDOFF_FA.md). منبع حقیقت ساختار همچنان `schema.prisma` است؛
-- روی محیط‌هایی که با `prisma db push` ساخته می‌شوند اجرای این فایل لازم نیست.
--
-- این اسکریپت idempotent است: اجرای دوباره‌اش تغییری ایجاد نمی‌کند و اگر جدول
-- `chat_order_items` وجود نداشته باشد، فقط جدول واریانت‌ها را می‌سازد.

BEGIN;

-- CreateTable
CREATE TABLE IF NOT EXISTS "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelEn" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "product_variants_productId_label_key" ON "product_variants"("productId", "label");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "product_variants_productId_sortOrder_idx" ON "product_variants"("productId", "sortOrder");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_productId_fkey') THEN
    ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AlterTable: ستون‌های واریانت روی آیتم سفارش (فقط اگر جدول وجود داشته باشد)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_order_items') THEN
    ALTER TABLE "chat_order_items" ADD COLUMN IF NOT EXISTS "variantId" TEXT;
    ALTER TABLE "chat_order_items" ADD COLUMN IF NOT EXISTS "variantLabel" TEXT;

    CREATE INDEX IF NOT EXISTS "chat_order_items_variantId_idx" ON "chat_order_items"("variantId");

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_order_items_variantId_fkey') THEN
      ALTER TABLE "chat_order_items" ADD CONSTRAINT "chat_order_items_variantId_fkey"
        FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- بازگشت (rollback) — در صورت نیاز، دستی و پس از پشتیبان‌گیری:
--
--   ALTER TABLE "chat_order_items" DROP CONSTRAINT IF EXISTS "chat_order_items_variantId_fkey";
--   DROP INDEX IF EXISTS "chat_order_items_variantId_idx";
--   ALTER TABLE "chat_order_items" DROP COLUMN IF EXISTS "variantLabel";
--   ALTER TABLE "chat_order_items" DROP COLUMN IF EXISTS "variantId";
--   DROP TABLE IF EXISTS "product_variants";
---------------------------------------------------------------------------
