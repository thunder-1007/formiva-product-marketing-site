import { type ApiRequest, type ApiResponse } from "../../_types.js";
import { bodyObject, methodNotAllowed, validSessionId, telegramConfig, telegramRequest } from "../common.js";
import { getSession, saveSession, deleteActiveChat } from "../storage.js";
import { adminKey, adminUnauthorized } from "./auth.js";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  if (!adminKey(request)) return adminUnauthorized(response);
  const body = bodyObject(request);
  const sessionId = body?.sessionId;
  if (!validSessionId(sessionId)) return response.status(400).json({ ok: false, error: "invalid_session" });
  try {
    const session = await getSession(sessionId);
    if (!session) return response.status(404).json({ ok: false, error: "session_not_found" });
    session.status = "closed";
    session.isTyping = false;
    session.typingUntil = undefined;
    session.closedAt = Date.now();
    await saveSession(session);
    try {
      const { chatId } = telegramConfig();
      await deleteActiveChat(String(chatId));
      const { token } = telegramConfig();
      await telegramRequest(token, "sendMessage", { chat_id: chatId, text: `🔴 <b>Team Inbox closed chat</b>\nVisitor: ${session.visitorName}\nSession: <code>${session.sessionId}</code>`, parse_mode: "HTML" });
    } catch {
      // Telegram notification is best-effort.
    }
    return response.json({ ok: true, session });
  } catch {
    return response.status(503).json({ ok: false, error: "close_unavailable" });
  }
}
