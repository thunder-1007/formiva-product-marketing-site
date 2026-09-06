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
  claimTelegramUpdate,
  getSession,
  getTelegramMessageSession,
  saveSession,
  saveTelegramMessage,
} from "./storage.js";

type TelegramUpdate = {
  update_id?: number;

  callback_query?: {
    id?: string;
    data?: string;
    from?: {
      id?: number;
      first_name?: string;
      last_name?: string;
    };
    message?: {
      message_id?: number;
    };
  };

  message?: {
    message_id?: number;
    text?: string;
    chat?: {
      id?: number;
    };
    from?: {
      id?: number;
      first_name?: string;
      last_name?: string;
    };
    reply_to_message?: {
      message_id?: number;
      text?: string;
      caption?: string;
    };
  };
};

const agentDisplayName = (from?: {
  first_name?: string;
  last_name?: string;
}) =>
  [from?.first_name, from?.last_name]
    .filter(Boolean)
    .join(" ")
    .slice(0, 80) || "Formiva Team";

async function sessionForReply(
  replyTo?: {
    message_id?: number;
    text?: string;
    caption?: string;
  }
) {
  if (!replyTo || typeof replyTo.message_id !== "number") {
    return {
      sessionId: null,
      source: "missing_reply" as const,
    };
  }

  // First try the Redis Telegram message -> session mapping.
  const mappedSessionId = await getTelegramMessageSession(
    replyTo.message_id
  );

  if (mappedSessionId) {
    return {
      sessionId: mappedSessionId,
      source: "message_mapping" as const,
    };
  }

  // Fallback: extract the session ID from the replied-to message.
  const replyText = replyTo.text || replyTo.caption || "";

  const sessionMatch = replyText.match(
    /(?:Session:\s*|<code>)?\b(session-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i
  );

  return sessionMatch && validSessionId(sessionMatch[1])
    ? {
        sessionId: sessionMatch[1],
        source: "message_text" as const,
      }
    : {
        sessionId: null,
        source: "unresolved" as const,
      };
}

export default async function handler(
  request: ApiRequest,
  response: ApiResponse
) {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  let telegram;

  try {
    telegram = telegramConfig();
  } catch {
    return response
      .status(503)
      .json({ ok: false, error: "webhook_not_configured" });
  }

  // Verify Telegram webhook secret.
  if (
    headerValue(request, "x-telegram-bot-api-secret-token") !==
    telegram.webhookSecret
  ) {
    return response
      .status(401)
      .json({ ok: false, error: "unauthorized" });
  }

  const update = bodyObject(request) as TelegramUpdate | null;

  if (!update) {
    return response
      .status(400)
      .json({ ok: false, error: "invalid_update" });
  }

  try {
    // Prevent duplicate Telegram webhook updates.
    if (
      typeof update.update_id === "number" &&
      !(await claimTelegramUpdate(update.update_id))
    ) {
      return response.json({ ok: true });
    }

    /*
     * ============================================================
     * TELEGRAM CALLBACK BUTTONS
     * ============================================================
     */

    const callback = update.callback_query;

    if (callback) {
      // Only allow the configured Telegram admin chat/user
      // to control conversations.
      if (
        String(callback.from?.id) !== String(telegram.chatId) ||
        typeof callback.message?.message_id !== "number"
      ) {
        return response.json({ ok: true });
      }

      const sessionId = await getTelegramMessageSession(
        callback.message.message_id
      );

      const session = sessionId
        ? await getSession(sessionId)
        : null;

      if (!session || session.status === "expired") {
        return response.json({ ok: true });
      }

      const data = callback.data;

      // Take Chat
      if (data === "take" && session.status !== "closed") {
        session.status = "active";
        session.agentName = agentDisplayName(callback.from);
        session.isTyping = false;

        await saveSession(session);
      }

      // Typing ON
      if (data === "typing_on" && session.status === "active") {
        session.isTyping = true;

        await saveSession(session);
      }

      // Typing OFF
      if (data === "typing_off" && session.status === "active") {
        session.isTyping = false;

        await saveSession(session);
      }

      // Close Chat
      if (data === "close" && session.status !== "closed") {
        session.status = "closed";
        session.isTyping = false;
        session.closedAt = Date.now();

        await saveSession(session);
      }

      if (callback.id) {
        await telegramRequest(
          telegram.token,
          "answerCallbackQuery",
          {
            callback_query_id: callback.id,
          }
        );
      }

      return response.json({ ok: true });
    }

    /*
     * ============================================================
     * TELEGRAM HUMAN REPLY
     * ============================================================
     */

    const message = update.message;

    /*
     * Ignore:
     * - messages without text
     * - invalid message IDs
     * - messages from another Telegram chat
     * - messages that aren't replies
     */
    if (
      !message?.text ||
      typeof message.message_id !== "number" ||
      String(message.chat?.id) !== String(telegram.chatId) ||
      typeof message.reply_to_message?.message_id !== "number"
    ) {
      return response.json({ ok: true });
    }

    /*
     * IMPORTANT DIAGNOSTIC LOG
     *
     * This tells us exactly what Telegram is sending when
     * the admin uses Telegram's native Reply feature.
     */
    console.info("[inji] TELEGRAM HUMAN REPLY RECEIVED", {
      messageId: message.message_id,

      replyToMessageId:
        message.reply_to_message.message_id,

      replyToText:
        message.reply_to_message.text,

      replyToCaption:
        message.reply_to_message.caption,

      chatId:
        message.chat?.id,

      from:
        message.from,

      text:
        message.text,
    });

    /*
     * Resolve the visitor session.
     *
     * First:
     *   Telegram message ID -> Redis mapping
     *
     * Fallback:
     *   Session ID contained inside replied-to message
     */
    const resolution = await sessionForReply(
      message.reply_to_message
    );

    const session = resolution.sessionId
      ? await getSession(resolution.sessionId)
      : null;

    /*
     * If the session cannot be resolved or is not active,
     * log exactly why instead of silently failing.
     */
    if (!session || session.status !== "active") {
      console.info("[inji] telegram reply not persisted", {
        messageId: message.message_id,

        replyToMessageId:
          message.reply_to_message.message_id,

        resolution:
          resolution.source,

        resolvedSessionId:
          resolution.sessionId,

        sessionStatus:
          session?.status || "missing",
      });

      return response.json({ ok: true });
    }

    /*
     * Prevent duplicate human replies.
     */
    if (
      !session.messages.some(
        (item) => item.id === `telegram-${message.message_id}`
      )
    ) {
      session.messages.push({
        id: `telegram-${message.message_id}`,
        role: "human",
        text: message.text.slice(0, 2000),
        timestamp: Date.now(),
        senderName: agentDisplayName(message.from),
      });

      session.agentName ||= agentDisplayName(message.from);

      // Stop typing indicator once the human sends a message.
      session.isTyping = false;

      /*
       * Save human reply into Redis.
       */
      await saveSession(session);

      /*
       * Save the human Telegram message ID too.
       * This allows future Telegram replies to this message
       * to resolve back to the same visitor session.
       */
      await saveTelegramMessage(
        session.sessionId,
        message.message_id
      );

      console.info("[inji] telegram reply persisted", {
        messageId: message.message_id,

        replyToMessageId:
          message.reply_to_message.message_id,

        resolution:
          resolution.source,

        sessionId:
          session.sessionId,
      });
    }

    return response.json({ ok: true });
  } catch (error) {
    console.error("[inji] telegram webhook error", error);

    return response
      .status(503)
      .json({ ok: false, error: "webhook_unavailable" });
  }
}