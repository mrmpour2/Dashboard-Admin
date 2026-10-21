import test from "node:test";
import assert from "node:assert/strict";

// This suite never connects to a database or external services.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://postgres@127.0.0.1:55439/elin_audit";
process.env.CORS_ORIGIN = "http://127.0.0.1:5189";
process.env.JWT_ACCESS_SECRET = "qa-provider-access-secret-only-2026";
process.env.JWT_REFRESH_SECRET = "qa-provider-refresh-secret-only-2026";
process.env.TURNSTILE_SECRET_KEY = "qa-synthetic-turnstile-secret";
process.env.SECURITY_PROVIDER_MODE = "disabled";
const { env } = await import("../src/config/env.js");
const { securityProviders } = await import("../src/services/securityProviders.js");

test("Turnstile adapter validates configured secrets and fails closed without external calls", async t => {
  assert.equal(env.TURNSTILE_SECRET_KEY, process.env.TURNSTILE_SECRET_KEY);
  const originalFetch = globalThis.fetch;
  let calls = 0;
  let forbiddenCalls = 0;
  let response = { ok: true, json: async () => ({ success: true }) };
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    assert.equal(init.method, "POST");
    assert.equal(init.body.get("secret"), "qa-synthetic-turnstile-secret");
    assert.equal(init.body.get("response"), "synthetic-token");
    assert.ok(init.signal instanceof AbortSignal);
    return response;
  };
  try {
    await t.test("server accepts only explicit success from Siteverify", async () => {
      assert.equal(await securityProviders.verifyCaptcha("synthetic-token"), true);
      response = { ok: true, json: async () => ({ success: false }) };
      assert.equal(await securityProviders.verifyCaptcha("synthetic-token"), false);
      response = { ok: true, json: async () => ({ success: "true" }) };
      assert.equal(await securityProviders.verifyCaptcha("synthetic-token"), false);
    });
    await t.test("malformed and oversized tokens never contact provider", async () => {
      const before = calls;
      for (const value of [undefined, null, 42, "", "x".repeat(2049)]) {
        assert.equal(await securityProviders.verifyCaptcha(value), false);
      }
      assert.equal(calls, before);
    });
    await t.test("HTTP, JSON and network errors fail closed", async () => {
      response = { ok: false };
      assert.equal(await securityProviders.verifyCaptcha("synthetic-token"), false);
      response = { ok: true, json: async () => { throw new Error("Invalid JSON"); } };
      assert.equal(await securityProviders.verifyCaptcha("synthetic-token"), false);
      globalThis.fetch = async () => { throw new Error("Synthetic timeout"); };
      assert.equal(await securityProviders.verifyCaptcha("synthetic-token"), false);
    });
    await t.test("mock mode is isolated even when real provider is configured", async () => {
      env.SECURITY_PROVIDER_MODE = "mock";
      globalThis.fetch = async () => { forbiddenCalls++; throw new Error("Mock mode must not use network"); };
      assert.equal(await securityProviders.verifyCaptcha("mock-captcha-ok"), true);
      assert.equal(await securityProviders.verifyCaptcha("synthetic-token"), false);
      assert.equal(forbiddenCalls, 0);
    });
    await t.test("missing secret rejects without a provider request", async () => {
      env.SECURITY_PROVIDER_MODE = "disabled";
      env.TURNSTILE_SECRET_KEY = "";
      assert.equal(await securityProviders.verifyCaptcha("synthetic-token"), false);
      assert.equal(forbiddenCalls, 0);
    });
  } finally {
    globalThis.fetch = originalFetch;
    env.SECURITY_PROVIDER_MODE = "disabled";
    env.TURNSTILE_SECRET_KEY = "qa-synthetic-turnstile-secret";
  }
});
