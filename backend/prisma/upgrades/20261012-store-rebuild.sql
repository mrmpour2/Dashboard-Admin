-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "couponId" TEXT,
ADD COLUMN     "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "subtotalAmount" DECIMAL(12,2) NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "authVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" DECIMAL(12,2) NOT NULL,
    "minOrderAmount" DECIMAL(12,2),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- AddForeignKey
-- گام ۱: افزودن ستون به صورت Nullable یا دارای مقدار پیش‌فرض صفر
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "subtotalAmount" DECIMAL(12,2) DEFAULT 0.00;

-- گام ۲: مقداردهی (Backfill) داده‌های پیشین بر اساس totalAmount (در صورت وجود)
UPDATE "orders" SET "subtotalAmount" = "totalAmount" WHERE "subtotalAmount" IS NULL OR "subtotalAmount" = 0.00;

-- گام ۳: اعمال قید NOT NULL پس از تضمین یکپارچگی داده‌ها
ALTER TABLE "orders" ALTER COLUMN "subtotalAmount" SET NOT NULL;

