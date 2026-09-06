import { type ApiRequest, type ApiResponse } from "../_types.js";
import { bodyObject, headerValue, methodNotAllowed, telegramConfig, telegramRequest } from "./common.js";
import { claimTelegramUpdate, getSession, getTelegramMessageSession, saveSession } from "./storage.js";

type TelegramUpdate = { update_id?: number; callback_query?: { id?: string; data?: string; from?: { id?: number; first_name?: string; last_name?: string }; message?: { message_id?: number } }; message?: { message_id?: number; text?: string; chat?: { id?: number }; from?: { first_name?: string; last_name?: string }; reply_to_message?: { message_id?: number } } };
const agentDisplayName = (from?: { first_name?: string; last_name?: string }) => [from?.first_name, from?.last_name].filter(Boolean).join(" ").slice(0, 80) || "Formiva Team";
export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  let telegram; try { telegram = telegramConfig(); } catch { return response.status(503).json({ ok: false, error: "webhook_not_configured" }); }
  if (headerValue(request, "x-telegram-bot-api-secret-token") !== telegram.webhookSecret) return response.status(401).json({ ok: false, error: "unauthorized" });
  const update = bodyObject(request) as TelegramUpdate | null;
  if (!update) return response.status(400).json({ ok: false, error: "invalid_update" });
  try {
    if (typeof update.update_id === "number" && !(await claimTelegramUpdate(update.update_id))) return response.json({ ok: true });
    const callback = update.callback_query;
    if (callback) {
      if (String(callback.from?.id) !== String(telegram.chatId) || typeof callback.message?.message_id !== "number") return response.json({ ok: true });
      const sessionId = await getTelegramMessageSession(callback.message.message_id); const session = sessionId ? await getSession(sessionId) : null;
      if (!session || session.status === "expired") return response.json({ ok: true });
      const data = callback.data;
      if (data === "take" && session.status !== "closed") { session.status = "active"; session.agentName = agentDisplayName(callback.from); session.isTyping = false; await saveSession(session); }
      if (data === "typing_on" && session.status === "active") { session.isTyping = true; await saveSession(session); }
      if (data === "typing_off" && session.status === "active") { session.isTyping = false; await saveSession(session); }
      if (data === "close" && session.status !== "closed") { session.status = "closed"; session.isTyping = false; session.closedAt = Date.now(); await saveSession(session); }
      if (callback.id) await telegramRequest(telegram.token, "answerCallbackQuery", { callback_query_id: callback.id });
      return response.json({ ok: true });
    }
    const message = update.message;
    if (!message?.text || String(message.chat?.id) !== String(telegram.chatId) || typeof message.reply_to_message?.message_id !== "number") return response.json({ ok: true });
    const sessionId = await getTelegramMessageSession(message.reply_to_message.message_id); const session = sessionId ? await getSession(sessionId) : null;
    if (session && session.status === "active" && !session.messages.some(item => item.id === `telegram-${message.message_id}`)) { session.messages.push({ id: `telegram-${message.message_id}`, role: "human", text: message.text.slice(0, 2000), timestamp: Date.now(), senderName: agentDisplayName(message.from) }); session.agentName ||= agentDisplayName(message.from); session.isTyping = false; await saveSession(session); }
    response.json({ ok: true });
  } catch { response.status(503).json({ ok: false, error: "webhook_unavailable" }); }
}
