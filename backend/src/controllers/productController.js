import * as productService from "../services/productService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { unlink } from "node:fs/promises";

export const listProducts = asyncHandler(async (req, res) => {
  res.json(await productService.listProducts(req.query));
});

export const getProduct = asyncHandler(async (req, res) => {
  res.json({ product: await productService.getProductById(req.params.id) });
});

export const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json({ product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  res.json({ product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.params.id);
  res.status(204).send();
});

export const uploadProductImage = asyncHandler(async (req, res) => {
  const imageUrl = `/uploads/products/${req.file.filename}`;
  try {
    const product = await productService.updateProduct(req.params.id, { imageUrl });
    res.json({ product });
  } catch (error) {
    await unlink(req.file.path).catch(() => undefined);
    throw error;
  }
});
