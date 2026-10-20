-- AlterTable
ALTER TABLE "club_members" ADD COLUMN     "legacy_points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "legacy_released_at" TIMESTAMP(3),
ADD COLUMN     "legacy_until" TIMESTAMP(3),
ADD COLUMN     "verification_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "verified_at" TIMESTAMP(3),
ADD COLUMN     "verified_phone" TEXT;

-- AlterTable
ALTER TABLE "club_point_transactions" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'available';

-- CreateTable
CREATE TABLE "club_claims" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "member_id" TEXT,
    "challenge_id" TEXT,
    "verified_phone" TEXT,
    "verified_at" TIMESTAMP(3),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_point_accruals" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "member_id" TEXT,
    "source" "ClubPointSource" NOT NULL,
    "source_id" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),

    CONSTRAINT "club_point_accruals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "club_claims_phone_created_at_idx" ON "club_claims"("phone", "created_at");

-- CreateIndex
CREATE INDEX "club_claims_user_id_created_at_idx" ON "club_claims"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "club_point_accruals_phone_status_idx" ON "club_point_accruals"("phone", "status");

-- CreateIndex
CREATE INDEX "club_point_accruals_member_id_status_idx" ON "club_point_accruals"("member_id", "status");

-- Existing balances/ledger are quarantined, never deleted or granted by PIN.
UPDATE club_members SET verification_status='legacy_unverified', legacy_until=now()+interval '30 days',
 legacy_points="pointsBalance", "pointsBalance"=0, "tokenVersion"="tokenVersion"+1;
UPDATE club_point_transactions SET status='legacy_unverified';
INSERT INTO club_claims(id,phone,user_id,name,pin_hash,status,member_id,created_at,updated_at)
 SELECT 'legacy:'||id,phone,'legacy:'||id,name,"pinHash",'legacy_unverified',id,now(),now() FROM club_members;
INSERT INTO security_outbox(id,key,kind,order_id,payload)
 SELECT 'reverify:'||id,'club-reverify:'||id,'notification',id,jsonb_build_object('reason','club_reverification_required','memberId',id,'phone',phone,'channel','sms') FROM club_members;
CREATE UNIQUE INDEX club_claim_verified_phone ON club_claims(phone) WHERE status='verified';
CREATE UNIQUE INDEX club_claim_pending_actor ON club_claims(phone,user_id) WHERE status='pending';
CREATE UNIQUE INDEX club_member_verified_phone ON club_members(verified_phone) WHERE verification_status='verified';
ALTER TABLE club_claims ADD CONSTRAINT claim_status CHECK(status IN ('pending','verified','rejected','disputed','legacy_unverified'));
ALTER TABLE club_claims ADD CONSTRAINT claim_proof CHECK(status <> 'verified' OR (verified_phone IS NOT NULL AND verified_phone=phone AND verified_at IS NOT NULL AND member_id IS NOT NULL));
ALTER TABLE club_members ADD CONSTRAINT member_proof CHECK(verification_status IN ('pending','legacy_unverified','verified') AND (verification_status <> 'verified' OR (verified_phone IS NOT NULL AND verified_phone=phone AND verified_at IS NOT NULL)));
ALTER TABLE club_members ADD CONSTRAINT member_points_nonnegative CHECK("pointsBalance" >= 0 AND legacy_points >= 0);
ALTER TABLE club_claims ADD CONSTRAINT claim_member_fk FOREIGN KEY(member_id) REFERENCES club_members(id) ON DELETE RESTRICT;
ALTER TABLE club_point_accruals ADD CONSTRAINT accrual_member_fk FOREIGN KEY(member_id) REFERENCES club_members(id) ON DELETE RESTRICT;
ALTER TABLE club_point_accruals ADD CONSTRAINT accrual_valid CHECK(points>0 AND status IN ('pending','available','clawed_back'));
ALTER TABLE club_point_transactions ADD CONSTRAINT ledger_status CHECK(status IN ('available','legacy_unverified'));
CREATE TRIGGER club_ledger_append_only BEFORE UPDATE OR DELETE ON club_point_transactions FOR EACH ROW EXECUTE FUNCTION immutable_security_audit();

-- CreateIndex
CREATE UNIQUE INDEX "club_point_accruals_source_source_id_key" ON "club_point_accruals"("source", "source_id");
