-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ChatOrderStatus" ADD VALUE 'RESERVED';
ALTER TYPE "ChatOrderStatus" ADD VALUE 'EXPIRED';
ALTER TYPE "ChatOrderStatus" ADD VALUE 'REFUND_PENDING';
ALTER TYPE "ChatOrderStatus" ADD VALUE 'REFUNDED';
ALTER TYPE "ChatOrderStatus" ADD VALUE 'CONFIRMED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ChatPaymentStatus" ADD VALUE 'REFUND_PENDING';
ALTER TYPE "ChatPaymentStatus" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "chat_orders" ADD COLUMN     "accessHash" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "ipHash" TEXT,
ADD COLUMN     "phoneHash" TEXT,
ADD COLUMN     "requestHash" TEXT;

-- CreateTable
CREATE TABLE "product_stock" (
    "sku_id" TEXT NOT NULL,
    "on_hand" INTEGER NOT NULL,
    "reserved" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_stock_pkey" PRIMARY KEY ("sku_id")
);

-- CreateTable
CREATE TABLE "stock_reservations" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_kind" TEXT NOT NULL DEFAULT 'chat',
    "sku_id" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "released_at" TIMESTAMP(3),
    "release_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "phone_hash" TEXT NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_audit" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_outbox" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "security_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_reservations_order_id_order_kind_idx" ON "stock_reservations"("order_id", "order_kind");

-- CreateIndex
CREATE INDEX "otp_codes_phone_hash_subject_created_at_idx" ON "otp_codes"("phone_hash", "subject", "created_at");

-- CreateIndex
CREATE INDEX "otp_codes_ip_hash_created_at_idx" ON "otp_codes"("ip_hash", "created_at");

-- CreateIndex
CREATE INDEX "security_audit_action_created_at_idx" ON "security_audit"("action", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "security_outbox_key_key" ON "security_outbox"("key");

-- CreateIndex
CREATE UNIQUE INDEX "chat_orders_idempotencyKey_key" ON "chat_orders"("idempotencyKey");


-- The compatibility products.stock field is an available-stock projection.
ALTER TABLE product_stock ADD CONSTRAINT stock_nonnegative CHECK(on_hand >= 0 AND reserved >= 0 AND reserved <= on_hand);
ALTER TABLE stock_reservations ADD CONSTRAINT reservation_valid CHECK(qty > 0 AND status IN ('active','consumed','released','expired'));
ALTER TABLE product_stock ADD CONSTRAINT stock_product_fk FOREIGN KEY(sku_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE stock_reservations ADD CONSTRAINT reservation_product_fk FOREIGN KEY(sku_id) REFERENCES products(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX stock_reservation_active ON stock_reservations(order_id,order_kind,sku_id) WHERE status='active';
CREATE INDEX stock_reservation_expiry ON stock_reservations(expires_at) WHERE status='active';
CREATE FUNCTION project_available_stock() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 UPDATE products SET stock=NEW.on_hand-NEW.reserved WHERE id=NEW.sku_id;
 RETURN NEW;
END $$;
CREATE TRIGGER stock_projection AFTER INSERT OR UPDATE ON product_stock FOR EACH ROW EXECUTE FUNCTION project_available_stock();
CREATE FUNCTION maintain_product_stock() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
  INSERT INTO product_stock(sku_id,on_hand,reserved) VALUES(NEW.id,NEW.stock,0);
 ELSIF NEW.stock IS DISTINCT FROM OLD.stock THEN
  UPDATE product_stock SET on_hand=NEW.stock+reserved WHERE sku_id=NEW.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stock backfill required'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER product_stock_write AFTER INSERT OR UPDATE OF stock ON products FOR EACH ROW EXECUTE FUNCTION maintain_product_stock();
CREATE FUNCTION immutable_security_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Security audit records are append-only'; END $$;
CREATE TRIGGER security_audit_append_only BEFORE UPDATE OR DELETE ON security_audit FOR EACH ROW EXECUTE FUNCTION immutable_security_audit();
