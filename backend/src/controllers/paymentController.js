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
  finalizeVerifiedPayment,
  cancelChatOrder,
} from "../services/stockService.js";
import { AppError } from "../utils/AppError.js";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { awardOrderPoints } from "../services/clubService.js";
import {
  BadRequestError,
  NotFoundError,
  ServiceUnavailableError,
} from "../utils/AppError.js";

const ALLOWED_RECEIPT_TYPES = {
  "image/jpeg": { ext: ".jpg", magic: [Buffer.from([0xff, 0xd8, 0xff])] },
  "image/png": {
    ext: ".png",
    magic: [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  },
  "image/webp": {
    ext: ".webp",
    magic: [Buffer.from("RIFF"), Buffer.from("WEBP")],
  },
};
const safePaymentSelect = {
  id: true,
  orderId: true,
  method: true,
  status: true,
  amountToman: true,
  transferReference: true,
  createdAt: true,
};
function generateOrderNumber() {
  return `WEB-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

/**
 * ثبت امتیاز باشگاه پس از پرداخت.
 *
 * خطای امتیاز هرگز نباید پرداخت را ناموفق یا دوباره‌پرداخت کند؛ سفارش قبلاً
 * PAID شده و ثبت امتیاز به‌صورت idempotent قابل تکرار است. برای همین خطا فقط
 * لاگ می‌شود و عدد صفر برمی‌گردد.
 */
async function safeAwardOrderPoints(orderId) {
  try {
    return await awardOrderPoints(orderId);
  } catch (error) {
    console.error("club order points failed", error);
    return { awarded: 0, balanceAfter: null };
  }
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
        const created = await tx.chatOrder.create({
          data: {
            orderNumber: generateOrderNumber(),
            conversationId,
            customerName: customerName.trim(),
            customerPhone: phone,
            phoneHash,
            ipHash,
            idempotencyKey,
            requestHash,
            expiresAt,
            status: "RESERVED",
            customerEmail: customerEmail?.trim() || null,
            shippingAddress: shippingAddress.trim(),
            subtotalAmount: subtotal,
            totalAmount: subtotal,
          },
        });

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
        currency: "TOMAN",
        items: order.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: moneyToNumber(item.unitPrice),
          imageUrl: item.product.imageUrl,
          variantLabel: item.variantLabel ?? null,
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
    storeName: env.STORE_NAME,
    cardToCard: {
      enabled: Boolean(env.CARD_TO_CARD_NUMBER && env.CARD_TO_CARD_OWNER),
      cardNumber: env.CARD_TO_CARD_NUMBER || null,
      ownerName: env.CARD_TO_CARD_OWNER || null,
      bankName: env.CARD_TO_CARD_BANK || null,
    },
    paypingEnabled: Boolean(env.PAYPING_TOKEN),
  });
}

export async function submitCardToCardReceipt(req, res, next) {
  try {
    const { orderId, imageData, transferReference } = req.body;
    const order = await getOrder(String(orderId ?? ""), req);
    if (!["PENDING_PAYMENT", "RESERVED"].includes(order.status))
      throw new BadRequestError("این سفارش در وضعیت قابل پرداخت نیست.");
    if (!env.CARD_TO_CARD_NUMBER || !env.CARD_TO_CARD_OWNER)
      throw new ServiceUnavailableError(
        "اطلاعات کارت‌به‌کارت هنوز توسط مدیر تنظیم نشده است.",
      );
    if (typeof imageData !== "string" || imageData.length > 7_000_000)
      throw new BadRequestError("تصویر رسید معتبر نیست یا حجم آن زیاد است.");
    const match = imageData.match(
      /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/,
    );
    if (!match)
      throw new BadRequestError("رسید باید تصویر JPG، PNG یا WebP باشد.");
    const mime = match[1];
    const bytes = Buffer.from(match[2], "base64");
    if (!bytes.length || bytes.length > 5 * 1024 * 1024)
      throw new BadRequestError("حجم تصویر رسید باید کمتر از ۵ مگابایت باشد.");
    const allowed = ALLOWED_RECEIPT_TYPES[mime];
    const magicValid =
      mime === "image/webp"
        ? bytes.subarray(0, 4).equals(Buffer.from("RIFF")) &&
          bytes.subarray(8, 12).equals(Buffer.from("WEBP"))
        : allowed.magic.some((magic) =>
            bytes.subarray(0, magic.length).equals(magic),
          );
    if (!magicValid)
      throw new BadRequestError(
        "محتوای فایل با نوع تصویر اعلام‌شده مطابقت ندارد.",
      );
    const dir = path.resolve(env.CHAT_RECEIPTS_DIR);
    await fs.mkdir(dir, { recursive: true });
    const filename = `${crypto.randomBytes(20).toString("hex")}${allowed.ext}`;
    const fullPath = path.join(dir, filename);
    await fs.writeFile(fullPath, bytes, { flag: "wx", mode: 0o600 });
    try {
      const payment = await prisma.chatPayment.create({
        data: {
          orderId: order.id,
          method: "CARD_TO_CARD",
          status: "PENDING_REVIEW",
          amountToman: Number(order.totalAmount),
          receiptPath: fullPath,
          transferReference:
            typeof transferReference === "string"
              ? transferReference.trim().slice(0, 120) || null
              : null,
        },
      });
      res.status(201).json({
        payment: {
          id: payment.id,
          status: payment.status,
          amountToman: Number(payment.amountToman),
          message: "رسید ثبت شد و پس از بررسی مدیر نتیجه اعلام می‌شود.",
        },
      });
    } catch (error) {
      await fs.unlink(fullPath).catch(() => {});
      throw error;
    }
  } catch (error) {
    next(error);
  }
}

export async function listCardToCardReceipts(_req, res, next) {
  try {
    const payments = await prisma.chatPayment.findMany({
      where: { method: "CARD_TO_CARD" },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        ...safePaymentSelect,
        adminNote: true,
        reviewedAt: true,
        order: {
          select: {
            orderNumber: true,
            customerName: true,
            customerPhone: true,
          },
        },
      },
    });
    res.json({ items: payments });
  } catch (error) {
    next(error);
  }
}

export async function viewCardToCardReceipt(req, res, next) {
  try {
    const payment = await prisma.chatPayment.findUnique({
      where: { id: req.params.paymentId },
      select: { method: true, receiptPath: true },
    });
    if (!payment || payment.method !== "CARD_TO_CARD" || !payment.receiptPath)
      throw new NotFoundError("تصویر رسید پیدا نشد.");
    const resolved = path.resolve(payment.receiptPath);
    const root = path.resolve(env.CHAT_RECEIPTS_DIR) + path.sep;
    if (!resolved.startsWith(root))
      throw new NotFoundError("تصویر رسید پیدا نشد.");
    const ext = path.extname(resolved).toLowerCase();
    const mime = {
      ".jpg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    }[ext];
    if (!mime) throw new NotFoundError("تصویر رسید پیدا نشد.");
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.sendFile(resolved);
  } catch (error) {
    next(error);
  }
}

export async function reviewCardToCardReceipt(req, res, next) {
  try {
    const { decision, note } = req.body;
    if (!["approve", "reject"].includes(decision))
      throw new BadRequestError("تصمیم بررسی معتبر نیست.");
    const payment = await prisma.chatPayment.findUnique({
      where: { id: req.params.paymentId },
    });
    if (!payment || payment.method !== "CARD_TO_CARD")
      throw new NotFoundError("رسید پیدا نشد.");
    if (payment.status !== "PENDING_REVIEW")
      throw new BadRequestError("این رسید قبلاً بررسی شده است.");
    const updated = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM chat_orders WHERE id=${payment.orderId} FOR UPDATE`;
      const current = await tx.chatPayment.findUnique({
        where: { id: payment.id },
      });
      if (current.status !== "PENDING_REVIEW")
        throw new BadRequestError("این رسید قبلاً بررسی شده است.");
      if (decision === "approve")
        await finalizeVerifiedPayment(tx, payment, { receipt: true });
      else {
        const order = await tx.chatOrder.findUnique({
          where: { id: payment.orderId },
        });
        if (!["PENDING_PAYMENT", "RESERVED", "EXPIRED"].includes(order.status))
          throw new BadRequestError("سفارش در وضعیت قابل بررسی نیست.");
        await transitionReservations(
          tx,
          payment.orderId,
          "released",
          "receipt_rejected",
        );
        await tx.chatOrder.update({
          where: { id: payment.orderId },
          data: { status: "CANCELLED" },
        });
        await tx.chatPayment.update({
          where: { id: payment.id },
          data: { status: "REJECTED" },
        });
      }
      await tx.chatPayment.update({
        where: { id: payment.id },
        data: {
          reviewedById: req.user.id,
          reviewedAt: new Date(),
          ...(typeof note === "string"
            ? { adminNote: note.trim().slice(0, 1000) }
            : {}),
        },
      });
      return tx.chatPayment.findUnique({ where: { id: payment.id } });
    });
    const award =
      updated.status === "PAID"
        ? await safeAwardOrderPoints(payment.orderId)
        : { awarded: 0, balanceAfter: null };
    res.json({
      payment: {
        id: updated.id,
        status: updated.status,
        reviewedAt: updated.reviewedAt,
      },
      pointsAwarded: award.awarded,
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
