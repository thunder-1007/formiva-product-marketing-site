import { type ApiRequest, type ApiResponse } from "../_types.js";
import { bodyObject, escapeTelegramHtml, MAX_MESSAGE_LENGTH, methodNotAllowed, telegramConfig, telegramRequest, validSessionId } from "./common.js";
import { getSession, saveSession, saveTelegramMessage } from "./storage.js";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  const body = bodyObject(request), sessionId = body?.sessionId, message = body?.message, messageId = body?.messageId;
  if (!validSessionId(sessionId) || typeof message !== "string" || !message.trim() || message.length > MAX_MESSAGE_LENGTH || typeof messageId !== "string" || messageId.length > 160) return response.status(400).json({ ok: false, error: "invalid_request" });
  try {
    const session = await getSession(sessionId);
    if (!session || session.status !== "active") return response.status(409).json({ ok: false, error: "chat_not_active" });
    if (!session.messages.some(item => item.id === messageId)) {
      const text = message.trim();
      session.messages.push({ id: messageId, role: "user", text, timestamp: Date.now() });
      await saveSession(session);
      const { token, chatId } = telegramConfig();
      const result = await telegramRequest(token, "sendMessage", { chat_id: chatId, text: `💬 <b>${escapeTelegramHtml(session.visitorName)}</b>\n${escapeTelegramHtml(text)}\n\n<b>Session:</b> <code>${escapeTelegramHtml(session.sessionId)}</code>`, parse_mode: "HTML" });
      if (result.result?.message_id) await saveTelegramMessage(sessionId, result.result.message_id);
    }
    response.json({ ok: true });
  } catch { response.status(503).json({ ok: false, error: "message_unavailable" }); }
}
