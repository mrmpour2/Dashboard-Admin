CREATE TYPE "CartSnapshotStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'ABANDONED');

CREATE TABLE "cart_snapshots" (
    "id" TEXT NOT NULL,
    "session_hash" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "CartSnapshotStatus" NOT NULL DEFAULT 'ACTIVE',
    "converted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cart_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cart_snapshots_session_hash_key" ON "cart_snapshots"("session_hash");
CREATE INDEX "cart_snapshots_status_last_activity_idx" ON "cart_snapshots"("status", "last_activity");
