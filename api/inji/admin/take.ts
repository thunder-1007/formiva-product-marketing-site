import { type ApiRequest, type ApiResponse } from "../../_types.js";
import { bodyObject, methodNotAllowed, telegramConfig, telegramRequest, validSessionId } from "../common.js";
import { getSession, saveActiveChat, saveSession } from "../storage.js";
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
    if (session.status === "closed" || session.status === "expired") return response.status(409).json({ ok: false, error: "chat_closed" });
    session.status = "active";
    session.agentName = "Formiva Team";
    session.isTyping = false;
    session.typingUntil = undefined;
    await saveSession(session);
    try {
      const { token, chatId } = telegramConfig();
      await telegramRequest(token, "sendMessage", { chat_id: chatId, text: `🟢 <b>Team Inbox took chat</b>\nVisitor: ${session.visitorName}\nSession: <code>${session.sessionId}</code>`, parse_mode: "HTML" });
    } catch {
      // Telegram notification is optional; the inbox state remains authoritative.
    }
    return response.json({ ok: true, session });
  } catch {
    return response.status(503).json({ ok: false, error: "take_unavailable" });
  }
}
