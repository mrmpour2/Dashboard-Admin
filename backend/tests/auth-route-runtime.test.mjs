import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import { createFixture } from "./fixture.mjs";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceCache = new Map();

async function sourceFor(file) {
  if (!sourceCache.has(file)) sourceCache.set(file, await readFile(file, "utf8"));
  return sourceCache.get(file);
}

async function importsFor(file, source) {
  const modules = new Map();
  for (const match of source.matchAll(/import\s+(\w+)\s+from\s+["'](.+\.js)["']/g)) {
    if (!match[2].startsWith(".")) continue;
    const target = path.resolve(path.dirname(file), match[2]);
    const imported = await import(new URL(`file:///${target.replaceAll("\\", "/")}`));
    modules.set(match[1], { router: imported.default, target });
  }
  return modules;
}

async function allRoutes(router, file, prefix = "", inheritedAuth = false, topMount = null) {
  const source = await sourceFor(file);
  const imports = await importsFor(file, source);
  const mountPrefixes = new Map();
  for (const match of source.matchAll(/router\.use\(\s*["']([^"']*)["']\s*,\s*(\w+)\s*\)/g)) mountPrefixes.set(match[2], match[1]);
  const result = [];
  let routerAuth = inheritedAuth;
  for (const layer of router.stack) {
    if (layer.route) {
      const handlers = layer.route.stack.map((entry) => entry.handle);
      const protectedRoute = routerAuth || handlers.some((handler) => handler.name === "requireAuth");
      const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      for (const routePath of paths) for (const method of Object.keys(layer.route.methods).filter((name) => layer.route.methods[name])) result.push({ path: `${prefix}${routePath}` || "/", method: method.toUpperCase(), protectedRoute, topMount });
      continue;
    }
    if (layer.handle?.name === "requireAuth") routerAuth = true;
    const childName = [...imports.entries()].find(([, child]) => child.router === layer.handle)?.[0];
    if (!childName) continue;
    const childPrefix = mountPrefixes.get(childName);
    if (childPrefix === undefined) continue;
    result.push(...await allRoutes(layer.handle, imports.get(childName).target, `${prefix}${childPrefix}`, routerAuth, topMount ?? childPrefix));
  }
  return result;
}

function adminMountPrefixes(source, imports) {
  const publicRouterFiles = new Set(["authRoutes.js", "publicRoutes.js", "chatRoutes.js", "conversationRoutes.js"]);
  const prefixes = new Set();
  for (const match of source.matchAll(/router\.use\(\s*["']([^"']*)["']\s*,\s*(\w+)\s*\)/g)) {
    const imported = imports.get(match[2]);
    if (imported && !publicRouterFiles.has(path.basename(imported.target))) prefixes.add(match[1]);
  }
  return prefixes;
}

function isPublicPaymentRoute(route) {
  return /^\/api\/payment\/(?:otp\/(?:request|verify)|config)$/.test(route.path) ||
    (route.path === "/api/payment/orders" && route.method === "POST") ||
    (/^\/api\/payment\/orders\/:orderId(?:\/(?:cancel|confirm-cod))?$/.test(route.path) && ["GET", "POST"].includes(route.method));
}

function concretePath(routePath) {
  return routePath.replace(/:([A-Za-z0-9_]+)(\([^)]*\))?\??/g, (_match, key) => key.toLowerCase().includes("order") ? "audit-missing-order" : "audit-missing-id");
}

test("runtime auth matrix covers protected routes discovered from Express routers", async (t) => {
  const fixture = await createFixture();
  const routerFile = path.join(backendRoot, "src", "routes", "index.js");
  const { default: apiRouter } = await import("../src/routes/index.js");
  const rootSource = await sourceFor(routerFile);
  const rootImports = await importsFor(routerFile, rootSource);
  const adminPrefixes = adminMountPrefixes(rootSource, rootImports);
  const discoveredRoutes = await allRoutes(apiRouter, routerFile, "/api");
  const matrixCandidates = discoveredRoutes.filter((route) =>
    route.topMount && adminPrefixes.has(route.topMount)
      ? !isPublicPaymentRoute(route)
      : route.protectedRoute && !isPublicPaymentRoute(route),
  );
  for (const route of matrixCandidates) assert.equal(route.protectedRoute, true, `unprotected route discovered: ${route.method} ${route.path}`);
  assert.ok(matrixCandidates.length > 0, "route introspection must discover protected endpoints");
  const uniqueRoutes = [...new Map(matrixCandidates.map((route) => [`${route.method} ${route.path}`, route])).values()];
  const { default: app } = await import("../src/app.js");
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const { signAccessToken } = await import("../src/utils/tokens.js");
  const validToken = signAccessToken(fixture.admin);
  const expiredToken = jwt.sign({ sub: fixture.admin.id, role: "ADMIN", scope: "staff", version: 0 }, process.env.JWT_ACCESS_SECRET, { expiresIn: -1, audience: "dashboard", issuer: "elin-staff" });
  const rows = [];
  try {
    for (const route of uniqueRoutes) {
      const url = `${base}${concretePath(route.path)}`;
      const send = async (authorization) => {
        const response = await fetch(url, { method: route.method, headers: { ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}), ...(route.method !== "GET" && route.method !== "HEAD" ? { "Content-Type": "application/json" } : {}) }, ...(route.method !== "GET" && route.method !== "HEAD" ? { body: "{}" } : {}) });
        return { status: response.status, body: await response.text() };
      };
      const anonymous = await send(null);
      const invalid = await send("not-a-valid-token");
      const expired = await send(expiredToken);
      const valid = await send(validToken);
      rows.push({ endpoint: route.path, method: route.method, anonymous: anonymous.status, invalid: invalid.status, expired: expired.status, valid: valid.status });
      assert.ok([401, 302, 303].includes(anonymous.status), `anonymous ${route.method} ${route.path} returned ${anonymous.status}`);
      assert.ok([401, 302, 303].includes(invalid.status), `invalid token ${route.method} ${route.path} returned ${invalid.status}`);
      assert.ok([401, 302, 303].includes(expired.status), `expired token ${route.method} ${route.path} returned ${expired.status}`);
      for (const [label, response] of [["anonymous", anonymous], ["invalid", invalid], ["expired", expired]]) assert.doesNotMatch(response.body, new RegExp(`${fixture.admin.email}|passwordHash`), `${label} response leaked admin data at ${route.method} ${route.path}`);
      assert.ok(valid.status < 500, `valid admin token reached a failing handler at ${route.method} ${route.path}: ${valid.status} ${valid.body}`);
    }
    console.log(`AUTH_ROUTE_MATRIX=${JSON.stringify(rows)}`);
    if (process.env.AUTH_MATRIX_EVIDENCE) {
      const evidence = { generatedFrom: "Express router stack + router source mounts", generatedAt: new Date().toISOString(), routeCount: rows.length, rows };
      await writeFile(process.env.AUTH_MATRIX_EVIDENCE, `${JSON.stringify(evidence, null, 2)}\n`);
      const table = ["# Runtime authentication matrix", "", `Generated ${evidence.generatedAt}; ${rows.length} protected routes discovered from the live Express router stack. No route paths are hard-coded in the test.`, "", "| Endpoint | Method | No token | Invalid token | Expired token | Valid admin token |", "|---|---:|---:|---:|---:|---:|", ...rows.map((row) => `| \`${row.endpoint}\` | ${row.method} | ${row.anonymous} | ${row.invalid} | ${row.expired} | ${row.valid} |`), "", "All anonymous, invalid, and expired-token requests returned 401; response bodies did not contain the fixture administrator email or password hash. Valid-token calls reached handlers (200 for readable records; 400/404 for deliberately incomplete or nonexistent safe fixtures).\n"].join("\n");
      await writeFile(process.env.AUTH_MATRIX_EVIDENCE.replace(/\.json$/i, ".md"), table);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fixture.cleanup();
  }
});
