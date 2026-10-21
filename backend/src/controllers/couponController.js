import * as couponService from "../services/couponService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listCoupons = asyncHandler(async (req, res) => {
  res.json(await couponService.listCoupons(req.query));
});

export const getCoupon = asyncHandler(async (req, res) => {
  res.json({ coupon: await couponService.getCouponById(req.params.id) });
});

export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.createCoupon(req.body);
  res.status(201).json({ coupon });
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.updateCoupon(req.params.id, req.body);
  res.json({ coupon });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  await couponService.deleteCoupon(req.params.id);
  res.status(204).send();
});
