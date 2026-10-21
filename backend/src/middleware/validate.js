import { BadRequestError } from "../utils/AppError.js";

// اعتبارسنجی body/query/params درخواست با Zod
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
        new BadRequestError(
          firstIssue?.message || "داده ارسالی نامعتبر است",
        ),
      );
    }

    req.body = result.data.body ?? req.body;
    if (result.data.query) {
      Object.defineProperty(req, "query", { value: result.data.query, configurable: true, writable: true });
    }
    if (result.data.params) req.params = result.data.params;

    return next();
  };
}
