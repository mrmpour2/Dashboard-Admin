import * as orderService from "../services/orderService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listOrders = asyncHandler(async (req, res) => {
  res.json(await orderService.listOrders(req.query));
});

export const getOrder = asyncHandler(async (req, res) => {
  res.json({ order: await orderService.getOrderById(req.params.id) });
});

export const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.body);
  res.status(201).json({ order });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus(req.params.id, req.body.status);
  res.json({ order });
});
