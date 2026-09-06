import { type ApiRequest, type ApiResponse } from "../_types.js";
import { type HandoffSession, isExpired } from "./storage.js";

export const MAX_QUESTION_LENGTH = 2000;
export const MAX_CONVERSATION_ITEMS = 20;
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_TELEGRAM_MESSAGE_LENGTH = 3900;

export type ConversationItem = { role: "user" | "assistant"; content: string };

export function methodNotAllowed(res: ApiResponse, allowed: string[]) {
  res.status(405).json({ ok: false, error: "method_not_allowed", allowed });
}

export function validSessionId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(value);
}

export function validConversation(value: unknown): value is ConversationItem[] {
  return Array.isArray(value)
    && value.length <= MAX_CONVERSATION_ITEMS
    && value.every((item) => (
      item
      && (item.role === "user" || item.role === "assistant")
      && typeof item.content === "string"
      && item.content.trim().length > 0
      && item.content.length <= MAX_MESSAGE_LENGTH
    ));
}

export function bodyObject(request: ApiRequest) {
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return request.body && typeof request.body === "object" ? request.body as Record<string, unknown> : null;
}

export function escapeTelegramHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function configuredTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !chatId || !webhookSecret) throw new Error("telegram_not_configured");
  return { token, chatId, webhookSecret };
}

export async function sendTelegramNotification(session: HandoffSession, conversation: ConversationItem[]) {
  const { token, chatId } = configuredTelegram();
  const conversationText = conversation
    .map((item) => `${item.role === "user" ? "User" : "Inji"}: ${item.content}`)
    .join("\n")
    .slice(0, MAX_TELEGRAM_MESSAGE_LENGTH);
  const text = [
    "<b>Inji - New Question</b>",
    "",
    `<b>Question:</b> ${escapeTelegramHtml(session.question)}`,
    `<b>Session:</b> <code>${escapeTelegramHtml(session.sessionId)}</code>`,
    "",
    `<b>Conversation:</b>\n${escapeTelegramHtml(conversationText)}`,
    "",
    `<i>Reply with /reply ${escapeTelegramHtml(session.sessionId)} Your answer here</i>`,
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      signal: controller.signal,
    });
    const result = await response.json() as { ok?: boolean };
    if (!response.ok || !result.ok) throw new Error("telegram_request_failed");
  } finally {
    clearTimeout(timeout);
  }
}

export function headerValue(request: ApiRequest, name: string) {
  const value = request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export function isExpiredSession(session: HandoffSession | null) {
  return !session || isExpired(session) || session.status === "expired";
}
