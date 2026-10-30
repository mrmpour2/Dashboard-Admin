import * as orderService from "../services/orderService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as siteOrderAdminService from "../services/siteOrderAdminService.js";

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

export const listSiteOrders = asyncHandler(async (req, res) => {
  res.json(await siteOrderAdminService.listSiteOrders(req.query, req.user));
});

export const getSiteOrder = asyncHandler(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ order: await siteOrderAdminService.getSiteOrder(req.params.id, req.user) });
});

export const updateSiteOrderStatus = asyncHandler(async (req, res) => {
  const order = await siteOrderAdminService.updateSiteOrderStatus(req.params.id, req.body.status, req.user.id);
  res.json({ order: { id: order.id, orderNumber: order.orderNumber, status: order.status } });
});
