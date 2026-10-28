import crypto from "node:crypto";

export function hashCartSession(sessionId) {
  return crypto.createHash("sha256").update(sessionId).digest("hex");
}

export async function markCartConverted(tx, sessionId, convertedAt = new Date()) {
  if (!sessionId) return 0;
  const result = await tx.cartSnapshot.updateMany({
    where: { sessionHash: hashCartSession(sessionId), status: "ACTIVE" },
    data: { status: "CONVERTED", convertedAt, lastActivity: convertedAt },
  });
  return result.count;
}
