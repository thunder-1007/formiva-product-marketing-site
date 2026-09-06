import { type ApiRequest, type ApiResponse } from "../_types.js";
import {
  bodyObject,
  MAX_MESSAGE_LENGTH,
  methodNotAllowed,
  telegramConfig,
  telegramRequest,
  validSessionId,
} from "./common.js";
import {
  appendSessionMessage,
  deleteActiveChat,
  getSession,
  listSessions,
  mutateSession,
  saveActiveChat,
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

function createId() {
  return `team-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

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

    if (request.method !== "POST") {
      return methodNotAllowed(response, ["GET", "POST"]);
    }

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
      if (typeof body?.isTyping !== "boolean") {
        return response.status(400).json({ ok: false, error: "invalid_request" });
      }

      const session = await setSessionTyping(sessionId, body.isTyping, 2500);
      if (!session) return response.status(409).json({ ok: false, error: "chat_not_active" });

      return response.json({ ok: true, session });
    }

    if (action === "take") {
      const requestedAgentName = typeof body?.agentName === "string"
        ? body.agentName.trim().slice(0, 80)
        : "";

      const session = await mutateSession(sessionId, async (current) => {
        if (current.status === "closed" || current.status === "expired") {
          throw new Error("chat_closed");
        }
        current.status = "active";
        current.agentName = requestedAgentName || "Formiva Team";
        current.isTyping = false;
        current.typingUntil = undefined;
        current.customerTyping = false;
        current.customerTypingUntil = undefined;
      });

      if (!session) return response.status(404).json({ ok: false, error: "session_not_found" });

      await setSessionTyping(sessionId, false, 5000);
      await saveActiveChatWithTelegram(sessionId, session);

      return response.json({ ok: true, session });
    }

    if (action === "message") {
      const message = body?.message;
      const messageId = body?.messageId;

      if (
        typeof message !== "string" ||
        !message.trim() ||
        message.length > MAX_MESSAGE_LENGTH ||
        typeof messageId !== "string" ||
        messageId.length > 160
      ) {
        return response.status(400).json({ ok: false, error: "invalid_request" });
      }

      const session = await getSession(sessionId);
      if (!session || session.status !== "active") {
        return response.status(409).json({ ok: false, error: "chat_not_active" });
      }

      const result = await appendSessionMessage(
        sessionId,
        {
          id: messageId,
          role: "human",
          text: message.trim(),
          timestamp: Date.now(),
          senderName: session.agentName || "Formiva Team",
        },
        { clearAgentTyping: true },
      );

      if (!result) {
        return response.status(404).json({ ok: false, error: "session_not_found" });
      }

      console.info("[inji] TEAM INBOX REPLY SAVED", {
        sessionId,
        messageId,
        added: result.added,
      });

      return response.json({ ok: true, session: result.session });
    }

    if (action === "close") {
      const session = await mutateSession(sessionId, async (current) => {
        current.status = "closed";
        current.isTyping = false;
        current.typingUntil = undefined;
        current.customerTyping = false;
        current.customerTypingUntil = undefined;
        current.closedAt = Date.now();
      });

      if (!session) return response.status(404).json({ ok: false, error: "session_not_found" });

      await setSessionTyping(sessionId, false, 5000);
      await setCustomerTypingIfAvailable(sessionId, false);
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
  } catch (error) {
    if (error instanceof Error && error.message === "chat_closed") {
      return response.status(409).json({ ok: false, error: "chat_closed" });
    }
    if (error instanceof Error && error.message === "session_busy") {
      return response.status(409).json({ ok: false, error: "session_busy" });
    }
    console.error("[inji] admin handler error", error);
    return response.status(503).json({ ok: false, error: "admin_unavailable" });
  }
}

async function saveActiveChatWithTelegram(sessionId: string, session: {
  sessionId: string;
  visitorName: string;
}) {
  try {
    const { token, chatId } = telegramConfig();
    await saveActiveChat(String(chatId), sessionId);
    await telegramRequest(token, "sendMessage", {
      chat_id: chatId,
      text: `🟢 Team Inbox took chat\nVisitor: ${session.visitorName}\nSession: ${session.sessionId}`,
    });
  } catch {
    // Team Inbox remains authoritative if Telegram notification fails.
  }
}

async function setCustomerTypingIfAvailable(sessionId: string, active: boolean) {
  try {
    const module = await import("./storage.js");
    await module.setCustomerTyping(sessionId, active, 5000);
  } catch {
    // Best effort; close already persists closed state.
  }
}
