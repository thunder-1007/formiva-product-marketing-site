import { type ApiRequest, type ApiResponse } from "../_types.js";
import { bodyObject, escapeTelegramHtml, methodNotAllowed, telegramConfig, telegramRequest, validSessionId } from "./common.js";
import { deleteActiveChat, getSession, saveSession } from "./storage.js";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);

  const body = bodyObject(request);
  const sessionId = body?.sessionId;
  if (!validSessionId(sessionId)) return response.status(400).json({ ok: false, error: "invalid_session" });

  try {
    const session = await getSession(sessionId);
    if (!session) return response.status(404).json({ ok: false, error: "session_not_found" });

    const wasAlreadyClosed = session.status === "closed";

    session.status = "closed";
    session.isTyping = false;
    session.closedAt = session.closedAt || Date.now();
    await saveSession(session);

    const { token, chatId } = telegramConfig();
    await deleteActiveChat(String(chatId));

    if (!wasAlreadyClosed) {
      await telegramRequest(token, "sendMessage", {
        chat_id: chatId,
        text: [
          "🔴 <b>Visitor ended the Inji conversation</b>",
          `<b>Visitor:</b> ${escapeTelegramHtml(session.visitorName)}`,
          `<b>Company:</b> ${escapeTelegramHtml(session.company || "Not provided")}`,
          `<b>Session:</b> <code>${escapeTelegramHtml(session.sessionId)}</code>`,
          "",
          "The visitor has left the conversation. Feedback may follow on the website.",
        ].join("\n"),
        parse_mode: "HTML",
      });
    }

    return response.json({ ok: true, status: "closed" });
  } catch (error) {
    console.error("[inji] close error", error);
    return response.status(503).json({ ok: false, error: "close_unavailable" });
  }
}
