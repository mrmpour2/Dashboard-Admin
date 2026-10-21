import { asyncHandler } from "../utils/asyncHandler.js";
import { findPublicMenuItem, listPublicMenu, listPublicMenuAddOns } from "../services/publicMenuService.js";

// فهرست عمومی منو برای وب‌سایت — بدون احراز هویت و فقط خواندنی.
export const listMenu = asyncHandler(async (req, res) => {
  res.json(await listPublicMenu({ category: req.query.category }));
});

export const getMenuItem = asyncHandler(async (req, res) => {
  res.json({ item: await findPublicMenuItem(req.params.id) });
});

// مخلفات پیشنهادی یک غذا؛ فقط هنگام باز شدن پنل «تکمیل سفارش» درخواست می‌شود.
export const getMenuItemAddOns = asyncHandler(async (req, res) => {
  res.json(await listPublicMenuAddOns(req.params.id));
});
