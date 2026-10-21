-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ClubTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "ClubPointType" AS ENUM ('EARN', 'REDEEM', 'ADJUST');

-- CreateEnum
CREATE TYPE "ClubPointSource" AS ENUM ('ORDER', 'REVIEW', 'REWARD', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ClubRedemptionStatus" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChatMessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "ChatOrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChatPaymentMethod" AS ENUM ('ZIBAL', 'CARD_TO_CARD');

-- CreateEnum
CREATE TYPE "ChatPaymentStatus" AS ENUM ('INITIATED', 'PENDING', 'PAID', 'FAILED', 'PENDING_REVIEW', 'REJECTED');

-- CreateTable
CREATE TABLE "product_addons" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorNameEn" TEXT,
    "authorPhone" TEXT,
    "clubMemberId" TEXT,
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

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelEn" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_members" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "pointsBalance" INTEGER NOT NULL DEFAULT 0,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_point_transactions" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "ClubPointType" NOT NULL,
    "source" "ClubPointSource" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_point_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_rewards" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_redemptions" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "pointsSpent" INTEGER NOT NULL,
    "status" "ClubRedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilledAt" TIMESTAMP(3),

    CONSTRAINT "club_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "ChatMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "conversationId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "shippingAddress" TEXT NOT NULL,
    "status" "ChatOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "subtotalAmount" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "variantLabel" TEXT,
    "parentItemId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "chat_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" "ChatPaymentMethod" NOT NULL,
    "status" "ChatPaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "amountToman" DECIMAL(12,2) NOT NULL,
    "amountRial" BIGINT,
    "zibalTrackId" TEXT,
    "zibalRefNumber" TEXT,
    "receiptPath" TEXT,
    "transferReference" TEXT,
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_addons_productId_sortOrder_idx" ON "product_addons"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "product_addons_addOnId_idx" ON "product_addons"("addOnId");

-- CreateIndex
CREATE UNIQUE INDEX "product_addons_productId_addOnId_key" ON "product_addons"("productId", "addOnId");

-- CreateIndex
CREATE INDEX "reviews_productId_status_createdAt_idx" ON "reviews"("productId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "reviews_status_featured_featuredOrder_idx" ON "reviews"("status", "featured", "featuredOrder");

-- CreateIndex
CREATE INDEX "product_variants_productId_sortOrder_idx" ON "product_variants"("productId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_productId_label_key" ON "product_variants"("productId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "club_members_phone_key" ON "club_members"("phone");

-- CreateIndex
CREATE INDEX "club_point_transactions_memberId_createdAt_idx" ON "club_point_transactions"("memberId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "club_point_transactions_memberId_source_sourceId_key" ON "club_point_transactions"("memberId", "source", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "club_rewards_code_key" ON "club_rewards"("code");

-- CreateIndex
CREATE INDEX "club_rewards_isActive_sortOrder_idx" ON "club_rewards"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "club_redemptions_code_key" ON "club_redemptions"("code");

-- CreateIndex
CREATE INDEX "club_redemptions_memberId_createdAt_idx" ON "club_redemptions"("memberId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "club_redemptions_memberId_idempotencyKey_key" ON "club_redemptions"("memberId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "chat_conversations_sessionId_key" ON "chat_conversations"("sessionId");

-- CreateIndex
CREATE INDEX "chat_conversations_createdAt_idx" ON "chat_conversations"("createdAt");

-- CreateIndex
CREATE INDEX "chat_messages_conversationId_createdAt_idx" ON "chat_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "chat_orders_orderNumber_key" ON "chat_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "chat_orders_status_createdAt_idx" ON "chat_orders"("status", "createdAt");

-- CreateIndex
CREATE INDEX "chat_orders_customerPhone_idx" ON "chat_orders"("customerPhone");

-- CreateIndex
CREATE INDEX "chat_order_items_orderId_idx" ON "chat_order_items"("orderId");

-- CreateIndex
CREATE INDEX "chat_order_items_variantId_idx" ON "chat_order_items"("variantId");

-- CreateIndex
CREATE INDEX "chat_order_items_parentItemId_idx" ON "chat_order_items"("parentItemId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_payments_zibalTrackId_key" ON "chat_payments"("zibalTrackId");

-- CreateIndex
CREATE INDEX "chat_payments_orderId_status_idx" ON "chat_payments"("orderId", "status");

-- CreateIndex
CREATE INDEX "chat_payments_method_status_createdAt_idx" ON "chat_payments"("method", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "product_addons" ADD CONSTRAINT "product_addons_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_addons" ADD CONSTRAINT "product_addons_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_clubMemberId_fkey" FOREIGN KEY ("clubMemberId") REFERENCES "club_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_point_transactions" ADD CONSTRAINT "club_point_transactions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "club_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_redemptions" ADD CONSTRAINT "club_redemptions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "club_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_redemptions" ADD CONSTRAINT "club_redemptions_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "club_rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_orders" ADD CONSTRAINT "chat_orders_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_order_items" ADD CONSTRAINT "chat_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "chat_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_order_items" ADD CONSTRAINT "chat_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_order_items" ADD CONSTRAINT "chat_order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_order_items" ADD CONSTRAINT "chat_order_items_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "chat_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_payments" ADD CONSTRAINT "chat_payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "chat_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

