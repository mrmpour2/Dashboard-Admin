// کلاس خطای سفارشی برنامه — امکان تعیین کد وضعیت HTTP و پیام امن برای کاربر را می‌دهد.
// خطاهایی که از این کلاس ساخته می‌شوند "قابل اعتماد" هستند و پیام‌شان مستقیم به کاربر نشان داده می‌شود.
// خطاهای دیگر (باگ‌های برنامه‌نویسی، خطاهای غیرمنتظره) هرگز جزئیات‌شان به کاربر نشت نمی‌کند.
export class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "درخواست نامعتبر است") {
    super(message, 400, "BAD_REQUEST");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "احراز هویت نشده‌اید") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "اجازه دسترسی به این بخش را ندارید") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "مورد درخواستی یافت نشد") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "این مورد از قبل وجود دارد") {
    super(message, 409, "CONFLICT");
  }
}
