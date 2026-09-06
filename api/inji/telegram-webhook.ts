import { type ApiRequest, type ApiResponse } from "../_types.js";
import { bodyObject, headerValue, methodNotAllowed, telegramConfig, telegramRequest, validSessionId } from "./common.js";
import { claimTelegramUpdate, deleteActiveChat, getActiveChat, getSession, getTelegramMessageSession, saveActiveChat, saveSession, saveTelegramMessage } from "./storage.js";

type TelegramUser = { id?: number; first_name?: string; last_name?: string };
type TelegramReplyMessage = { message_id?: number; text?: string; caption?: string };
type TelegramMessage = { message_id?: number; text?: string; caption?: string; chat?: { id?: number; type?: string }; from?: TelegramUser; reply_to_message?: TelegramReplyMessage };
type TelegramUpdate = { update_id?: number; callback_query?: { id?: string; data?: string; from?: TelegramUser; message?: { message_id?: number } }; message?: TelegramMessage };

const agentDisplayName = (from?: TelegramUser) => [from?.first_name, from?.last_name].filter(Boolean).join(" ").slice(0, 80) || "Formiva Team";

async function resolveSession(message: TelegramMessage, telegramChatId: string) {
  const replyMessageId = message.reply_to_message?.message_id;

  if (typeof replyMessageId === "number") {
    const mappedSessionId = await getTelegramMessageSession(replyMessageId);
    if (mappedSessionId && validSessionId(mappedSessionId)) return { sessionId: mappedSessionId, source: "telegram_reply_mapping" };

    const repliedText = [message.reply_to_message?.text || "", message.reply_to_message?.caption || ""].join("\n");
    const sessionMatch = repliedText.match(/session-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (sessionMatch && validSessionId(sessionMatch[0])) return { sessionId: sessionMatch[0], source: "telegram_reply_text" };
  }

  const activeSessionId = await getActiveChat(telegramChatId);
  if (activeSessionId && validSessionId(activeSessionId)) return { sessionId: activeSessionId, source: "active_chat_fallback" };

  return { sessionId: null, source: "unresolved" };
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);

  let telegram;
  try { telegram = telegramConfig(); } catch { return response.status(503).json({ ok: false, error: "webhook_not_configured" }); }

  if (headerValue(request, "x-telegram-bot-api-secret-token") !== telegram.webhookSecret) {
    return response.status(401).json({ ok: false, error: "unauthorized" });
  }

  const update = bodyObject(request) as TelegramUpdate | null;
  if (!update) return response.status(400).json({ ok: false, error: "invalid_update" });

  try {
    if (typeof update.update_id === "number" && !(await claimTelegramUpdate(update.update_id))) return response.json({ ok: true });

    const callback = update.callback_query;
    if (callback) {
      if (String(callback.from?.id) !== String(telegram.chatId) || typeof callback.message?.message_id !== "number") return response.json({ ok: true });

      const sessionId = await getTelegramMessageSession(callback.message.message_id);
      const session = sessionId ? await getSession(sessionId) : null;
      if (!session || session.status === "expired") return response.json({ ok: true });

      const data = callback.data;
      if (data === "take" && session.status !== "closed") {
        session.status = "active";
        session.agentName = agentDisplayName(callback.from);
        session.isTyping = false;
        await saveSession(session);
        await saveActiveChat(String(telegram.chatId), session.sessionId);
      }
      if (data === "typing_on" && session.status === "active") { session.isTyping = true; await saveSession(session); }
      if (data === "typing_off" && session.status === "active") { session.isTyping = false; await saveSession(session); }
      if (data === "close" && session.status !== "closed") {
        session.status = "closed";
        session.isTyping = false;
        session.closedAt = Date.now();
        await saveSession(session);
        await deleteActiveChat(String(telegram.chatId));
      }

      if (callback.id) await telegramRequest(telegram.token, "answerCallbackQuery", { callback_query_id: callback.id });
      return response.json({ ok: true });
    }

    const message = update.message;
    if (!message) return response.json({ ok: true });
    if (typeof message.message_id !== "number") return response.json({ ok: true });
    if (typeof message.text !== "string" || !message.text.trim()) return response.json({ ok: true });
    if (String(message.chat?.id) !== String(telegram.chatId)) return response.json({ ok: true });

    console.info("[inji] telegram message received", {
      updateId: update.update_id,
      messageId: message.message_id,
      chatId: message.chat?.id,
      configuredChatId: telegram.chatId,
      chatType: message.chat?.type,
      fromId: message.from?.id,
      fromName: agentDisplayName(message.from),
      text: message.text,
      replyToMessageId: message.reply_to_message?.message_id ?? null,
    });

    const resolution = await resolveSession(message, String(telegram.chatId));
    console.info("[inji] telegram reply resolved", {
      messageId: message.message_id,
      replyToMessageId: message.reply_to_message?.message_id ?? null,
      sessionId: resolution.sessionId,
      source: resolution.source,
    });

    if (!resolution.sessionId) return response.json({ ok: true });

    const session = await getSession(resolution.sessionId);
    if (!session || session.status !== "active") return response.json({ ok: true });

    const humanMessageId = `telegram-${message.message_id}`;
    if (session.messages.some((item) => item.id === humanMessageId)) return response.json({ ok: true });

    const humanText = message.text.trim().slice(0, 2000);
    const humanName = agentDisplayName(message.from);
    session.messages.push({ id: humanMessageId, role: "human", text: humanText, timestamp: Date.now(), senderName: humanName });
    session.agentName = session.agentName || humanName;
    session.isTyping = false;

    await saveSession(session);
    await saveTelegramMessage(session.sessionId, message.message_id);

    console.info("[inji] HUMAN REPLY SAVED SUCCESSFULLY", {
      sessionId: session.sessionId,
      messageId: message.message_id,
      replyToMessageId: message.reply_to_message?.message_id ?? null,
      source: resolution.source,
      agentName: humanName,
    });

    return response.json({ ok: true });
  } catch (error) {
    console.error("[inji] telegram webhook processing error", error);
    return response.status(503).json({ ok: false, error: "webhook_unavailable" });
  }
}
