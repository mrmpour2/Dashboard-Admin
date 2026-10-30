import multer from "multer";
import crypto from "node:crypto";
import path from "node:path";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BadRequestError } from "../utils/AppError.js";

const fileTypes = {
  "image/jpeg": { ext: ".jpg", valid: (buffer) => buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  "image/png": { ext: ".png", valid: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": { ext: ".webp", valid: (buffer) => buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" },
  "application/pdf": { ext: ".pdf", valid: (buffer) => buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-" },
};
const MAX_ATTACHMENT_SIZE = 4 * 1024 * 1024;
export const ticketUploadsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../uploads/tickets");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_SIZE, files: 1, fields: 10, parts: 12 },
  fileFilter: (_req, file, callback) => {
    if (!fileTypes[file.mimetype]) return callback(new BadRequestError("فقط فایل‌های JPG، PNG، WebP یا PDF مجازند."));
    callback(null, true);
  },
}).single("attachment");

export function handleTicketUpload(req, res, next) {
  upload(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === "LIMIT_FILE_SIZE"
        ? "حجم پیوست نباید بیشتر از ۴ مگابایت باشد."
        : "فقط یک پیوست با حجم مجاز می‌توانید ارسال کنید.";
      return next(new BadRequestError(message));
    }
    if (error) return next(error);
    if (req.file && !fileTypes[req.file.mimetype]?.valid(req.file.buffer)) {
      return next(new BadRequestError("محتوای فایل با نوع اعلام‌شده مطابقت ندارد."));
    }
    next();
  });
}

export async function saveTicketAttachment(file) {
  if (!file) return null;
  const kind = fileTypes[file.mimetype];
  if (!kind || !kind.valid(file.buffer) || file.buffer.length > MAX_ATTACHMENT_SIZE) {
    throw new BadRequestError("پیوست نامعتبر است.");
  }
  await mkdir(ticketUploadsDirectory, { recursive: true });
  const filename = `${crypto.randomUUID()}${kind.ext}`;
  const target = path.join(ticketUploadsDirectory, filename);
  await writeFile(target, file.buffer, { flag: "wx", mode: 0o600 });
  return { filename, mime: file.mimetype };
}

export async function deleteTicketAttachment(filename) {
  if (!filename || path.basename(filename) !== filename) return;
  await unlink(path.join(ticketUploadsDirectory, filename)).catch(() => undefined);
}
