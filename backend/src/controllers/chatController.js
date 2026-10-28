import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  pipeUIMessageStreamToResponse,
  streamText,
  toUIMessageStream,
} from "ai";
import { randomUUID } from "crypto";
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
    .map((p) => {
      if (typeof p === "string") return p;
      if (typeof p === "object" && p !== null) {
        return p.text || p.content || "";
      }
      return "";
    })
    .filter(Boolean)
    .join("\n")
    .slice(0, 4000);
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .map((m, index) => {
      // استخراج متن چه از طریق content و چه از طریق parts
      let text = "";
      if (typeof m.content === "string") {
        text = m.content;
      } else if (Array.isArray(m.parts)) {
        text = partText(m.parts);
      } else if (typeof m.text === "string") {
        text = m.text;
      }

      return {
        id: typeof m.id === "string" ? m.id.slice(0, 100) : `msg-${index}`,
        role: m.role,
        content: text.slice(0, 4000),
      };
    })
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
4. Never claim to place or confirm an order. Direct customers to the website checkout to review the total and submit an order.`;
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
      abortSignal: AbortSignal.timeout(15000),
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
