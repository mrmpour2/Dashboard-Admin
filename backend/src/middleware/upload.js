import multer from "multer";
import crypto from "node:crypto";
import path from "node:path";
import { BadRequestError } from "../utils/AppError.js";

// فقط این فرمت‌های تصویری مجازند — بر اساس mimetype واقعی فایل، نه صرفاً
// پسوند اسمی (که به‌سادگی توسط کاربر قابل جعل است)
const ALLOWED_MIME_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // ۵ مگابایت

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/products");
  },
  filename: (_req, file, cb) => {
    // نام فایل اصلی کاربر هرگز مستقیم استفاده نمی‌شود (خطر path traversal و
    // تداخل نام‌ها)؛ به‌جای آن یک نام تصادفی امن با پسوند صحیح ساخته می‌شود.
    const ext = ALLOWED_MIME_TYPES[file.mimetype] || path.extname(file.originalname);
    const randomName = crypto.randomBytes(16).toString("hex");
    cb(null, `${randomName}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    cb(new BadRequestError("فقط فایل‌های تصویری (jpg, png, webp, gif) مجاز هستند"));
    return;
  }
  cb(null, true);
}

export const uploadProductImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
}).single("image");

// چون multer خطاهای خودش (حجم زیاد و...) را به شکل متفاوتی می‌دهد،
// این wrapper آن‌ها را به همان قالب خطای استاندارد برنامه تبدیل می‌کند.
export function handleUpload(req, res, next) {
  uploadProductImage(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new BadRequestError("حجم فایل نباید بیشتر از ۵ مگابایت باشد"));
      }
      return next(new BadRequestError("خطا در آپلود فایل"));
    }
    if (err) return next(err);
    if (!req.file) return next(new BadRequestError("فایلی ارسال نشده است"));
    return next();
  });
}
