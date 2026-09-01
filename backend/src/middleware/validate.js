import { BadRequestError } from "../utils/AppError.js";

// اعتبارسنجی body/query/params درخواست با یک schema زاد (zod).
// در صورت نامعتبر بودن، قبل از رسیدن به controller با خطای ۴۰۰ متوقف می‌شود
// (جلوگیری از رسیدن داده کثیف/مخرب به لایه دیتابیس).
export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return next(
        new BadRequestError(firstIssue?.message || "داده ارسالی نامعتبر است"),
      );
    }

    req.body = result.data.body ?? req.body;
    req.query = result.data.query ?? req.query;
    req.params = result.data.params ?? req.params;
    return next();
  };
}
