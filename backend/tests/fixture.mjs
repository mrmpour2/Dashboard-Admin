import "dotenv/config";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

export async function createFixture() {
  const schema = "dashboard_test_" + randomUUID().replaceAll("-", "");
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set("schema", schema);
  process.env.DATABASE_URL = url.href;
  process.env.NODE_ENV = "test";
  process.env.ENABLE_PUBLIC_REGISTRATION = "false";
  process.env.BCRYPT_SALT_ROUNDS = "10";
  process.env.CORS_ORIGIN = "http://localhost:5174,http://127.0.0.1:5174";
  process.env.JWT_ACCESS_SECRET = "qa-access-secret-only-for-local-tests-2026";
  process.env.JWT_REFRESH_SECRET = "qa-refresh-secret-only-for-local-tests-2026";
  process.env.CHECKPOINT_DISABLE = "1";
  const client = new PrismaClient({ datasourceUrl: url.href });
  try {
    execFileSync(process.execPath, [fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url)), "db", "push", "--skip-generate"], { cwd: fileURLToPath(new URL("..", import.meta.url)), env: process.env, stdio: "pipe" });
    const { hashPassword } = await import("../src/utils/password.js");
    const password = "QaOnly12345";
    const passwordHash = await hashPassword(password);
    const admin = await client.user.create({ data: { name: "مدیر آزمایشی", email: "qa.admin@example.test", passwordHash, role: "ADMIN" } });
    const staff = await client.user.create({ data: { name: "کارشناس آزمایشی", email: "qa.staff@example.test", passwordHash, role: "STAFF" } });
    const manager = await client.user.create({ data: { name: "مدیر فروش آزمایشی", email: "qa.manager@example.test", passwordHash, role: "MANAGER" } });
    return { client, admin, staff, manager, password, schema, cleanup: async () => {
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
