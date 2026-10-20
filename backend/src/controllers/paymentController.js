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
async function getOrder(orderId) {
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
  if (!order) throw new NotFoundError("سفارش پیدا نشد.");
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
    const order = await prisma.$transaction(
      async (tx) => {
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
            throw new BadRequestError(`موجودی «${product.name}» کافی نیست.`);
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
            customerPhone: customerPhone.trim(),
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

        for (const [productId, needed] of quantityByProduct) {
          const update = await tx.product.updateMany({
            where: { id: productId, isActive: true, stock: { gte: needed } },
            data: { stock: { decrement: needed } },
          });
          if (update.count !== 1)
            throw new BadRequestError(
              "موجودی یکی از محصولات تغییر کرده است؛ لطفاً سفارش را دوباره ثبت کنید.",
            );
        }
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
      { isolationLevel: "Serializable" },
    );
    res
      .status(201)
      .json({
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
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
    next(error);
  }
}

export async function createZibalRequest(req, res, next) {
  try {
    if (!env.ZIBAL_MERCHANT)
      throw new ServiceUnavailableError("درگاه زیبال تنظیم نشده است.");
    const { orderId } = req.body;
    const order = await getOrder(String(orderId ?? ""));
    if (order.status !== "PENDING_PAYMENT")
      throw new BadRequestError("این سفارش در وضعیت قابل پرداخت نیست.");
    const existingPending = await prisma.chatPayment.findFirst({
      where: {
        orderId: order.id,
        method: "ZIBAL",
        status: "PENDING",
        zibalTrackId: { not: null },
      },
      orderBy: { createdAt: "desc" },
    });
    if (existingPending?.zibalTrackId) {
      return res
        .status(200)
        .json({
          paymentId: existingPending.id,
          trackId: existingPending.zibalTrackId,
          paymentUrl: `https://gateway.zibal.ir/start/${encodeURIComponent(existingPending.zibalTrackId)}`,
          amountToman: moneyToNumber(existingPending.amountToman),
          amountRial: Number(existingPending.amountRial),
        });
    }
    const amountToman = moneyToNumber(order.totalAmount);
    // قیمت محصولات سایت به تومان است؛ زیبال مبلغ را به ریال می‌گیرد.
    const amountRial = BigInt(Math.round(amountToman * 10));
    if (amountRial <= 0n) throw new BadRequestError("مبلغ پرداخت معتبر نیست.");
    const payment = await prisma.chatPayment.create({
      data: {
        orderId: order.id,
        method: "ZIBAL",
        status: "INITIATED",
        amountToman,
        amountRial,
      },
    });
    const callbackUrl = `${env.PUBLIC_API_BASE_URL.replace(/\/$/, "")}/payment/zibal/callback?paymentId=${encodeURIComponent(payment.id)}`;
    let response;
    try {
      response = await fetch(
        `${env.ZIBAL_API_BASE_URL.replace(/\/$/, "")}/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant: env.ZIBAL_MERCHANT,
            amount: Number(amountRial),
            callbackUrl,
            description: `پرداخت سفارش ${order.orderNumber}`,
            orderId: order.orderNumber,
          }),
          signal: AbortSignal.timeout(12000),
        },
      );
    } catch {
      throw new ServiceUnavailableError(
        "ارتباط با درگاه زیبال برقرار نشد؛ دوباره تلاش کنید.",
      );
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.result !== 100 || !data.trackId) {
      await prisma.chatPayment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          adminNote: `Zibal request failed: ${String(data.result ?? response.status)}`,
        },
      });
      throw new BadRequestError(
        "درگاه نتوانست درخواست پرداخت را بسازد. اطلاعات پذیرنده و مبلغ را بررسی کنید.",
      );
    }
    await prisma.chatPayment.update({
      where: { id: payment.id },
      data: { status: "PENDING", zibalTrackId: String(data.trackId) },
    });
    res
      .status(201)
      .json({
        paymentId: payment.id,
        trackId: data.trackId,
        paymentUrl: `https://gateway.zibal.ir/start/${encodeURIComponent(data.trackId)}`,
        amountToman,
        amountRial: Number(amountRial),
      });
  } catch (error) {
    next(error);
  }
}

async function verifyZibalPayment(payment, trackId) {
  if (payment.method !== "ZIBAL" || payment.zibalTrackId !== String(trackId))
    throw new BadRequestError("شناسه پرداخت معتبر نیست.");
  if (payment.status === "PAID") {
    // اگر در تأیید قبلی ثبت امتیاز نیمه‌کاره مانده باشد، همین‌جا کامل می‌شود؛
    // کلید یکتا از امتیاز دوباره جلوگیری می‌کند.
    const award = await safeAwardOrderPoints(payment.orderId);
    return { verified: true, alreadyVerified: true, pointsAwarded: award.awarded };
  }
  let response;
  try {
    response = await fetch(
      `${env.ZIBAL_API_BASE_URL.replace(/\/$/, "")}/verify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant: env.ZIBAL_MERCHANT,
          trackId: Number(trackId),
        }),
        signal: AbortSignal.timeout(12000),
      },
    );
  } catch {
    throw new ServiceUnavailableError(
      "در حال حاضر امکان تأیید تراکنش وجود ندارد.",
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.result !== 100) {
    if (data.result === 201)
      throw new BadRequestError(
        "تراکنش قبلاً در زیبال تأیید شده، اما در این سفارش تأیید ثبت نشده است؛ پشتیبانی باید آن را بررسی کند.",
      );
    await prisma.$transaction(async (tx) => {
      // Claim the transition before restoring stock. Concurrent callbacks wait
      // for the row lock and only one can leave PENDING_PAYMENT.
      const cancelled = await tx.chatOrder.updateMany({
        where: { id: payment.orderId, status: "PENDING_PAYMENT" },
        data: { status: "CANCELLED" },
      });
      if (cancelled.count === 1) {
        const order = await tx.chatOrder.findUnique({ where: { id: payment.orderId }, include: { items: true } });
        for (const item of order.items)
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
      }
      await tx.chatPayment.updateMany({
        where: { id: payment.id, status: { not: "PAID" } },
        data: {
          status: "FAILED",
          adminNote: `Zibal verify result: ${String(data.result ?? response.status)}`,
        },
      });
    });
    return { verified: false };
  }
  // نتیجهٔ موفق به‌تنهایی کافی نیست؛ مبلغ بازگشتی باید دقیقاً با مبلغ ذخیره‌شدهٔ سفارش برابر باشد.
  if (
    data.amount == null ||
    !Number.isFinite(Number(data.amount)) ||
    Number(data.amount) !== Number(payment.amountRial)
  ) {
    await prisma.chatPayment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        adminNote:
          "Zibal verification amount did not match the stored order amount; manual reconciliation required.",
      },
    });
    throw new BadRequestError(
      "مبلغ تأییدشده با مبلغ سفارش تطبیق ندارد؛ برای بررسی با پشتیبانی تماس بگیرید.",
    );
  }
  // مبلغ و شناسه از رکورد سرور گرفته می‌شوند؛ پارامترهای مرورگر مرجع مبلغ نیستند.
  await prisma.$transaction(async (tx) => {
    const paid = await tx.chatOrder.updateMany({
      where: { id: payment.orderId, status: "PENDING_PAYMENT" },
      data: { status: "PAID" },
    });
    if (paid.count !== 1) {
      const current = await tx.chatPayment.findUnique({ where: { id: payment.id } });
      if (current?.status === "PAID") return;
      throw new BadRequestError("وضعیت سفارش تغییر کرده است؛ پرداخت باید توسط پشتیبانی بررسی شود.");
    }
    await tx.chatPayment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        zibalRefNumber: data.refNumber == null ? null : String(data.refNumber),
      },
    });
  });
  // سفارش در تراکنش بالا PAID شده است؛ امتیاز از مبلغ ذخیره‌شدهٔ همان سفارش
  // محاسبه می‌شود، نه از ورودی مرورگر. ثبت idempotent است.
  const award = await safeAwardOrderPoints(payment.orderId);
  return {
    verified: true,
    alreadyVerified: false,
    refNumber: data.refNumber ?? null,
    pointsAwarded: award.awarded,
  };
}

export async function verifyZibalRequest(req, res, next) {
  try {
    const paymentId = String(req.body.paymentId ?? "");
    const trackId = String(req.body.trackId ?? "");
    if (!paymentId || !/^\d{1,30}$/.test(trackId))
      throw new BadRequestError("اطلاعات پرداخت کامل نیست.");
    const payment = await prisma.chatPayment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundError("پرداخت پیدا نشد.");
    const result = await verifyZibalPayment(payment, trackId);
    res.json({ ...result, orderId: payment.orderId });
  } catch (error) {
    next(error);
  }
}

export async function zibalCallback(req, res, _next) {
  const { paymentId, trackId } = req.query;
  const frontendUrl = env.FRONTEND_URL.replace(/\/$/, "");
  let outcome = "failed";

  try {
    if (!paymentId || !trackId || !/^\d{1,30}$/.test(trackId)) {
      return res.redirect(
        303,
        `${frontendUrl}/?payment=failed&reason=invalid_params`,
      );
    }

    const payment = await prisma.chatPayment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      return res.redirect(
        303,
        `${frontendUrl}/?payment=failed&reason=payment_not_found`,
      );
    }

    const result = await verifyZibalPayment(payment, trackId);
    // verifyZibalPayment نتیجه را با `verified` برمی‌گرداند (نه `status`)؛
    // این شرط مسیر بازگشت موفق را به صفحهٔ نتیجه هدایت می‌کند.
    if (result?.verified) {
      outcome = "success";
    }
  } catch (error) {
    // جلوگیری از شکست برنامه با ارور 500 و لاگ خطا
    if (req.log && typeof req.log.error === "function") {
      req.log.error(error, "Zibal callback verification failed");
    } else {
      console.error("Zibal callback error:", error);
    }
    outcome = "failed";
  }

  return res.redirect(
    303,
    `${frontendUrl}/?payment=${outcome}&paymentId=${encodeURIComponent(paymentId || "")}`,
  );
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
    zibalEnabled: Boolean(env.ZIBAL_MERCHANT),
  });
}

export async function submitCardToCardReceipt(req, res, next) {
  try {
    const { orderId, imageData, transferReference } = req.body;
    const order = await getOrder(String(orderId ?? ""));
    if (order.status !== "PENDING_PAYMENT")
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
      res
        .status(201)
        .json({
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
      // All payment finalization locks the order before its payment record.
      const transitioned = await tx.chatOrder.updateMany({
        where: { id: payment.orderId, status: "PENDING_PAYMENT" },
        data: { status: decision === "approve" ? "PAID" : "CANCELLED" },
      });
      if (transitioned.count !== 1)
        throw new BadRequestError("این سفارش در وضعیت قابل بررسی نیست.");
      const claimed = await tx.chatPayment.updateMany({
        where: { id: payment.id, status: "PENDING_REVIEW" },
        data: {
          status: decision === "approve" ? "PAID" : "REJECTED",
          adminNote:
            typeof note === "string" ? note.trim().slice(0, 1000) : null,
          reviewedById: req.user.id,
          reviewedAt: new Date(),
        },
      });
      if (claimed.count !== 1)
        throw new BadRequestError("این رسید قبلاً بررسی شده است.");
      const order = await tx.chatOrder.findUnique({
        where: { id: payment.orderId },
        include: { items: true },
      });
      if (decision === "reject") {
        for (const item of order.items)
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
      }
      return tx.chatPayment.findUnique({ where: { id: payment.id } });
    });
    // فقط تأیید رسید، سفارش را PAID می‌کند؛ امتیاز هم بعد از همان تصمیم ثبت
    // می‌شود. رد رسید هیچ امتیازی نمی‌دهد.
    const award =
      decision === "approve"
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
