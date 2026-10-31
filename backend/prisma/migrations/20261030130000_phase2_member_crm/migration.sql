ALTER TABLE "club_members"
  ADD COLUMN "birth_date" DATE,
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "club_terms_accepted_at" TIMESTAMP(3),
  ADD COLUMN "club_terms_source" TEXT,
  ADD COLUMN "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "marketing_consent_at" TIMESTAMP(3),
  ADD COLUMN "marketing_consent_source" TEXT;

ALTER TABLE "club_claims"
  ADD COLUMN "birth_date" DATE,
  ADD COLUMN "terms_accepted_at" TIMESTAMP(3),
  ADD COLUMN "terms_source" TEXT,
  ADD COLUMN "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "marketing_consent_at" TIMESTAMP(3),
  ADD COLUMN "marketing_consent_source" TEXT;

ALTER TABLE "cart_snapshots" ADD COLUMN "club_member_id" TEXT;
CREATE INDEX "cart_snapshots_club_member_id_status_idx" ON "cart_snapshots"("club_member_id", "status");
ALTER TABLE "cart_snapshots" ADD CONSTRAINT "cart_snapshots_club_member_id_fkey" FOREIGN KEY ("club_member_id") REFERENCES "club_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "coupons"
  ADD COLUMN "max_discount_amount" DECIMAL(12,2),
  ADD COLUMN "club_member_id" TEXT,
  ADD COLUMN "reason" TEXT;
CREATE INDEX "coupons_club_member_id_idx" ON "coupons"("club_member_id");

ALTER TABLE "chat_orders"
  ADD COLUMN "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "marketing_consent_at" TIMESTAMP(3),
  ADD COLUMN "coupon_code" TEXT,
  ADD COLUMN "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE "customer_marketing_consents" (
  "phone_hash" TEXT NOT NULL,
  "marketing_allowed" BOOLEAN NOT NULL DEFAULT false,
  "consent_at" TIMESTAMP(3),
  "source" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_marketing_consents_pkey" PRIMARY KEY ("phone_hash")
);
