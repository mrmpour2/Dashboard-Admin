ALTER TYPE "ChatPaymentMethod" ADD VALUE 'CASH_ON_DELIVERY';

ALTER TABLE "products"
ADD COLUMN "ingredients" TEXT,
ADD COLUMN "allergenInfo" TEXT,
ADD COLUMN "purchaseConditions" TEXT;

ALTER TABLE "chat_orders"
ADD COLUMN "deliveryFeeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "paymentMethod" "ChatPaymentMethod";
