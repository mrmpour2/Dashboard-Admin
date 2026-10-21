import { z } from "zod";

// سیاست رمز عبور: حداقل ۸ کاراکتر، حداقل یک حرف و یک عدد.
// عمداً نیازمند نویسه خاص نیست (طبق توصیه‌های به‌روز NIST/OWASP، طول اهمیت بیشتری
// از پیچیدگی اجباری دارد و از رفتارهای ناامن کاربر مثل «Aa1!» جلوگیری می‌کند).
const passwordSchema = z
  .string()
  .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد")
  .max(128, "رمز عبور بیش از حد طولانی است")
  .regex(/[a-zA-Z]/, "رمز عبور باید حداقل یک حرف داشته باشد")
  .regex(/[0-9]/, "رمز عبور باید حداقل یک عدد داشته باشد");

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "نام باید حداقل ۲ کاراکتر باشد").max(100),
    email: z.string().trim().toLowerCase().email("ایمیل نامعتبر است"),
    password: passwordSchema,
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email("ایمیل نامعتبر است"),
    password: z.string().min(1, "رمز عبور الزامی است"),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
