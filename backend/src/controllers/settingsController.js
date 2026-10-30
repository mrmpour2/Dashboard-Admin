import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { securityAudit } from "../services/otpService.js";
import { getOrderAlertPhones, setOrderAlertPhones } from "../services/orderNotificationService.js";

export const getOrderAlertSettings = asyncHandler(async (req, res) => {
  const phones = await getOrderAlertPhones();
  await securityAudit(prisma, "settings.order_alert_phones.viewed", req.user.id, { recipientCount: phones.length });
  res.setHeader("Cache-Control", "no-store");
  res.json({ phones, smsEnabled: env.SMS_ENABLED });
});

export const updateOrderAlertSettings = asyncHandler(async (req, res) => {
  const phones = await setOrderAlertPhones(req.body.phones, req.user.id);
  res.setHeader("Cache-Control", "no-store");
  res.json({ phones });
});
