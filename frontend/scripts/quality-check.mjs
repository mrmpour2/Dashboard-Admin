import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const errors = [];
const warnings = [];
const extensions = [".js", ".jsx", ".ts", ".tsx"];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", ".git"].includes(entry.name)) return [];
      return walk(full);
    }
    return [full];
  });
}

const files = walk(src);
const sourceFiles = files.filter((file) => extensions.includes(path.extname(file)));

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file);

  if (/\b(eval|Function)\s*\(/.test(text)) errors.push(`${rel}: dynamic code execution detected`);
  if (/dangerouslySetInnerHTML|\.innerHTML\s*=/.test(text)) errors.push(`${rel}: unsafe HTML injection API detected`);
  if (/localStorage\.(setItem|getItem)\(["'][^"']*(token|password|secret)/i.test(text)) {
    errors.push(`${rel}: sensitive credential stored in web storage`);
  }
  if (/\bconsole\.(log|debug)\s*\(/.test(text)) warnings.push(`${rel}: debug console call`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (!fs.existsSync(path.join(root, "package-lock.json"))) errors.push("package-lock.json is missing");
if (!packageJson.scripts?.build) errors.push("build script is missing");
if (!packageJson.scripts?.lint) warnings.push("lint script is missing");

const routeFiles = [
  "src/features/Home/Home.jsx",
  "src/features/Products/Products.jsx",
  "src/features/Users/Users.jsx",
  "src/features/Tickets/Tickets.jsx",
  "src/features/Tickets/TicketDetail.jsx",
  "src/features/Comments/Comments.jsx",
  "src/features/NotFound/NotFound.jsx",
];
for (const rel of routeFiles) {
  if (!fs.existsSync(path.join(root, rel))) errors.push(`missing route component: ${rel}`);
}

const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
if (!/<html[^>]*lang="fa-IR"/.test(index)) warnings.push("document language is not fa-IR");
if (!/<html[^>]*dir="rtl"/.test(index)) warnings.push("document direction is not rtl");

const stats = {
  sourceFiles: sourceFiles.length,
  sourceBytes: sourceFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0),
  uiComponentFolders: fs.readdirSync(path.join(src, "components/ui"), { withFileTypes: true }).filter((e) => e.isDirectory()).length,
};

console.log(JSON.stringify({ status: errors.length ? "FAIL" : "PASS", stats, warnings, errors }, null, 2));
if (errors.length) process.exit(1);
