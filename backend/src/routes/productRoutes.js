import { Router } from "express";
import * as productController from "../controllers/productController.js";
import { validate } from "../middleware/validate.js";
import {
  listProductsSchema,
  productIdParamSchema,
  createProductSchema,
  updateProductSchema,
} from "../validators/productValidators.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { handleUpload } from "../middleware/upload.js";

const router = Router();

router.use(requireAuth);

router.get("/", validate(listProductsSchema), productController.listProducts);
router.get("/:id", validate(productIdParamSchema), productController.getProduct);

router.post(
  "/",
  requireRole("ADMIN", "MANAGER"),
  validate(createProductSchema),
  productController.createProduct,
);
router.patch(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  validate(updateProductSchema),
  productController.updateProduct,
);
router.post(
  "/:id/image",
  requireRole("ADMIN", "MANAGER"),
  validate(productIdParamSchema),
  handleUpload,
  productController.uploadProductImage,
);
router.delete(
  "/:id",
  requireRole("ADMIN"),
  validate(productIdParamSchema),
  productController.deleteProduct,
);

export default router;
