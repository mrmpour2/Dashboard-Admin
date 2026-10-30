import { asyncHandler } from "../utils/asyncHandler.js";
import { BadRequestError } from "../utils/AppError.js";
import { securityProviders } from "../services/securityProviders.js";
import * as ticketService from "../services/ticketService.js";
import { deleteTicketAttachment, saveTicketAttachment } from "../middleware/ticketUpload.js";

async function requireCaptcha(token, ip) {
  if (!(await securityProviders.verifyCaptcha(token, ip))) {
    throw new BadRequestError("تأیید ضداسپم ناموفق بود؛ دوباره تلاش کنید.");
  }
}

export const createPublicTicket = asyncHandler(async (req, res) => {
  await requireCaptcha(req.body.captchaToken, req.ip);
  const attachment = await saveTicketAttachment(req.file);
  try {
    const result = await ticketService.createPublicTicket({ ...req.body, attachment });
    res.status(201).json(result);
  } catch (error) {
    if (attachment) await deleteTicketAttachment(attachment.filename);
    throw error;
  }
});

export const trackPublicTicket = asyncHandler(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ ticket: await ticketService.getPublicTicket(req.body) });
});

export const replyPublicTicket = asyncHandler(async (req, res) => {
  await requireCaptcha(req.body.captchaToken, req.ip);
  const result = await ticketService.replyPublicTicket(req.body);
  res.status(201).json(result);
});
