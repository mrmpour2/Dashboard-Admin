import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  pipeUIMessageStreamToResponse,
  streamText,
  toUIMessageStream,
  tool,
} from "ai";
import { randomUUID } from "crypto";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";
import {
  ServiceUnavailableError,
  BadRequestError,
  NotFoundError,
} from "../utils/AppError.js";
import { listPublicMenu } from "../services/publicMenuService.js";

const openai = env.OPENAI_API_KEY
  ? createOpenAI({
      baseURL: env.OPENAI_BASE_URL || "https://api.gapgpt.app/v1",
      apiKey: env.OPENAI_API_KEY,
    })
  : null;

const PERSIAN_PATTERN = /[\u0600-\u06FF]/;
const MAX_MENU_LINES = 80;
const MAX_OUTPUT_TOKENS = 500;

const STORE_FACTS = {
  storeName: env.STORE_NAME || "فست فود الین",
  address: env.STORE_ADDRESS || "تهران",
  hours: env.STORE_HOURS || "11:00 الی 23:30",
  shipping: env.STORE_SHIPPING || "ارسال سریع با پیک در محدوده",
  returnPolicy:
    env.STORE_RETURN_POLICY || "امکان لغو سفارش تا ۵ دقیقه پس از ثبت",
  supportPhone: env.STORE_SUPPORT_PHONE || "021-00000000",
};

const LANGUAGE_RULES = `If language is Persian (fa), respond fluently, respectfully, and warmly in Persian, keeping tone natural for an online food ordering platform. If language is English (en), respond in clear English.`;

function partText(parts) {
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) =>
      typeof p === "object" && p !== null ? p.text || "" : String(p),
    )
    .join("\n")
    .slice(0, 4000);
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({
      id: typeof m.id === "string" ? m.id.slice(0, 100) : randomUUID(),
      role: m.role,
      content:
        typeof m.content === "string"
          ? m.content.slice(0, 4000)
          : partText(m.parts),
    }))
    .filter((m) => m.content.trim().length > 0);
}

function detectLanguage(requestedLang, lastUserText) {
  if (requestedLang === "fa" || requestedLang === "en") return requestedLang;
  return PERSIAN_PATTERN.test(lastUserText) ? "fa" : "en";
}

function formatProducts(items) {
  if (!Array.isArray(items) || items.length === 0)
    return "منو در حال حاضر خالی است.";
  return items
    .slice(0, MAX_MENU_LINES)
    .map((item, i) => {
      const priceStr = new Intl.NumberFormat("fa-IR").format(item.price || 0);
      return `${i + 1}. ${item.name} | دسته‌بندی: ${item.category || "عمومی"} | قیمت: ${priceStr} تومان | موجودی: ${item.stock > 0 ? "موجود" : "ناموجود"} | شناسه کالا: ${item.id}\n   توضیحات: ${item.description || "ندارد"}`;
    })
    .join("\n");
}

function buildInstructions(menuText, lang) {
  return `You are a helpful and polite online store sales and customer support assistant for "${STORE_FACTS.storeName}".
${LANGUAGE_RULES}
Language for this response: ${lang}.

Store Information:
- Address: ${STORE_FACTS.address}
- Working Hours: ${STORE_FACTS.hours}
- Shipping Info: ${STORE_FACTS.shipping}
- Return Policy: ${STORE_FACTS.returnPolicy}
- Support Phone: ${STORE_FACTS.supportPhone}

Current Menu Items:
${menuText}

Rules:
1. Only recommend and sell items from the "Current Menu Items" list above. Never invent products or prices.
2. If an item is out of stock, inform the customer politely and suggest alternatives.
3. Be concise, direct, helpful, and polite.
4. When the customer decides to order items, you MUST use the "createOrder" tool to submit their order. Ask for their delivery address and name if not provided yet.`;
}

export async function chat(req, res, next) {
  try {
    if (!openai) {
      throw new ServiceUnavailableError(
        "سرویس هوش مصنوعی تنظیم نشده است (API Key یافت نشد).",
      );
    }

    const {
      messages: rawMessages,
      sessionId: reqSessionId,
      language,
    } = req.body;
    const sessionId =
      typeof reqSessionId === "string" && /^[\w-]+$/.test(reqSessionId)
        ? reqSessionId
        : randomUUID();

    const messages = normalizeMessages(rawMessages);
    const lastUserMsg = messages.filter((m) => m.role === "user").pop();
    if (!lastUserMsg) {
      throw new BadRequestError("حداقل یک پیام معتبر از سوی کاربر لازم است.");
    }

    const lang = detectLanguage(language, lastUserMsg.content);

    let conversation = await prisma.chatConversation.findUnique({
      where: { sessionId },
    });
    if (!conversation) {
      conversation = await prisma.chatConversation.create({
        data: { sessionId },
      });
    }

    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: lastUserMsg.content,
      },
    });

    const menu = await listPublicMenu();
    const menuText = formatProducts(menu.items);
    const instructions = buildInstructions(menuText, lang);

    const modelMessages = await convertToModelMessages(messages);

    const result = await streamText({
      model: openai(env.OPENAI_MODEL || "gpt-4o-mini"),
      instructions,
      messages: modelMessages,
      temperature: 0.35,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      tools: {
        createOrder: tool({
          description:
            "ثبت نهایی سفارش مشتری در سیستم بر اساس محصولات موجود در منو",
          parameters: z.object({
            customerName: z.string().describe("نام مشتری"),
            customerPhone: z.string().describe("شماره تماس مشتری"),
            address: z.string().describe("آدرس کامل تحویل سفارش"),
            items: z
              .array(
                z.object({
                  productId: z.string().describe("شناسه یا آی‌دی محصول از منو"),
                  quantity: z
                    .number()
                    .min(1)
                    .describe("تعداد سفارش از این محصول"),
                }),
              )
              .describe("لیست اقلام سفارش داده شده"),
          }),
          execute: async ({ customerName, customerPhone, address, items }) => {
            try {
              const newOrder = await prisma.order.create({
                data: {
                  customerName,
                  customerPhone,
                  shippingAddress: address,
                  status: "PENDING",
                  totalAmount: 0,
                  items: {
                    create: items.map((item) => ({
                      productId: item.productId,
                      quantity: item.quantity,
                      price: 0,
                    })),
                  },
                },
              });

              return {
                success: true,
                orderId: newOrder.id,
                message: `سفارش شما با موفقیت ثبت شد. کد پیگیری: ${newOrder.id}`,
              };
            } catch (err) {
              logger.error({ err }, "Order creation tool execution failed");
              return {
                success: false,
                message:
                  "متأسفانه در ثبت سفارش خطایی رخ داد. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.",
              };
            }
          },
        }),
      },
      onFinish: async ({ text }) => {
        try {
          if (text && text.trim().length > 0) {
            await prisma.chatMessage.create({
              data: {
                conversationId: conversation.id,
                role: "ASSISTANT",
                content: text.slice(0, 12000),
              },
            });
          }
        } catch (err) {
          logger.error({ err }, "Failed to persist assistant chat message");
        }
      },
      onError: (err) => {
        logger.error({ err }, "Chat model call failed");
      },
    });

    res.setHeader("X-Chat-Session-Id", sessionId);
    return pipeUIMessageStreamToResponse({
      response: res,
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
      stream: toUIMessageStream({
        stream: result.stream,
        onError: () =>
          "در حال حاضر امکان پاسخ‌گویی وجود ندارد. کمی بعد دوباره تلاش کنید.",
      }),
    });
  } catch (error) {
    next(error);
  }
}

export async function getConversation(req, res, next) {
  try {
    const { sessionId } = req.params;
    if (!sessionId || !/^[\w-]+$/.test(sessionId)) {
      throw new BadRequestError("شناسه گفتگو نامعتبر است.");
    }

    const conversation = await prisma.chatConversation.findUnique({
      where: { sessionId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 100,
        },
      },
    });

    if (!conversation) {
      throw new NotFoundError("گفتگویی یافت نشد.");
    }

    res.setHeader("Cache-Control", "no-store");
    return res.json({
      sessionId: conversation.sessionId,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role.toLowerCase(),
        content: m.content,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}
