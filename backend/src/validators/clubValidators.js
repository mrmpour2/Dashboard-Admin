import { z } from "zod";

/**
 * اعتبارسنجی باشگاه مشتریان.
 *
 * شماره با ارقام فارسی/عربی و جداکننده پذیرفته می‌شود؛ نرمال‌سازی نهایی در
 * سرویس انجام می‌شود. رمز عضویت فقط رقم است تا روی موبایل راحت وارد شود.
 */
const PHONE_PATTERN = /^[+\d\u06F0-\u06F9\u0660-\u0669()\-\s\u200c]{8,20}$/;
const PIN_PATTERN = /^[\d\u06F0-\u06F9\u0660-\u0669]{4,8}$/;

const phone = z.string().trim().regex(PHONE_PATTERN, "شماره موبایل معتبر وارد کنید.");
const pin = z.string().trim().regex(PIN_PATTERN, "رمز عضویت باید ۴ تا ۸ رقم باشد.");

export const joinClubSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({
    name: z.string().trim().min(2, "نام باید حداقل ۲ نویسه باشد.").max(60),
    phone,
    pin,
    captchaToken: z.string().max(2048).optional(),
  }),
});

export const verifyClubClaimSchema = z.object({ body: z.object({ claimId: z.string().min(1).max(100), code: z.string().regex(/^\d{6}$/), captchaToken: z.string().max(2048).optional() }) });
export const resendClubClaimSchema = z.object({ body: z.object({ claimId: z.string().min(1).max(100), captchaToken: z.string().max(2048).optional() }) });

export const loginClubSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({ phone, pin }),
});

export const redeemClubRewardSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ rewardId: z.string().trim().min(1).max(64) }),
  body: z.object({
    // کلید سمت کلاینت؛ ارسال دوباره همان کلید رکورد تازه نمی‌سازد.
    idempotencyKey: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{8,128}$/, "شناسهٔ درخواست معتبر نیست."),
  }),
});

export const clubEmptySchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});
