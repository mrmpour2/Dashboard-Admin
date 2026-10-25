import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { digest, lockKeys } from "../services/otpService.js";
import { finalizeVerifiedPayment } from "../services/stockService.js";
import { awardOrderPoints } from "../services/clubService.js";
import { BadRequestError, NotFoundError, ServiceUnavailableError } from "../utils/AppError.js";

const PAYPING_API = "https://api.payping.ir/v3/pay";

async function payPingPost(url, body) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${env.PAYPING_TOKEN}`,
        "cache-control": "no-cache",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new ServiceUnavailableError("ارتباط با درگاه پی‌پینگ برقرار نشد.");
  }
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function getOwnedOrder(orderId, req) {
  const order = await prisma.chatOrder.findUnique({ where: { id: orderId } });
  if (!order || order.phoneHash !== digest(req.checkoutPhone)) {
    throw new NotFoundError("سفارش پیدا نشد.");
  }
  return order;
}

export async function createPayPingRequest(req, res, next) {
  try {
    if (!env.PAYPING_TOKEN) throw new ServiceUnavailableError("توکن پی‌پینگ تنظیم نشده است.");
    const order = await getOwnedOrder(String(req.body.orderId), req);
    if (order.expiresAt && order.expiresAt <= new Date()) throw new BadRequestError("مهلت رزرو تمام شده است.");
    if (!["PENDING_PAYMENT", "RESERVED"].includes(order.status)) throw new BadRequestError("این سفارش در وضعیت قابل پرداخت نیست.");

    const amount = Number(order.totalAmount);
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new BadRequestError("مبلغ سفارش معتبر نیست.");

    // The "reuse pending / create new" decision is serialized per order, so two
    // simultaneous clicks cannot create two gateway payments for the same order.
    const reserved = await prisma.$transaction(async (tx) => {
      await lockKeys(tx, [`payping:order:${order.id}`]);
      const pending = await tx.chatPayment.findFirst({
        where: { orderId: order.id, method: "PAYPING", status: "PENDING", paypingPaymentCode: { not: null } },
        orderBy: { createdAt: "desc" },
      });
      if (pending?.paypingPaymentCode) return { pending };
      const inFlight = await tx.chatPayment.findFirst({
        where: { orderId: order.id, method: "PAYPING", status: "INITIATED", createdAt: { gte: new Date(Date.now() - 60_000) } },
      });
      if (inFlight) throw new BadRequestError("درخواست پرداخت این سفارش در حال ساخت است؛ چند ثانیه بعد دوباره تلاش کنید.");
      const created = await tx.chatPayment.create({
        data: { orderId: order.id, method: "PAYPING", status: "INITIATED", amountToman: amount },
      });
      return { payment: created };
    });
    if (reserved.pending) {
      const pending = reserved.pending;
      return res.json({ paymentId: pending.id, paymentCode: pending.paypingPaymentCode, paymentUrl: pending.paypingPaymentUrl, amountToman: Number(pending.amountToman) });
    }
    const payment = reserved.payment;
    const returnUrl = `${env.PUBLIC_API_BASE_URL.replace(/\/$/, "")}/payment/payping/callback`;
    const result = await payPingPost(PAYPING_API, {
      amount,
      returnUrl,
      payerIdentity: order.customerPhone,
      payerName: order.customerName,
      description: `پرداخت سفارش ${order.orderNumber}`,
      clientRefId: order.orderNumber,
    });
    if (result.status !== 200 || result.data?.paymentCode == null || typeof result.data?.url !== "string") {
      await prisma.chatPayment.update({ where: { id: payment.id }, data: { status: "FAILED", adminNote: `PayPing request failed: HTTP ${result.status}` } });
      throw new BadRequestError("درگاه پی‌پینگ نتوانست درخواست پرداخت را بسازد.");
    }
    await prisma.chatPayment.update({
      where: { id: payment.id },
      data: { status: "PENDING", paypingPaymentCode: String(result.data.paymentCode), paypingPaymentUrl: result.data.url },
    });
    return res.status(201).json({ paymentId: payment.id, paymentCode: String(result.data.paymentCode), paymentUrl: result.data.url, amountToman: amount });
  } catch (error) {
    next(error);
  }
}

function parseCallback(req) {
  const body = req.body ?? {};
  const status = String(body.status ?? req.query.status ?? "");
  const rawData = body.data ?? req.query.data ?? "{}";
  let data = rawData;
  if (typeof rawData === "string") {
    try { data = JSON.parse(rawData); } catch { throw new BadRequestError("دادهٔ بازگشتی درگاه معتبر نیست."); }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new BadRequestError("دادهٔ بازگشتی درگاه معتبر نیست.");
  return { status, data };
}

export async function payPingCallback(req, res) {
  const frontendUrl = env.FRONTEND_URL.replace(/\/$/, "");
  let paymentId = "";
  let outcome = "failed";
  try {
    if (!env.PAYPING_TOKEN) throw new ServiceUnavailableError("توکن پی‌پینگ تنظیم نشده است.");
    const { status, data } = parseCallback(req);
    if (status !== "1") {
      return res.redirect(303, `${frontendUrl}/?payment=failed`);
    }

    const paymentCode = String(data.paymentCode ?? "");
    const payment = await prisma.chatPayment.findFirst({ where: { method: "PAYPING", paypingPaymentCode: paymentCode }, include: { order: true } });
    if (!payment) throw new NotFoundError("پرداخت پیدا نشد.");
    paymentId = payment.id;
    if (payment.status === "PAID") {
      outcome = "success";
      return res.redirect(303, `${frontendUrl}/?payment=${outcome}&paymentId=${encodeURIComponent(paymentId)}`);
    }
    if (["REFUND_PENDING", "REFUNDED"].includes(payment.status)) {
      outcome = "refund_pending";
      return res.redirect(303, `${frontendUrl}/?payment=${outcome}&paymentId=${encodeURIComponent(paymentId)}`);
    }
    if (payment.status !== "PENDING" || data.paymentRefId == null || !Number.isSafeInteger(Number(data.amount)) || String(data.clientRefId) !== payment.order.orderNumber || Number(data.amount) !== Number(payment.amountToman) || Number(payment.amountToman) !== Number(payment.order.totalAmount)) {
      await prisma.securityOutbox.upsert({ where: { key: `payping-mismatch:${payment.id}` }, update: {}, create: { key: `payping-mismatch:${payment.id}`, kind: "ticket", orderId: payment.orderId, paymentId: payment.id, payload: { reason: "gateway_identity_or_amount_mismatch" } } });
      throw new BadRequestError("مبلغ یا شناسهٔ پرداخت با سفارش تطبیق ندارد.");
    }

    const verified = await payPingPost(`${PAYPING_API}/verify`, {
      paymentRefId: data.paymentRefId,
      paymentCode,
      amount: Number(payment.amountToman),
    });
    if (verified.status === 202 || verified.status === 502) {
      // Gateway has not settled yet. Nothing re-verifies automatically, so leave a
      // ticket for the operator instead of silently keeping the payment PENDING.
      await prisma.securityOutbox.upsert({ where: { key: `payping-processing:${payment.id}` }, update: {}, create: { key: `payping-processing:${payment.id}`, kind: "ticket", orderId: payment.orderId, paymentId: payment.id, payload: { reason: "gateway_verify_pending", httpStatus: verified.status } } });
      outcome = "processing";
      return res.redirect(303, `${frontendUrl}/?payment=${outcome}&paymentId=${encodeURIComponent(paymentId)}`);
    }
    if (verified.status !== 200 || Number(verified.data?.amount) !== Number(payment.amountToman) || String(verified.data?.clientRefId) !== payment.order.orderNumber) {
      if (verified.status === 409 && verified.data?.metaData?.code === 110) {
        await prisma.securityOutbox.upsert({ where: { key: `payping-reconcile:${payment.id}` }, update: {}, create: { key: `payping-reconcile:${payment.id}`, kind: "ticket", orderId: payment.orderId, paymentId: payment.id, payload: { reason: "gateway_already_verified_without_local_receipt" } } });
        outcome = "verification_pending";
        return res.redirect(303, `${frontendUrl}/?payment=${outcome}&paymentId=${encodeURIComponent(paymentId)}`);
      }
      throw new BadRequestError("تأیید پرداخت در پی‌پینگ ناموفق بود.");
    }

    // Persist the gateway ref BEFORE finalizing, for every outcome: a verified payment that
    // ends in REFUND_PENDING needs this id to be refunded later.
    const paymentRefId = String(data.paymentRefId);
    const finalized = await prisma.$transaction(async tx => {
      await tx.chatPayment.update({ where: { id: payment.id }, data: { paypingPaymentRefId: paymentRefId } });
      return finalizeVerifiedPayment(tx, { ...payment, paypingPaymentRefId: paymentRefId });
    });
    if (finalized.status === "PAID") {
      outcome = "success";
      try { await awardOrderPoints(payment.orderId); } catch (error) { console.error("club order points failed", error); }
    } else outcome = "refund_pending";
  } catch (error) {
    if (req.log?.error) req.log.error(error, "PayPing callback verification failed");
    else console.error("PayPing callback error:", error);
  }
  return res.redirect(303, `${frontendUrl}/?payment=${outcome}${paymentId ? `&paymentId=${encodeURIComponent(paymentId)}` : ""}`);
}
