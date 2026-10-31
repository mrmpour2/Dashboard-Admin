import multer from "multer";
import crypto from "node:crypto";
import { mkdir, readFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { BadRequestError } from "../utils/AppError.js";

// فقط این فرمت‌های تصویری مجازند — بر اساس mimetype واقعی فایل، نه صرفاً
// پسوند اسمی (که به‌سادگی توسط کاربر قابل جعل است)
const ALLOWED_MIME_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // ۵ مگابایت
export const productUploadsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../uploads/products");

function actualImageMimeType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    mkdir(productUploadsDirectory, { recursive: true }).then(() => cb(null, productUploadsDirectory), cb);
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
    cb(new BadRequestError("فرمت تصویر پشتیبانی نمی‌شود؛ فقط JPG، PNG یا WebP مجاز است."));
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
  uploadProductImage(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new BadRequestError("حجم تصویر نباید بیشتر از ۵ مگابایت باشد."));
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") return next(new BadRequestError("فقط یک فایل تصویر با فیلد image ارسال کنید."));
      return next(new BadRequestError("در اطلاعات آپلود تصویر خطایی وجود دارد."));
    }
    if (err) return next(err);
    if (!req.file) return next(new BadRequestError("فایل تصویر ارسال نشده است."));
    try {
      const mimeType = actualImageMimeType(await readFile(req.file.path));
      if (mimeType !== req.file.mimetype) {
        await unlink(req.file.path);
        return next(new BadRequestError("محتوای فایل با فرمت تصویر اعلام‌شده مطابقت ندارد."));
      }
      return next();
    } catch (error) {
      await unlink(req.file.path).catch(() => undefined);
      return next(error);
    }
  });
}
