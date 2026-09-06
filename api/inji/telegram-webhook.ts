import { type ApiRequest, type ApiResponse } from "../_types.js";
import {
  bodyObject,
  headerValue,
  methodNotAllowed,
  telegramConfig,
  telegramRequest,
  validSessionId,
} from "./common.js";
import {
  appendSessionMessage,
  claimTelegramUpdate,
  deleteActiveChat,
  getActiveChat,
  getSession,
  getTelegramMessageSession,
  mutateSession,
  saveActiveChat,
  saveTelegramMessage,
  setSessionTyping,
} from "./storage.js";

type TelegramUser = { id?: number; first_name?: string; last_name?: string };
type TelegramReplyMessage = { message_id?: number; text?: string; caption?: string };
type TelegramMessage = {
  message_id?: number;
  text?: string;
  caption?: string;
  chat?: { id?: number; type?: string };
  from?: TelegramUser;
  reply_to_message?: TelegramReplyMessage;
};
type TelegramUpdate = {
  update_id?: number;
  callback_query?: {
    id?: string;
    data?: string;
    from?: TelegramUser;
    message?: { message_id?: number };
  };
  message?: TelegramMessage;
};

const agentDisplayName = (from?: TelegramUser) =>
  [from?.first_name, from?.last_name]
    .filter(Boolean)
    .join(" ")
    .slice(0, 80) || "Formiva Team";

async function resolveSession(message: TelegramMessage, telegramChatId: string) {
  const replyMessageId = message.reply_to_message?.message_id;

  if (typeof replyMessageId === "number") {
    const mappedSessionId = await getTelegramMessageSession(replyMessageId);
    if (mappedSessionId && validSessionId(mappedSessionId)) {
      return { sessionId: mappedSessionId, source: "telegram_reply_mapping" };
    }

    const repliedText = [
      message.reply_to_message?.text || "",
      message.reply_to_message?.caption || "",
    ].join("\n");

    const sessionMatch = repliedText.match(
      /session-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );

    if (sessionMatch && validSessionId(sessionMatch[0])) {
      return { sessionId: sessionMatch[0], source: "telegram_reply_text" };
    }
  }

  const activeSessionId = await getActiveChat(telegramChatId);
  if (activeSessionId && validSessionId(activeSessionId)) {
    return { sessionId: activeSessionId, source: "active_chat_fallback" };
  }

  return { sessionId: null, source: "unresolved" };
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);

  let telegram;
  try {
    telegram = telegramConfig();
  } catch {
    return response.status(503).json({ ok: false, error: "webhook_not_configured" });
  }

  if (headerValue(request, "x-telegram-bot-api-secret-token") !== telegram.webhookSecret) {
    return response.status(401).json({ ok: false, error: "unauthorized" });
  }

  const update = bodyObject(request) as TelegramUpdate | null;
  if (!update) return response.status(400).json({ ok: false, error: "invalid_update" });

  try {
    if (
      typeof update.update_id === "number" &&
      !(await claimTelegramUpdate(update.update_id))
    ) {
      return response.json({ ok: true });
    }

    const callback = update.callback_query;
    if (callback) {
      if (
        String(callback.from?.id) !== String(telegram.chatId) ||
        typeof callback.message?.message_id !== "number"
      ) {
        return response.json({ ok: true });
      }

      const sessionId = await getTelegramMessageSession(callback.message.message_id);
      const session = sessionId ? await getSession(sessionId) : null;
      if (!session || session.status === "expired") {
        return response.json({ ok: true });
      }

      const data = callback.data;
      if (data === "take" && session.status !== "closed") {
        const updated = await mutateSession(session.sessionId, (current) => {
          current.status = "active";
          current.agentName = agentDisplayName(callback.from);
          current.isTyping = false;
          current.typingUntil = undefined;
          current.customerTyping = false;
          current.customerTypingUntil = undefined;
        });

        if (updated) {
          await saveActiveChat(String(telegram.chatId), updated.sessionId);
          await setSessionTyping(updated.sessionId, false, 5000);
        }
      }

      if (data === "typing_on" && session.status === "active") {
        await setSessionTyping(session.sessionId, true, 2500);
      }

      if (data === "typing_off" && session.status === "active") {
        await setSessionTyping(session.sessionId, false, 5000);
      }

      if (data === "close" && session.status !== "closed") {
        const updated = await mutateSession(session.sessionId, (current) => {
          current.status = "closed";
          current.isTyping = false;
          current.typingUntil = undefined;
          current.customerTyping = false;
          current.customerTypingUntil = undefined;
          current.closedAt = Date.now();
        });

        if (updated) {
          await deleteActiveChat(String(telegram.chatId));
          await setSessionTyping(updated.sessionId, false, 5000);
        }
      }

      if (callback.id) {
        await telegramRequest(telegram.token, "answerCallbackQuery", {
          callback_query_id: callback.id,
        });
      }

      return response.json({ ok: true });
    }

    const message = update.message;
    if (!message) return response.json({ ok: true });
    if (typeof message.message_id !== "number") return response.json({ ok: true });
    if (typeof message.text !== "string" || !message.text.trim()) {
      return response.json({ ok: true });
    }
    if (String(message.chat?.id) !== String(telegram.chatId)) {
      return response.json({ ok: true });
    }

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
    if (!session || session.status !== "active") {
      return response.json({ ok: true });
    }

    const humanMessageId = `telegram-${message.message_id}`;
    const humanName = agentDisplayName(message.from);
    const result = await appendSessionMessage(
      session.sessionId,
      {
        id: humanMessageId,
        role: "human",
        text: message.text.trim().slice(0, 2000),
        timestamp: Date.now(),
        senderName: humanName,
      },
      {
        clearAgentTyping: true,
        setAgentName: session.agentName || humanName,
      },
    );

    if (!result) return response.json({ ok: true });

    await saveTelegramMessage(result.session.sessionId, message.message_id);

    console.info("[inji] HUMAN REPLY SAVED SUCCESSFULLY", {
      sessionId: result.session.sessionId,
      messageId: message.message_id,
      replyToMessageId: message.reply_to_message?.message_id ?? null,
      source: resolution.source,
      agentName: result.session.agentName || humanName,
      added: result.added,
    });

    return response.json({ ok: true });
  } catch (error) {
    console.error("[inji] telegram webhook processing error", error);
    return response.status(503).json({ ok: false, error: "webhook_unavailable" });
  }
}
