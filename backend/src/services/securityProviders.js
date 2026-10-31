/**
 * securityProviders.js
 *
 * Adapter layer for external providers:
 *   - sendOtp({ phone, code })                          -> SMS.ir
 *   - verifyCaptcha(token, remoteIp)                    -> Cloudflare Turnstile
 *   - refund({ idempotencyKey, orderId, paymentId, amount }) -> disabled pending replacement gateway
 *   - notify(event)                                     -> not connected yet
 *
 * Rules:
 *   - Mocks are opt-in, allowed ONLY when NODE_ENV is "development" or "test",
 *     and the app refuses to boot if mock mode is on anywhere else.
 *   - Every outbound call has a timeout.
 *   - Provider messages / secrets / OTP codes / phone numbers never reach the
 *     client or the logs in clear text.
 *   - refund() distinguishes a DEFINITE rejection (ServiceUnavailableError)
 *     from an UNKNOWN outcome (RefundOutcomeUnknownError). The caller must NOT
 *     auto-retry an unknown outcome; reconcile it first.
 */
import { URLSearchParams } from "node:url";
import { setTimeout, clearTimeout } from "node:timers";
import { env } from "../config/env.js";
import { ServiceUnavailableError } from "../utils/AppError.js";
import { Smsir } from "smsir-js";

/* -------------------------------------------------------------------------- */
/* Constants & errors                                                         */
/* -------------------------------------------------------------------------- */

const SMS_TIMEOUT_MS = 8_000;
const CAPTCHA_TIMEOUT_MS = 5_000;
const MAX_CAPTCHA_TOKEN_LENGTH = 2048;
const MAX_MOCK_ENTRIES = 1_000;
const MOCK_ENVIRONMENTS = new Set(["development", "test"]);
const TURNSTILE_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Refund may or may not have been executed by the gateway. Never auto-retry. */
export class RefundOutcomeUnknownError extends ServiceUnavailableError {
  constructor(message = "وضعیت بازپرداخت نامشخص است و باید بررسی شود.") {
    super(message);
    this.name = "RefundOutcomeUnknownError";
    this.code = "REFUND_OUTCOME_UNKNOWN";
    this.retryable = false; // workers MUST NOT retry; reconcile first
    this.outcomeUnknown = true;
  }
}

/** Notification was NOT delivered. Queue/audit must not record it as completed. */
export class NotificationNotDeliveredError extends ServiceUnavailableError {
  constructor(message = "اعلان تحویل داده نشد.") {
    super(message);
    this.name = "NotificationNotDeliveredError";
    this.code = "NOTIFICATION_NOT_DELIVERED";
    this.retryable = false;
  }
}

/** True for errors that a retry loop must never retry. */
export function isNonRetryableProviderError(err) {
  return err?.retryable === false || err instanceof InvalidProviderInputError;
}

/** Programmer / caller error: bad input to a provider. Not a provider outage. */
export class InvalidProviderInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidProviderInputError";
  }
}

/* -------------------------------------------------------------------------- */
/* Logging (no PII, no secrets)                                               */
/* -------------------------------------------------------------------------- */

// Swap this for your structured logger (pino/winston) if you have one.
const log = {
  error(meta, msg) {
    console.error(JSON.stringify({ level: "error", msg, ...meta }));
  },
  warn(meta, msg) {
    console.warn(JSON.stringify({ level: "warn", msg, ...meta }));
  },
};

function maskPhone(phone) {
  const s = String(phone ?? "");
  return s.length > 4 ? `${s.slice(0, 4)}***${s.slice(-2)}` : "***";
}

/**
 * Provider/SDK text can echo request bodies (OTP, keys, tokens). Never log it
 * raw: strip known secrets, long tokens and digit runs, then truncate.
 */
function safeText(value, maxLen = 200) {
  let text = String(value ?? "");
  for (const secret of [
    env.SMSIR_API_KEY,
    env.TURNSTILE_SECRET_KEY,
  ]) {
    if (secret && String(secret).length >= 4) {
      text = text.split(String(secret)).join("[REDACTED]");
    }
  }
  return text
    .replace(
      /\b(bearer|token|key|secret|api[-_ ]?key|authorization|cookie|set-cookie|otp|code|pin|password|passwd|pwd|session)\b["']?\s*[:=]\s*["']?(?:(?:basic|bearer|digest|token)\s+)?[^\s"',;}\]]+/gi,
      "$1=[REDACTED]",
    )
    .replace(/[A-Za-z0-9_\-.]{24,}/g, "[REDACTED]")
    .replace(
      /[+\d\u06F0-\u06F9\u0660-\u0669][\d\s\u06F0-\u06F9\u0660-\u0669-]{2,}[\d\u06F0-\u06F9\u0660-\u0669]/g,
      "[NUM]",
    )
    .slice(0, maxLen);
}

function errMsg(err) {
  return safeText(err instanceof Error ? err.message : err);
}

/* -------------------------------------------------------------------------- */
/* Mock / test support                                                        */
/* -------------------------------------------------------------------------- */

export const mockDeliveries = [];
export const mockRefunds = new Map();
let overrides = {};

export function setTestProviders(value = {}) {
  if (env.NODE_ENV !== "test")
    throw new Error("Test providers require NODE_ENV=test");
  overrides = value;
}

export function resetMocks() {
  if (!MOCK_ENVIRONMENTS.has(env.NODE_ENV))
    throw new Error("resetMocks is only available in development/test");
  mockDeliveries.length = 0;
  mockRefunds.clear();
  overrides = {};
}

function mockAllowed() {
  return (
    MOCK_ENVIRONMENTS.has(env.NODE_ENV) && env.SECURITY_PROVIDER_MODE === "mock"
  );
}

function pushMockDelivery(message) {
  if (mockDeliveries.length >= MAX_MOCK_ENTRIES) mockDeliveries.shift();
  mockDeliveries.push({ ...message });
}

// Fail fast: mock mode must never be active outside dev/test.
if (
  env.SECURITY_PROVIDER_MODE === "mock" &&
  !MOCK_ENVIRONMENTS.has(env.NODE_ENV)
) {
  throw new Error(
    `SECURITY_PROVIDER_MODE=mock is not allowed when NODE_ENV="${env.NODE_ENV}"`,
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Rejects after `ms`. The underlying promise is not cancelled (SDK limitation). */
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Normalizes Iranian mobile numbers to 09XXXXXXXXX. Returns null if invalid. */
function normalizeIranMobile(input) {
  if (input == null) return null;
  let s = String(input)
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[\s\-()]/g, "");
  if (s.startsWith("+98")) s = `0${s.slice(3)}`;
  else if (s.startsWith("0098")) s = `0${s.slice(4)}`;
  else if (/^98\d{10}$/.test(s)) s = `0${s.slice(2)}`;
  else if (/^9\d{9}$/.test(s)) s = `0${s}`;
  return /^09\d{9}$/.test(s) ? s : null;
}

function isMissing(value) {
  return (
    value === undefined ||
    value === null ||
    String(value).trim() === "" ||
    /YOUR_/i.test(String(value))
  );
}

let smsClient;
let smsClientKey;
function getSmsClient() {
  const key = `${env.SMSIR_API_KEY}:${env.SMSIR_LINE_NUMBER}`;
  if (!smsClient || smsClientKey !== key) {
    smsClient = new Smsir(env.SMSIR_API_KEY, Number(env.SMSIR_LINE_NUMBER));
    smsClientKey = key;
  }
  return smsClient;
}

/**
 * Call once at application boot (after env is loaded) so misconfiguration
 * crashes the deploy instead of failing at the first user request.
 */
export function assertSecurityProvidersConfig() {
  if (mockAllowed()) return;
  const missing = [];
  const required = ["TURNSTILE_SECRET_KEY"];
  if (env.SMS_ENABLED || env.OTP_ENABLED) required.push("SMSIR_API_KEY", "SMSIR_LINE_NUMBER");
  if (env.OTP_ENABLED) required.push("SMSIR_TEMPLATE_ID");
  for (const key of required) {
    if (isMissing(env[key])) missing.push(key);
  }
  if (missing.length) {
    throw new Error(`Missing provider configuration: ${missing.join(", ")}`);
  }
}

/* -------------------------------------------------------------------------- */
/* Providers                                                                  */
/* -------------------------------------------------------------------------- */

// No refund provider is configured. Keep refunds disabled until a supported provider is configured.
async function executeRefund() {
  throw new InvalidProviderInputError(
    "Automatic refunds are disabled until a replacement gateway is configured.",
  );
}

export const securityProviders = {
  /**
   * @param {{ phone: string, code: string|number }} message
   * @returns {Promise<true>}
   */
  async sendOtp(message) {
    if (overrides.sendOtp) return overrides.sendOtp(message);
    if (mockAllowed()) {
      pushMockDelivery(message);
      return true;
    }

    if (!env.OTP_ENABLED) {
      throw new NotificationNotDeliveredError("سرویس پیامک OTP غیرفعال است.");
    }

    const phone = normalizeIranMobile(message?.phone);
    const code = String(message?.code ?? "");
    if (!phone || !/^\d{4,8}$/.test(code)) {
      throw new InvalidProviderInputError("Invalid OTP message");
    }

    const templateId = Number(env.SMSIR_TEMPLATE_ID);
    if (
      isMissing(env.SMSIR_API_KEY) ||
      !Number.isInteger(Number(env.SMSIR_LINE_NUMBER)) ||
      !Number.isInteger(templateId)
    ) {
      log.error({ provider: "smsir" }, "sms provider is not configured");
      throw new ServiceUnavailableError("سرویس پیامک پیکربندی نشده است.");
    }

    let response;
    try {
      response = await withTimeout(
        getSmsClient().SendVerifyCode(phone, templateId, [
          { name: "Code", value: code },
        ]),
        SMS_TIMEOUT_MS,
        "smsir",
      );
    } catch (err) {
      log.error(
        { provider: "smsir", phone: maskPhone(phone), err: errMsg(err) },
        "otp send failed",
      );
      throw new ServiceUnavailableError("خطا در ارتباط با سرویس پیامک.");
    }

    const ok = response?.status === 1 || response?.data?.status === 1;
    if (!ok) {
      log.error(
        {
          provider: "smsir",
          phone: maskPhone(phone),
          providerMessage: safeText(
            response?.message ?? response?.data?.message,
          ),
        },
        "otp rejected by provider",
      );
      throw new ServiceUnavailableError("ارسال پیامک ناموفق بود.");
    }
    return true;
  },

  /**
   * Provider-neutral transactional SMS interface. Production delivery is
   * disabled unless the SMS feature flag and provider credentials are configured.
   */
  async sendSms(message) {
    if (overrides.sendSms) return overrides.sendSms(message);
    if (mockAllowed()) {
      pushMockDelivery({ ...message, type: "sms" });
      return { delivered: true, mock: true };
    }
    if (!env.SMS_ENABLED) {
      throw new NotificationNotDeliveredError("سرویس پیامک غیرفعال است.");
    }
    const phone = normalizeIranMobile(message?.phone);
    const text = String(message?.message ?? "").trim();
    if (!phone || !text || text.length > 500) {
      throw new InvalidProviderInputError("Invalid SMS message");
    }
    if (isMissing(env.SMSIR_API_KEY) || !Number.isInteger(Number(env.SMSIR_LINE_NUMBER))) {
      log.error({ provider: "smsir" }, "sms provider is not configured");
      throw new NotificationNotDeliveredError("SMS provider is not configured.");
    }
    try {
      const response = await withTimeout(
        getSmsClient().SendBulk(text, [phone]),
        SMS_TIMEOUT_MS,
        "smsir",
      );
      const result = response?.data ?? response;
      if (result?.status !== 1) {
        log.error({ provider: "smsir", phone: maskPhone(phone), providerMessage: safeText(result?.message) }, "sms rejected by provider");
        throw new NotificationNotDeliveredError("SMS delivery was rejected.");
      }
      return { delivered: true };
    } catch (err) {
      if (err instanceof NotificationNotDeliveredError) throw err;
      log.error({ provider: "smsir", phone: maskPhone(phone), err: errMsg(err) }, "sms send failed");
      // Delivery may be ambiguous after timeout/network failure; do not retry
      // automatically because SMS.ir bulk sends do not accept an idempotency key.
      throw new NotificationNotDeliveredError("SMS delivery could not be confirmed.");
    }
  },

  /**
   * Fails closed: any problem returns false.
   * @returns {Promise<boolean>}
   */
  async verifyCaptcha(token, remoteIp) {
    if (overrides.verifyCaptcha)
      return overrides.verifyCaptcha(token, remoteIp);
    if (mockAllowed()) return token === "mock-captcha-ok";

    if (isMissing(env.TURNSTILE_SECRET_KEY)) {
      log.error({ provider: "turnstile" }, "captcha secret is not configured");
      return false;
    }
    if (
      typeof token !== "string" ||
      !token ||
      token.length > MAX_CAPTCHA_TOKEN_LENGTH
    ) {
      return false;
    }

    try {
      const body = new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
      });
      if (remoteIp) body.set("remoteip", String(remoteIp));

      const response = await fetch(TURNSTILE_URL, {
        method: "POST",
        body,
        signal: AbortSignal.timeout(CAPTCHA_TIMEOUT_MS),
      });
      if (!response.ok) {
        log.error(
          { provider: "turnstile", status: response.status },
          "captcha http error",
        );
        return false;
      }
      return (await response.json())?.success === true;
    } catch (err) {
      log.error(
        { provider: "turnstile", err: errMsg(err) },
        "captcha verification failed",
      );
      return false;
    }
  },

  /**
   * @param {{ idempotencyKey: string, orderId?: string, paymentId: string|number, amount: number }} request
   *   amount: positive integer, in the gateway's currency unit (Rial).
   * @returns {Promise<{ reference: string }>}
   * @throws {RefundOutcomeUnknownError} outcome unknown: reconcile, do not retry
   * @throws {ServiceUnavailableError}   definite failure: safe to mark failed
   */
  async refund(request) {
    if (overrides.refund) return overrides.refund(request);
    if (mockAllowed()) {
      if (!mockRefunds.has(request.idempotencyKey)) {
        if (mockRefunds.size >= MAX_MOCK_ENTRIES) {
          mockRefunds.delete(mockRefunds.keys().next().value);
        }
        mockRefunds.set(request.idempotencyKey, {
          reference: `MOCK-${request.paymentId}`,
        });
      }
      return mockRefunds.get(request.idempotencyKey);
    }

    const { idempotencyKey, paymentId, amount } = request ?? {};
    if (
      typeof idempotencyKey !== "string" ||
      !idempotencyKey ||
      isMissing(paymentId) ||
      !Number.isSafeInteger(amount) ||
      amount <= 0
    ) {
      throw new InvalidProviderInputError("Invalid refund request");
    }
    return executeRefund();
  },

  /**
   * Throws NotificationNotDeliveredError when no channel is connected, so a
   * queue/audit can never record an undelivered event as "completed".
   * Fire-and-forget callers on the main order/payment flow must catch it.
   */
  async notify(event) {
    if (overrides.notify) return overrides.notify(event);
    if (mockAllowed()) return { mock: true };

    log.warn(
      { provider: "notify", eventType: event?.type },
      "notify provider is not connected; event dropped",
    );
    throw new NotificationNotDeliveredError(
      "سرویس اطلاع‌رسانی هنوز متصل نشده است.",
    );
  },
};
