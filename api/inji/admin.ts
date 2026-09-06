import { type ApiRequest, type ApiResponse } from "./_types.js";
import {
  bodyObject,
  MAX_MESSAGE_LENGTH,
  methodNotAllowed,
  telegramConfig,
  telegramRequest,
  validSessionId,
} from "./common.js";
import {
  deleteActiveChat,
  getSession,
  listSessions,
  saveActiveChat,
  saveSession,
  setSessionTyping,
} from "./storage.js";

function isAdmin(request: ApiRequest) {
  const configured = process.env.INJI_ADMIN_KEY;
  const supplied = request.headers["x-inji-admin-key"];
  const value = Array.isArray(supplied) ? supplied[0] : supplied;
  return Boolean(configured && value && value === configured);
}

function unauthorized(response: ApiResponse) {
  return response.status(401).json({ ok: false, error: "admin_unauthorized" });
}

const createId = () =>
  `team-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (!isAdmin(request)) return unauthorized(response);

  try {
    if (request.method === "GET") {
      const sessionId = request.query.sessionId;
      response.setHeader?.("Cache-Control", "private, no-store, max-age=0, must-revalidate");

      if (sessionId !== undefined) {
        if (!validSessionId(sessionId)) {
          return response.status(400).json({ ok: false, error: "invalid_session" });
        }
        const session = await getSession(sessionId);
        if (!session) return response.status(404).json({ ok: false, error: "session_not_found" });
        return response.json({ ok: true, session });
      }

      const sessions = await listSessions(100);
      return response.json({ ok: true, sessions });
    }

    if (request.method !== "POST") return methodNotAllowed(response, ["GET", "POST"]);

    const body = bodyObject(request);
    const action = body?.action;
    const sessionId = body?.sessionId;

    if (typeof action !== "string") {
      return response.status(400).json({ ok: false, error: "invalid_action" });
    }

    if (!validSessionId(sessionId)) {
      return response.status(400).json({ ok: false, error: "invalid_session" });
    }

    if (action === "typing") {
      const isTyping = body?.isTyping;
      if (typeof isTyping !== "boolean") {
        return response.status(400).json({ ok: false, error: "invalid_request" });
      }
      const session = await setSessionTyping(sessionId, isTyping, 2500);
      if (!session) return response.status(409).json({ ok: false, error: "chat_not_active" });
      return response.json({ ok: true, session });
    }

    const session = await getSession(sessionId);
    if (!session) return response.status(404).json({ ok: false, error: "session_not_found" });

    if (action === "take") {
      if (session.status === "closed" || session.status === "expired") {
        return response.status(409).json({ ok: false, error: "chat_closed" });
      }

      const requestedAgentName = typeof body?.agentName === "string" ? body.agentName.trim() : "";
      session.status = "active";
      session.agentName = requestedAgentName.slice(0, 80) || "Formiva Team";
      session.isTyping = false;
      session.typingUntil = undefined;
      await saveSession(session);

      try {
        const { token, chatId } = telegramConfig();
        await saveActiveChat(String(chatId), session.sessionId);
        await telegramRequest(token, "sendMessage", {
          chat_id: chatId,
          text: `🟢 Team Inbox took chat\nVisitor: ${session.visitorName}\nSession: ${session.sessionId}`,
        });
      } catch {
        // Team Inbox remains authoritative if Telegram notification fails.
      }

      return response.json({ ok: true, session });
    }

    if (action === "message") {
      const message = body?.message;
      if (typeof message !== "string" || !message.trim() || message.length > MAX_MESSAGE_LENGTH) {
        return response.status(400).json({ ok: false, error: "invalid_request" });
      }
      if (session.status !== "active") {
        return response.status(409).json({ ok: false, error: "chat_not_active" });
      }

      const text = message.trim();
      session.messages.push({
        id: createId(),
        role: "human",
        text,
        timestamp: Date.now(),
        senderName: session.agentName || "Formiva Team",
      });
      session.isTyping = false;
      session.typingUntil = undefined;
      await saveSession(session);

      return response.json({ ok: true, session });
    }

    if (action === "close") {
      session.status = "closed";
      session.isTyping = false;
      session.typingUntil = undefined;
      session.closedAt = Date.now();
      await saveSession(session);

      try {
        const { token, chatId } = telegramConfig();
        await deleteActiveChat(String(chatId));
        await telegramRequest(token, "sendMessage", {
          chat_id: chatId,
          text: `🔴 Team Inbox closed chat\nVisitor: ${session.visitorName}\nSession: ${session.sessionId}`,
        });
      } catch {
        // Notification is best-effort.
      }

      return response.json({ ok: true, session });
    }

    return response.status(400).json({ ok: false, error: "unknown_action" });
  } catch {
    return response.status(503).json({ ok: false, error: "admin_unavailable" });
  }
}
