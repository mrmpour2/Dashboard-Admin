import "dotenv/config";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { mkdtempSync, cpSync, rmSync } from "node:fs";
import path from "node:path";

export async function createFixture({ beforeClubMigration } = {}) {
  const target = new URL(process.env.DATABASE_URL);
  if (!["127.0.0.1", "localhost"].includes(target.hostname) || target.port !== "55439" || target.pathname !== "/elin_audit") throw new Error("Tests require the disposable localhost:55439/elin_audit database");
  const schema = "dashboard_test_" + randomUUID().replaceAll("-", "");
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set("schema", schema);
  process.env.DATABASE_URL = url.href;
  process.env.NODE_ENV = "test";
  process.env.OPENAI_API_KEY = "";
  process.env.SECURITY_PROVIDER_MODE = "mock";
  process.env.STOCK_ROLLOUT_PERCENT = "100";
  process.env.STOCK_JOB_DRY_RUN = "false";
  process.env.ENABLE_PUBLIC_REGISTRATION = "false";
  process.env.BCRYPT_SALT_ROUNDS = "10";
  process.env.CORS_ORIGIN = "http://localhost:5174,http://127.0.0.1:5174";
  process.env.JWT_ACCESS_SECRET = "qa-access-secret-only-for-local-tests-2026";
  process.env.JWT_REFRESH_SECRET = "qa-refresh-secret-only-for-local-tests-2026";
  process.env.CHECKPOINT_DISABLE = "1";
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const address = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    if (!["localhost", "127.0.0.1"].includes(address.hostname)) throw new Error("External HTTP is forbidden in tests; install an explicit mock");
    return nativeFetch(input, init);
  };
  const client = new PrismaClient({ datasourceUrl: url.href });
  try {
    if (beforeClubMigration) {
      const root = fileURLToPath(new URL("..", import.meta.url));
      const temporary = mkdtempSync(path.join(root, "tests", ".migration-fixture-"));
      try {
        cpSync(path.join(root, "prisma", "schema.prisma"), path.join(temporary, "schema.prisma"));
        cpSync(path.join(root, "prisma", "migrations"), path.join(temporary, "migrations"), { recursive: true, filter: source => !source.includes("20261020020000_verified_club_phone") });
        execFileSync(process.execPath, [path.join(root, "node_modules/prisma/build/index.js"), "migrate", "deploy", "--schema", path.join(temporary, "schema.prisma")], { cwd: root, env: process.env, stdio: "pipe" });
        await beforeClubMigration(client);
      } finally {
        if (path.dirname(temporary) !== path.join(root, "tests") || !path.basename(temporary).startsWith(".migration-fixture-")) throw new Error("Unsafe temporary migration directory");
        rmSync(temporary, { recursive: true, force: true });
      }
    }
    execFileSync(process.execPath, [fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url)), "migrate", "deploy"], { cwd: fileURLToPath(new URL("..", import.meta.url)), env: process.env, stdio: "pipe" });
    const { hashPassword } = await import("../src/utils/password.js");
    const password = "QaOnly12345";
    const passwordHash = await hashPassword(password);
    const admin = await client.user.create({ data: { name: "مدیر آزمایشی", email: "qa.admin@example.test", passwordHash, role: "ADMIN" } });
    const staff = await client.user.create({ data: { name: "کارشناس آزمایشی", email: "qa.staff@example.test", passwordHash, role: "STAFF" } });
    const manager = await client.user.create({ data: { name: "مدیر فروش آزمایشی", email: "qa.manager@example.test", passwordHash, role: "MANAGER" } });
    return { client, admin, staff, manager, password, schema,
      checkoutHeaders(phone, ip = "192.0.2.100") {
        const ipHash = crypto.createHmac("sha256", process.env.JWT_ACCESS_SECRET).update(ip).digest("hex");
        const proof = jwt.sign({ phone, scope: "checkout", ipHash }, process.env.JWT_ACCESS_SECRET, { expiresIn: "5m", audience: "checkout", issuer: "elin-checkout" });
        return { Cookie: `checkout_proof=${proof}`, "X-Forwarded-For": ip, "Idempotency-Key": crypto.randomUUID() };
      }, cleanup: async () => {
      globalThis.fetch = nativeFetch;
      if (!/^dashboard_test_[a-f0-9]{32}$/.test(schema)) throw new Error("Unsafe test schema name");
      await client.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
      await client.$disconnect();
    } };
  } catch (error) {
    await client.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => {});
    await client.$disconnect();
    throw error;
  }
}
