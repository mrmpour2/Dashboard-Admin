-- باشگاه مشتریان: اعضا، دفتر امتیاز، کاتالوگ پاداش و استرداد.
-- اجرا روی دیتابیس موجود بی‌خطر است (IF NOT EXISTS / duplicate_object).

DO $$ BEGIN
  CREATE TYPE "ClubTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ClubPointType" AS ENUM ('EARN', 'REDEEM', 'ADJUST');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ClubPointSource" AS ENUM ('ORDER', 'REVIEW', 'REWARD', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ClubRedemptionStatus" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "club_members" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "pinHash" TEXT NOT NULL,
  "pointsBalance" INTEGER NOT NULL DEFAULT 0,
  "tokenVersion" INTEGER NOT NULL DEFAULT 0,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastLoginAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "club_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "club_members_phone_key" ON "club_members"("phone");

CREATE TABLE IF NOT EXISTS "club_rewards" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "titleFa" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "descriptionFa" TEXT,
  "descriptionEn" TEXT,
  "costPoints" INTEGER NOT NULL,
  "minTier" "ClubTier" NOT NULL DEFAULT 'BRONZE',
  "stock" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" TIMESTAMP(3),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "club_rewards_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "club_rewards_code_key" ON "club_rewards"("code");
CREATE INDEX IF NOT EXISTS "club_rewards_isActive_sortOrder_idx" ON "club_rewards"("isActive", "sortOrder");

CREATE TABLE IF NOT EXISTS "club_point_transactions" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "type" "ClubPointType" NOT NULL,
  "source" "ClubPointSource" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "club_point_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "club_point_transactions_memberId_fkey" FOREIGN KEY ("memberId")
    REFERENCES "club_members"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "club_point_transactions_memberId_source_sourceId_key"
  ON "club_point_transactions"("memberId", "source", "sourceId");
CREATE INDEX IF NOT EXISTS "club_point_transactions_memberId_createdAt_idx"
  ON "club_point_transactions"("memberId", "createdAt");

CREATE TABLE IF NOT EXISTS "club_redemptions" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "rewardId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "pointsSpent" INTEGER NOT NULL,
  "status" "ClubRedemptionStatus" NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fulfilledAt" TIMESTAMP(3),
  CONSTRAINT "club_redemptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "club_redemptions_memberId_fkey" FOREIGN KEY ("memberId")
    REFERENCES "club_members"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "club_redemptions_rewardId_fkey" FOREIGN KEY ("rewardId")
    REFERENCES "club_rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "club_redemptions_code_key" ON "club_redemptions"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "club_redemptions_memberId_idempotencyKey_key"
  ON "club_redemptions"("memberId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "club_redemptions_memberId_createdAt_idx"
  ON "club_redemptions"("memberId", "createdAt");

-- نظر تأییدشده می‌تواند به عضو باشگاه نسبت داده شود تا امتیاز نظر یک بار
-- و فقط برای همان عضو ثبت شود.
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "clubMemberId" TEXT;
CREATE INDEX IF NOT EXISTS "reviews_clubMemberId_idx" ON "reviews"("clubMemberId");
DO $$ BEGIN
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_clubMemberId_fkey"
    FOREIGN KEY ("clubMemberId") REFERENCES "club_members"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- پاداش‌های اولیه؛ قیمت‌ها/موجودی بعد از استقرار از دیتابیس قابل تغییر است.
INSERT INTO "club_rewards"
  ("id", "code", "titleFa", "titleEn", "descriptionFa", "descriptionEn",
   "costPoints", "minTier", "stock", "isActive", "sortOrder", "updatedAt")
VALUES
  ('club_reward_fries', 'FRIES-ON-US', 'سیب‌زمینی سرخ‌کرده مهمان ما', 'Fries on us',
   'یک پرس سیب‌زمینی تازه با سس مخصوص خانه.', 'A portion of fresh fries with our house sauce.',
   100, 'BRONZE', NULL, true, 10, CURRENT_TIMESTAMP),
  ('club_reward_drink', 'DRINK-ON-US', 'نوشیدنی دلخواه', 'Any drink',
   'یک لیوان نوشیدنی از منوی رستوران.', 'One drink from the restaurant menu.',
   180, 'BRONZE', NULL, true, 20, CURRENT_TIMESTAMP),
  ('club_reward_burger', 'BURGER-OF-CHOICE', 'برگر به انتخاب شما', 'Burger of your choice',
   'هر برگر کلاسیک منو، شامل سیب‌زمینی کنار آن.', 'Any classic burger, served with fries.',
   450, 'SILVER', 100, true, 30, CURRENT_TIMESTAMP),
  ('club_reward_tasting', 'CHEF-TASTING', 'تجربهٔ چشایی سرآشپز', 'Chef tasting',
   'دو برگر امضای خانه و دو نوشیدنی.', 'Two signature burgers and two drinks.',
   900, 'GOLD', 20, true, 40, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
