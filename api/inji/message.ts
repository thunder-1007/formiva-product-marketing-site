import { type ApiRequest, type ApiResponse } from "../_types.js";
import {
  bodyObject,
  escapeTelegramHtml,
  MAX_MESSAGE_LENGTH,
  methodNotAllowed,
  telegramConfig,
  telegramRequest,
  validSessionId,
} from "./common.js";
import {
  appendSessionMessage,
  getSession,
  saveTelegramMessage,
  setCustomerTyping,
} from "./storage.js";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);

  const body = bodyObject(request);
  const sessionId = body?.sessionId;
  const message = body?.message;
  const messageId = body?.messageId;
  const action = body?.action;

  if (!validSessionId(sessionId)) {
    return response.status(400).json({ ok: false, error: "invalid_request" });
  }

  try {
    if (action === "typing") {
      if (typeof body?.isTyping !== "boolean") {
        return response.status(400).json({ ok: false, error: "invalid_request" });
      }

      const session = await setCustomerTyping(sessionId, body.isTyping, 2200);
      if (!session) return response.status(409).json({ ok: false, error: "chat_not_active" });
      return response.json({ ok: true });
    }

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > MAX_MESSAGE_LENGTH ||
      typeof messageId !== "string" ||
      messageId.length > 160
    ) {
      return response.status(400).json({ ok: false, error: "invalid_request" });
    }

    const current = await getSession(sessionId);
    if (!current || current.status !== "active") {
      return response.status(409).json({ ok: false, error: "chat_not_active" });
    }

    const result = await appendSessionMessage(
      sessionId,
      {
        id: messageId,
        role: "user",
        text: message.trim(),
        timestamp: Date.now(),
      },
      { clearCustomerTyping: true },
    );

    if (!result) {
      return response.status(404).json({ ok: false, error: "session_not_found" });
    }

    if (result.added) {
      const { token, chatId } = telegramConfig();
      const telegramMessage = await telegramRequest(token, "sendMessage", {
        chat_id: chatId,
        text:
          `💬 <b>${escapeTelegramHtml(result.session.visitorName)}</b>\n` +
          `${escapeTelegramHtml(message.trim())}\n\n` +
          `<b>Session:</b> <code>${escapeTelegramHtml(result.session.sessionId)}</code>`,
        parse_mode: "HTML",
      });

      if (telegramMessage.result?.message_id) {
        await saveTelegramMessage(sessionId, telegramMessage.result.message_id);
      }
    }

    return response.json({ ok: true });
  } catch {
    return response.status(503).json({ ok: false, error: "message_unavailable" });
  }
}
