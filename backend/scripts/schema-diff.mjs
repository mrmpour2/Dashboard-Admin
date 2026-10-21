import "dotenv/config";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const sql = execFileSync(process.execPath, [fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url)), "migrate", "diff", "--from-schema-datasource", "prisma/schema.prisma", "--to-schema-datamodel", "prisma/schema.prisma", "--script"], { cwd: root, env: { ...process.env, CHECKPOINT_DISABLE: "1" }, encoding: "utf8" });
if (/^\s*(DROP\b|TRUNCATE\b|DELETE\s+FROM\b|.*\bRENAME\b)/im.test(sql)) {
  console.log(sql);
  throw new Error("Schema diff contains destructive operations; review manually.");
}
mkdirSync(new URL("../prisma/upgrades", import.meta.url), { recursive: true });
writeFileSync(new URL("../prisma/upgrades/20261012-store-rebuild.sql", import.meta.url), sql);
console.log(sql);
