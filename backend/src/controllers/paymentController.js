import {
  normalizeMobile,
  digest,
  lockKeys,
  securityAudit,
} from "../services/otpService.js";
import {
  reserveStock,
  transitionReservations,
  enforceGuestLimits,
  releaseExpired,
  cancelChatOrder,
} from "../services/stockService.js";
import { AppError } from "../utils/AppError.js";
import crypto from "node:crypto";
import { markCartConverted } from "../services/cartSnapshotService.js";
import { queueOrderAdminSms } from "../services/orderNotificationService.js";
import { resolveCouponForOrder } from "../services/couponService.js";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import {
  BadRequestError,
  NotFoundError,
  ServiceUnavailableError,
} from "../utils/AppError.js";

const safePaymentSelect = {
  id: true,
  orderId: true,
  method: true,
  status: true,
  amountToman: true,
  createdAt: true,
};
function generateOrderNumber() {
  return `WEB-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function moneyToNumber(value) {
  return Number(value);
}
/** حداکثر تعداد هر مخلفات برای یک قلم اصلی (سقف سبد ۳۰ قلم است). */
const MAX_ADD_ON_QUANTITY = 10;
/** کلید یک قلم در درخواست: محصول + سایز (همان قاعده سبد سایت). */
function lineKey(item) {
  return `${item.productId}::${item.variantId ?? ""}`;
}
/** کلید یکتا برای تشخیص تکراری؛ مخلفات با کلید قلم اصلیش جدا می‌شود. */
function itemKey(item) {
  return item.parent
    ? `${lineKey(item)}::${lineKey(item.parent)}`
    : lineKey(item);
}
async function getOrder(orderId, req) {
  const order = await prisma.chatOrder.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, imageUrl: true } },
        },
      },
    },
  });
  if (!order || (req && order.phoneHash !== digest(req.checkoutPhone)))
    throw new NotFoundError("سفارش پیدا نشد.");
  return order;
}

export async function listChatOrders(req, res, next) {
  try {
    const page = Math.max(
      1,
      Math.min(100000, Number.parseInt(String(req.query.page ?? "1"), 10) || 1),
    );
    const pageSize = Math.max(
      1,
      Math.min(
        100,
        Number.parseInt(String(req.query.pageSize ?? "25"), 10) || 25,
      ),
    );
    const [items, total] = await Promise.all([
      prisma.chatOrder.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          items: {
            include: { product: { select: { name: true, imageUrl: true } } },
          },
          payments: { select: safePaymentSelect },
        },
      }),
      prisma.chatOrder.count(),
    ]);
    res.json({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createChatOrder(req, res, next) {
  try {
    const {
      sessionId,
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress,
      items,
    } = req.body;
    if (
      typeof customerName !== "string" ||
      customerName.trim().length < 2 ||
      customerName.length > 120
    )
      throw new BadRequestError("نام مشتری را درست وارد کنید.");
    if (
      typeof customerPhone !== "string" ||
      !/^[+\d۰-۹٠-٩()\-\s]{8,20}$/.test(customerPhone)
    )
      throw new BadRequestError("شماره تماس معتبر وارد کنید.");
    if (
      customerEmail &&
      (typeof customerEmail !== "string" || customerEmail.length > 254)
    )
      throw new BadRequestError("ایمیل معتبر وارد کنید.");
    if (
      typeof shippingAddress !== "string" ||
      shippingAddress.trim().length < 5 ||
      shippingAddress.length > 2000
    )
      throw new BadRequestError("آدرس کامل برای ارسال را وارد کنید.");
    if (!Array.isArray(items) || items.length < 1 || items.length > 30)
      throw new BadRequestError("سبد خرید معتبر نیست.");
    const normalizedItems = items.map((item) => ({
      productId: String(item.productId ?? ""),
      // سایز/واریانت انتخاب‌شده؛ `null` یعنی محصول تک‌قیمت است.
      variantId:
        item.variantId === undefined ||
        item.variantId === null ||
        item.variantId === ""
          ? null
          : String(item.variantId),
      quantity: Number(item.quantity),
      selectedOptionIds: Array.isArray(item.selectedOptionIds)
        ? item.selectedOptionIds.map((id) => String(id))
        : [],
      // ردیف مخلفات: اشاره به قلم اصلی همان درخواست (شناسه محصول + سایز). سایت
      // این فیلد را فقط برای مخلفات می‌فرستد؛ `null` یعنی قلم مستقل است.
      parent:
        item.parent === undefined || item.parent === null
          ? null
          : {
              productId: String(item.parent.productId ?? ""),
              variantId:
                item.parent.variantId === undefined ||
                item.parent.variantId === null ||
                item.parent.variantId === ""
                  ? null
                  : String(item.parent.variantId),
            },
    }));
    if (
      normalizedItems.some(
        (item) =>
          !item.productId ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 50,
      )
    )
      throw new BadRequestError("شناسه محصول یا تعداد معتبر نیست.");
    if (normalizedItems.some((item) => item.parent && !item.parent.productId))
      throw new BadRequestError("اطلاعات مخلفات کامل نیست.");
    if (
      normalizedItems.some(
        (item) => item.parent && item.parent.productId === item.productId,
      )
    )
      throw new BadRequestError("یک محصول نمی‌تواند مخلفات خودش باشد.");
    // مخلفات یک سطح است (مخلفاتِ مخلفات نداریم) تا فاکتور و انبار ساده بماند.
    if (
      normalizedItems.some(
        (item) =>
          item.parent &&
          !normalizedItems.some(
            (candidate) =>
              !candidate.parent && lineKey(candidate) === lineKey(item.parent),
          ),
      )
    )
      throw new BadRequestError("مخلفات به یک قلم اصلی نامعتبر وصل شده است.");
    if (
      normalizedItems.some(
        (item) => item.parent && item.quantity > MAX_ADD_ON_QUANTITY,
      )
    )
      throw new BadRequestError(
        `حداکثر ${MAX_ADD_ON_QUANTITY} عدد از هر مخلفات در هر قلم اصلی مجاز است.`,
      );
    // «تکراری» یعنی همان محصول با همان سایز و همان قلم اصلی دوبار آمده باشد؛
    // یک محصول می‌تواند هم مستقل باشد و هم مخلفات یک غذا.
    const lineKeys = normalizedItems.map((item) => itemKey(item));
    if (new Set(lineKeys).size !== lineKeys.length)
      throw new BadRequestError(
        "یک سایز از یک محصول را فقط یک‌بار در سبد ثبت کنید.",
      );
    let conversationId = null;
    if (sessionId) {
      const conversation = await prisma.chatConversation.findUnique({
        where: { sessionId },
        select: { id: true },
      });
      if (conversation) conversationId = conversation.id;
    }
    const phone = normalizeMobile(customerPhone);
    if (phone !== req.checkoutPhone)
      throw new AppError(
        "شماره سفارش باید همان شماره تأییدشده باشد.",
        403,
        "PHONE_MISMATCH",
      );
    const rawKey = req.headers["idempotency-key"];
    if (typeof rawKey !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(rawKey))
      throw new BadRequestError("شناسه یکتای درخواست لازم است.");
    const phoneHash = digest(phone),
      ipHash = digest(req.ip);
    const idempotencyKey = digest(`${phone}:${rawKey}`);
    const requestHash = digest(
      JSON.stringify({
        phone,
        customerName,
        customerEmail,
        shippingAddress,
        normalizedItems,
        deliveryFeeToman: env.DELIVERY_FEE_TOMAN,
        vatRateBps: env.VAT_RATE_BPS,
      }),
    );
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + env.STOCK_ONLINE_TTL_SECONDS * 1000,
    );
    await releaseExpired({ now, dryRun: false });
    const bucket = parseInt(phoneHash.slice(0, 8), 16) % 100;
    if (bucket >= env.STOCK_ROLLOUT_PERCENT)
      throw new ServiceUnavailableError("ثبت سفارش موقتاً در دسترس نیست.");
    const order = await prisma.$transaction(
      async (tx) => {
        await lockKeys(tx, [`order:${idempotencyKey}`]);
        const duplicate = await tx.chatOrder.findUnique({
          where: { idempotencyKey },
          include: { items: { include: { product: true, parentItem: true } } },
        });
        if (duplicate) {
          if (duplicate.requestHash !== requestHash)
            throw new AppError(
              "شناسه درخواست برای سفارش دیگری استفاده شده است.",
              409,
              "IDEMPOTENCY_CONFLICT",
            );
          return duplicate;
        }
        await enforceGuestLimits(tx, phoneHash, ipHash, now);
        const products = await tx.product.findMany({
          where: {
            id: { in: normalizedItems.map((item) => item.productId) },
            isActive: true,
          },
          include: {
            variants: {
              where: { isActive: true },
              select: { id: true, label: true, price: true },
            },
            customOptions: {
              where: { isActive: true },
              select: { id: true, label: true, labelEn: true, priceDelta: true },
            },
          },
        });
        const productMap = new Map(
          products.map((product) => [product.id, product]),
        );

        // موجودی به‌ازای هر محصول کم می‌شود، نه هر سایز؛ پس مجموع تعداد سایزهای
        // یک محصول ملاک بررسی موجودی است.
        const quantityByProduct = new Map();
        for (const item of normalizedItems) {
          quantityByProduct.set(
            item.productId,
            (quantityByProduct.get(item.productId) ?? 0) + item.quantity,
          );
        }
        for (const [productId, needed] of quantityByProduct) {
          const product = productMap.get(productId);
          if (!product)
            throw new BadRequestError(
              "یکی از محصولات وجود ندارد یا غیرفعال است.",
            );
          if (product.stock < needed)
            throw new AppError(
              `موجودی «${product.name}» کافی نیست.`,
              409,
              "OUT_OF_STOCK",
            );
        }

        // قیمت و برچسب سایز از دیتابیس خوانده می‌شود؛ قیمت ارسالی مرورگر مرجع نیست.
        const lines = normalizedItems.map((item) => {
          const product = productMap.get(item.productId);
          if (!item.variantId)
            return { ...item, unitPrice: product.price, variantLabel: null };

          const variant = product.variants.find(
            (candidate) => candidate.id === item.variantId,
          );
          if (!variant)
            throw new BadRequestError(
              `سایز انتخاب‌شده «${product.name}» موجود نیست.`,
            );
          return {
            ...item,
            unitPrice: variant.price,
            variantLabel: variant.label,
          };
        });

        for (const line of lines) {
          const product = productMap.get(line.productId);
          const optionById = new Map(product.customOptions.map((option) => [option.id, option]));
          const selectedOptions = line.selectedOptionIds.map((id) => optionById.get(id));
          if (selectedOptions.some((option) => !option)) {
            throw new BadRequestError(`Ø§ÙØ²ÙˆØ¯Ù†ÛŒ Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡ Ø¨Ø±Ø§ÛŒ ${product.name} Ù†Ø§Ù…Ø¹ØªØ¨Ø¨Ø± ÛŒØ§ ØºÛŒØ±ÙØ¹Ø§Ù„ Ø§Ø³Øª.`);
          }
          line.selectedOptions = selectedOptions.map((option) => ({
            id: option.id,
            label: option.label,
            labelEn: option.labelEn,
            priceDelta: Number(option.priceDelta),
          }));
          line.unitPrice = Number(line.unitPrice) + selectedOptions.reduce(
            (sum, option) => sum + Number(option.priceDelta),
            0,
          );
        }

        // مخلفات فقط وقتی پذیرفته می‌شود که برای همان غذای اصلی در پنل تعریف شده
        // باشد؛ این‌طور شناسه نامرتبط یا دستکاری‌شده نمی‌تواند به سفارش برسد.
        const addOnLines = lines.filter((line) => line.parent);
        if (addOnLines.length > 0) {
          const links = await tx.productAddOn.findMany({
            where: {
              productId: {
                in: [
                  ...new Set(addOnLines.map((line) => line.parent.productId)),
                ],
              },
              isActive: true,
            },
            select: { productId: true, addOnId: true },
          });
          const allowed = new Set(
            links.map((link) => `${link.productId}::${link.addOnId}`),
          );
          for (const line of addOnLines) {
            if (!allowed.has(`${line.parent.productId}::${line.productId}`)) {
              throw new BadRequestError(
                `«${productMap.get(line.productId).name}» برای «${productMap.get(line.parent.productId).name}» به‌عنوان مخلفات تعریف نشده است.`,
              );
            }
          }
        }

        const subtotal = lines.reduce(
          (sum, line) => sum + Number(line.unitPrice) * line.quantity,
          0,
        );
        if (!Number.isSafeInteger(Math.round(subtotal)) || subtotal <= 0)
          throw new BadRequestError("مبلغ سفارش معتبر نیست.");
        let coupon = null;
        let discountAmount = 0;
        if (req.body.couponCode) {
          const member = await tx.clubMember.findUnique({ where: { phone }, select: { id: true, isActive: true } });
          const resolved = await resolveCouponForOrder(req.body.couponCode, subtotal, tx, { clubMemberId: member?.isActive ? member.id : null });
          coupon = resolved.coupon;
          discountAmount = resolved.discountAmount;
          const updated = await tx.coupon.updateMany({ where: { id: coupon.id, isActive: true, ...(coupon.maxUses === null ? {} : { usedCount: { lt: coupon.maxUses } }) }, data: { usedCount: { increment: 1 } } });
          if (updated.count !== 1) throw new BadRequestError("Coupon can no longer be used.");
        }
        const deliveryFeeAmount = env.DELIVERY_FEE_TOMAN;
        const discountedSubtotal = Math.max(0, subtotal - discountAmount);
        const taxAmount = Math.round((discountedSubtotal * env.VAT_RATE_BPS) / 10000);
        const totalAmount = discountedSubtotal + deliveryFeeAmount + taxAmount;
        if (!Number.isSafeInteger(totalAmount))
          throw new BadRequestError("مبلغ نهایی سفارش معتبر نیست.");
        const created = await tx.chatOrder.create({
          data: {
            orderNumber: generateOrderNumber(),
            conversationId,
            customerName: customerName.trim(),
            customerPhone: phone,
            couponCode: coupon?.code ?? null,
            discountAmount,
            marketingConsent: req.body.marketingConsent === true,
            marketingConsentAt: req.body.marketingConsent === true ? now : null,
            phoneHash,
            ipHash,
            idempotencyKey,
            requestHash,
            expiresAt,
            status: "RESERVED",
            customerEmail: customerEmail?.trim() || null,
            shippingAddress: shippingAddress.trim(),
            subtotalAmount: discountedSubtotal,
            deliveryFeeAmount,
            taxAmount,
            totalAmount,
          },
        });
        if (req.body.marketingConsent === true) {
          await tx.customerMarketingConsent.upsert({ where: { phoneHash }, create: { phoneHash, marketingAllowed: true, consentAt: now, source: "website_checkout" }, update: { marketingAllowed: true, consentAt: now, source: "website_checkout" } });
          await tx.clubMember.updateMany({ where: { phone, isActive: true }, data: { marketingConsent: true, marketingConsentAt: now, marketingConsentSource: "website_checkout" } });
        }
        await markCartConverted(tx, sessionId, now);

        // ردیف‌ها یکی‌یکی ساخته می‌شوند تا شناسه ردیف اصلی در دست باشد و ردیف
        // مخلفات با `parentItemId` به همان قلم وصل شود (سفارش حداکثر ۳۰ قلم است).
        const itemIdByLineKey = new Map();
        for (const line of lines.filter((candidate) => !candidate.parent)) {
          const row = await tx.chatOrderItem.create({
            data: {
              orderId: created.id,
              productId: line.productId,
              variantId: line.variantId,
              variantLabel: line.variantLabel,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              selectedOptions: line.selectedOptions,
            },
          });
          itemIdByLineKey.set(lineKey(line), row.id);
        }
        for (const line of addOnLines) {
          await tx.chatOrderItem.create({
            data: {
              orderId: created.id,
              parentItemId: itemIdByLineKey.get(lineKey(line.parent)),
              productId: line.productId,
              variantId: line.variantId,
              variantLabel: line.variantLabel,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              selectedOptions: line.selectedOptions,
            },
          });
        }

        await reserveStock(tx, created.id, normalizedItems, expiresAt);
        return tx.chatOrder.findUnique({
          where: { id: created.id },
          include: {
            items: {
              orderBy: { id: "asc" },
              include: {
                product: { select: { name: true, imageUrl: true } },
                // کلید قلم اصلی برای گروه‌بندی فاکتور در سایت و گفتگو.
                parentItem: { select: { productId: true, variantId: true } },
              },
            },
          },
        });
      },
      { timeout: 15000 },
    );
    res.status(201).json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        expiresAt: order.expiresAt,
        totalAmount: moneyToNumber(order.totalAmount),
        deliveryFeeAmount: moneyToNumber(order.deliveryFeeAmount),
        taxAmount: moneyToNumber(order.taxAmount),
        currency: "TOMAN",
        items: order.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: moneyToNumber(item.unitPrice),
          imageUrl: item.product.imageUrl,
          variantLabel: item.variantLabel ?? null,
          selectedOptions: item.selectedOptions,
          parentKey: item.parentItem
            ? `${item.parentItem.productId}::${item.parentItem.variantId ?? ""}`
            : null,
        })),
      },
    });
  } catch (error) {
    if (
      ["OUT_OF_STOCK", "IDEMPOTENCY_CONFLICT", "RESERVATION_LIMIT"].includes(
        error.code,
      )
    ) {
      await securityAudit(
        prisma,
        error.code === "OUT_OF_STOCK" ? "stock.conflict" : "stock.rate_limited",
        req.checkoutPhone,
        { code: error.code },
      ).catch(() => {});
    }
    next(error);
  }
}

export async function getPaymentConfig(_req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    dargah: { enabled: false },
    cod: { enabled: true, methods: ["cash", "pos"] },
    onlinePayment: { enabled: false },
    deliveryFeeToman: env.DELIVERY_FEE_TOMAN,
    vatRateBps: env.VAT_RATE_BPS,
    currency: "TOMAN",
  });
}

export async function confirmCashOnDelivery(req, res, next) {
  try {
    const order = await getOrder(req.params.orderId, req);
    const confirmed = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM chat_orders WHERE id=${order.id} FOR UPDATE`;
      const current = await tx.chatOrder.findUnique({ where: { id: order.id } });
      if (
        current.status === "CONFIRMED" &&
        current.paymentMethod === "CASH_ON_DELIVERY"
      ) return current;
      if (
        current.status !== "RESERVED" ||
        !current.expiresAt ||
        current.expiresAt <= new Date()
      ) throw new BadRequestError("رزرو سفارش منقضی یا غیرقابل تأیید است.");
      const activeReservations = await tx.stockReservation.count({
        where: { orderId: current.id, orderKind: "chat", status: "active" },
      });
      if (!activeReservations)
        throw new BadRequestError("رزرو موجودی سفارش معتبر نیست.");
      await transitionReservations(tx, current.id, "consumed", "cod_confirmed");
      const confirmedOrder = await tx.chatOrder.update({
        where: { id: current.id },
        data: {
          status: "CONFIRMED",
          paymentMethod: "CASH_ON_DELIVERY",
          expiresAt: null,
        },
      });
      await queueOrderAdminSms(tx, confirmedOrder.id);
      return confirmedOrder;
    });
    res.json({
      order: {
        id: confirmed.id,
        orderNumber: confirmed.orderNumber,
        status: confirmed.status,
        paymentMethod: "CASH_ON_DELIVERY",
        subtotalAmount: moneyToNumber(confirmed.subtotalAmount),
        deliveryFeeAmount: moneyToNumber(confirmed.deliveryFeeAmount),
        taxAmount: moneyToNumber(confirmed.taxAmount),
        totalAmount: moneyToNumber(confirmed.totalAmount),
        currency: "TOMAN",
      },
    });
  } catch (error) {
    next(error);
  }
}
export async function readGuestOrder(req, res, next) {
  try {
    const order = await getOrder(req.params.orderId, req);
    res.json({
      order: { id: order.id, status: order.status, expiresAt: order.expiresAt },
    });
  } catch (error) {
    next(error);
  }
}
export async function cancelGuestOrder(req, res, next) {
  try {
    const order = await getOrder(req.params.orderId, req);
    const cancelled = await cancelChatOrder(order.id);
    res.json({ order: { id: cancelled.id, status: cancelled.status } });
  } catch (error) {
    next(error);
  }
}
