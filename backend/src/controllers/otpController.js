import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { requestOtp, consumeOtp, digest } from "../services/otpService.js";
import { UnauthorizedError } from "../utils/AppError.js";

const cookieOptions = { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax", path: "/api/payment", maxAge: 30 * 60000 };
export async function sendCheckoutOtp(req, res, next) {
  try { res.json(await requestOtp({ ...req.body, subject: "checkout", ip: req.ip })); } catch (error) { next(error); }
}
export async function verifyCheckoutOtp(req, res, next) {
  try {
    const phone = await consumeOtp({ ...req.body, subject: "checkout" });
    const token = jwt.sign({ phone, scope: "checkout", ipHash: digest(req.ip) }, env.JWT_ACCESS_SECRET,
      { expiresIn: "30m", audience: "checkout", issuer: "elin-checkout" });
    res.cookie("checkout_proof", token, cookieOptions).json({ verified: true });
  } catch (error) { next(error); }
}
export function requireCheckoutProof(req, _res, next) {
  try {
    const token = req.cookies?.checkout_proof;
    const proof = jwt.verify(token, env.JWT_ACCESS_SECRET, { audience: "checkout", issuer: "elin-checkout", algorithms: ["HS256"] });
    if (proof.scope !== "checkout" || proof.ipHash !== digest(req.ip)) throw new Error("Invalid proof");
    req.checkoutPhone = proof.phone;
    next();
  } catch { next(new UnauthorizedError("ابتدا شماره موبایل را با کد پیامکی تأیید کنید.")); }
}
