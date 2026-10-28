import { prisma } from "../config/prisma.js";
import { BadRequestError } from "../utils/AppError.js";
import { hashCartSession } from "../services/cartSnapshotService.js";

const sessionPattern = /^[\w-]{20,100}$/;

export async function updateCartSnapshot(req, res, next) {
  try {
    const { sessionId, items } = req.body;
    if (typeof sessionId !== "string" || !sessionPattern.test(sessionId)) throw new BadRequestError("شناسه نشست معتبر نیست.");
    if (!Array.isArray(items) || items.length > 30) throw new BadRequestError("سبد خرید معتبر نیست.");
    const sessionHash = hashCartSession(sessionId);
    if (items.length === 0) {
      await prisma.cartSnapshot.deleteMany({ where: { sessionHash, status: { in: ["ACTIVE", "ABANDONED"] } } });
      return res.status(204).end();
    }
    if (items.some((item) => !item || typeof item.productId !== "string" || item.productId.length > 100 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50 || (item.variantId != null && (typeof item.variantId !== "string" || item.variantId.length > 100)))) throw new BadRequestError("اقلام سبد معتبر نیستند.");
    const products = await prisma.product.findMany({ where: { id: { in: [...new Set(items.map((item) => item.productId))] }, isActive: true }, include: { variants: { where: { isActive: true }, select: { id: true, price: true } } } });
    const productById = new Map(products.map((product) => [product.id, product]));
    let totalAmount = 0;
    const compactItems = items.map(({ productId, variantId, quantity }) => {
      const product = productById.get(productId);
      const variant = variantId ? product?.variants.find((candidate) => candidate.id === variantId) : null;
      if (!product || (variantId && !variant)) throw new BadRequestError("محصول یا اندازه انتخاب‌شده معتبر نیست.");
      totalAmount += Number(variant?.price ?? product.price) * quantity;
      return { productId, ...(variantId ? { variantId } : {}), quantity };
    });
    if (!Number.isSafeInteger(Math.round(totalAmount))) throw new BadRequestError("مبلغ سبد معتبر نیست.");
    await prisma.cartSnapshot.upsert({
      where: { sessionHash },
      create: { sessionHash, items: compactItems, totalAmount, lastActivity: new Date(), status: "ACTIVE" },
      update: { items: compactItems, totalAmount, lastActivity: new Date(), status: "ACTIVE", convertedAt: null },
    });
    return res.status(204).end();
  } catch (error) { return next(error); }
}
