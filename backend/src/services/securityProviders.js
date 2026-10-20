import { env } from "../config/env.js";
import { ServiceUnavailableError } from "../utils/AppError.js";

// Provider contracts: sendOtp({phone,code}), verifyCaptcha(token),
// refund({idempotencyKey,orderId,paymentId,amount}), notify(event).
// Mocks are opt-in, never permitted in production, and never exposed over HTTP.
export const mockDeliveries = [];
export const mockRefunds = new Map();
let overrides = {};
export function setTestProviders(value = {}) {
  if (env.NODE_ENV !== "test") throw new Error("Test providers require NODE_ENV=test");
  overrides = value;
}
function mockAllowed() {
  return env.NODE_ENV !== "production" && env.SECURITY_PROVIDER_MODE === "mock";
}
export const securityProviders = {
  async sendOtp(message) {
    if (overrides.sendOtp) return overrides.sendOtp(message);
    if (!mockAllowed()) throw new ServiceUnavailableError("سرویس تأیید موبایل هنوز فعال نشده است.");
    mockDeliveries.push({ ...message });
  },
  async verifyCaptcha(token) {
    if (overrides.verifyCaptcha) return overrides.verifyCaptcha(token);
    return mockAllowed() && token === "mock-captcha-ok";
  },
  async refund(request) {
    if (overrides.refund) return overrides.refund(request);
    if (!mockAllowed()) throw new ServiceUnavailableError("بازپرداخت در انتظار اتصال سرویس است.");
    if (!mockRefunds.has(request.idempotencyKey)) mockRefunds.set(request.idempotencyKey, { reference: `MOCK-${request.paymentId}` });
    return mockRefunds.get(request.idempotencyKey);
  },
  async notify(event) {
    if (overrides.notify) return overrides.notify(event);
    if (!mockAllowed()) throw new ServiceUnavailableError("سرویس اطلاع‌رسانی هنوز فعال نشده است.");
    return { mock: true };
  },
};
