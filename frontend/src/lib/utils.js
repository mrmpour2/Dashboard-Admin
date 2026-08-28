import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ادغام امن کلاس‌های Tailwind (حذف تداخل و رفع تکرار)
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
