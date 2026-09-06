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

type TelegramUser = {
  id?: number;
  first_name?: string;
  last_name?: string;
};

type TelegramMessage = {
  message_id?: number;
  text?: string;
  caption?: string;
  chat?: {
    id?: number;
    type?: string;
  };
  from?: TelegramUser;
  reply_to_message?: {
    message_id?: number;
    text?: string;
    caption?: string;
  };
};

type TelegramUpdate = {
  update_id?: number;

  callback_query?: {
    id?: string;
    data?: string;
    from?: TelegramUser;
    message?: {
      message_id?: number;
    };
  };

  message?: TelegramMessage;
};

const agentDisplayName = (from?: TelegramUser) =>
  [from?.first_name, from?.last_name]
    .filter(Boolean)
    .join(" ")
    .slice(0, 80) || "Formiva Team";

/**
 * Resolve a Formiva session from the Telegram message
 * that the human replied to.
 *
 * We try THREE methods:
 *
 * 1. Redis message_id -> session mapping
 * 2. Session ID embedded in the Telegram message text
 * 3. Session ID embedded in the Telegram caption
 */
async function resolveSessionFromReply(
  replyTo?: TelegramMessage["reply_to_message"],
) {
  if (!replyTo || typeof replyTo.message_id !== "number") {
    return {
      sessionId: null,
      source: "missing_reply",
    };
  }

  // ------------------------------------------------------------
  // METHOD 1: Redis message mapping
  // ------------------------------------------------------------

  try {
    const mappedSessionId = await getTelegramMessageSession(
      replyTo.message_id,
    );

    if (mappedSessionId && validSessionId(mappedSessionId)) {
      return {
        sessionId: mappedSessionId,
        source: "message_mapping",
      };
    }
  } catch (error) {
    console.error("[inji] message mapping lookup failed", error);
  }

  // ------------------------------------------------------------
  // METHOD 2 + 3: Session ID inside text/caption
  // ------------------------------------------------------------

  const rawText = [
    replyTo.text || "",
    replyTo.caption || "",
  ].join("\n");

  /*
   * Telegram may remove HTML tags such as <code>.
   *
   * Therefore we intentionally search for the UUID itself,
   * not for the HTML markup.
   */
  const match = rawText.match(
    /session-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  );

  if (match && validSessionId(match[0])) {
    return {
      sessionId: match[0],
      source: "message_text",
    };
  }

  return {
    sessionId: null,
    source: "unresolved",
  };
}

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  // ------------------------------------------------------------
  // Telegram configuration
  // ------------------------------------------------------------

  let telegram;

  try {
    telegram = telegramConfig();
  } catch {
    return response
      .status(503)
      .json({
        ok: false,
        error: "webhook_not_configured",
      });
  }

  // ------------------------------------------------------------
  // Verify Telegram webhook secret
  // ------------------------------------------------------------

  const secret = headerValue(
    request,
    "x-telegram-bot-api-secret-token",
  );

  if (secret !== telegram.webhookSecret) {
    console.warn("[inji] telegram webhook unauthorized");

    return response
      .status(401)
      .json({
        ok: false,
        error: "unauthorized",
      });
  }

  // ------------------------------------------------------------
  // Parse Telegram update
  // ------------------------------------------------------------

  const update = bodyObject(request) as TelegramUpdate | null;

  if (!update) {
    console.warn("[inji] telegram webhook invalid update");

    return response
      .status(400)
      .json({
        ok: false,
        error: "invalid_update",
      });
  }

  try {
    // ----------------------------------------------------------
    // Deduplicate Telegram updates
    // ----------------------------------------------------------

    if (typeof update.update_id === "number") {
      const claimed = await claimTelegramUpdate(update.update_id);

      if (!claimed) {
        console.info("[inji] duplicate telegram update ignored", {
          updateId: update.update_id,
        });

        return response.json({ ok: true });
      }
    }

    // ==========================================================
    // CALLBACK BUTTONS
    // ==========================================================

    const callback = update.callback_query;

    if (callback) {
      console.info("[inji] telegram callback received", {
        callbackId: callback.id,
        data: callback.data,
        fromId: callback.from?.id,
        configuredChatId: telegram.chatId,
        messageId: callback.message?.message_id,
      });

      if (
        String(callback.from?.id) !== String(telegram.chatId) ||
        typeof callback.message?.message_id !== "number"
      ) {
        console.warn("[inji] telegram callback rejected", {
          fromId: callback.from?.id,
          configuredChatId: telegram.chatId,
          messageId: callback.message?.message_id,
        });

        return response.json({ ok: true });
      }

      const sessionId = await getTelegramMessageSession(
        callback.message.message_id,
      );

      const session = sessionId
        ? await getSession(sessionId)
        : null;

      if (!session || session.status === "expired") {
        console.warn("[inji] callback session missing", {
          sessionId,
          data: callback.data,
        });

        return response.json({ ok: true });
      }

      const data = callback.data;

      // --------------------------------------------------------
      // TAKE CHAT
      // --------------------------------------------------------

      if (data === "take" && session.status !== "closed") {
        session.status = "active";
        session.agentName = agentDisplayName(callback.from);
        session.isTyping = false;

        await saveSession(session);

        console.info("[inji] chat taken", {
          sessionId: session.sessionId,
          agentName: session.agentName,
        });
      }

      // --------------------------------------------------------
      // TYPING ON
      // --------------------------------------------------------

      if (
        data === "typing_on" &&
        session.status === "active"
      ) {
        session.isTyping = true;

        await saveSession(session);

        console.info("[inji] typing enabled", {
          sessionId: session.sessionId,
        });
      }

      // --------------------------------------------------------
      // TYPING OFF
      // --------------------------------------------------------

      if (
        data === "typing_off" &&
        session.status === "active"
      ) {
        session.isTyping = false;

        await saveSession(session);

        console.info("[inji] typing disabled", {
          sessionId: session.sessionId,
        });
      }

      // --------------------------------------------------------
      // CLOSE CHAT
      // --------------------------------------------------------

      if (
        data === "close" &&
        session.status !== "closed"
      ) {
        session.status = "closed";
        session.isTyping = false;
        session.closedAt = Date.now();

        await saveSession(session);

        console.info("[inji] chat closed", {
          sessionId: session.sessionId,
        });
      }

      // --------------------------------------------------------
      // Telegram callback acknowledgement
      // --------------------------------------------------------

      if (callback.id) {
        await telegramRequest(
          telegram.token,
          "answerCallbackQuery",
          {
            callback_query_id: callback.id,
          },
        );
      }

      return response.json({ ok: true });
    }

    // ==========================================================
    // HUMAN TELEGRAM MESSAGE
    // ==========================================================

    const message = update.message;

    /*
     * IMPORTANT:
     *
     * Do NOT silently discard the update anymore.
     *
     * Log the actual Telegram message structure first.
     */

    if (message) {
      console.info("[inji] telegram message received", {
        updateId: update.update_id,
        messageId: message.message_id,
        chatId: message.chat?.id,
        configuredChatId: telegram.chatId,
        chatType: message.chat?.type,
        fromId: message.from?.id,
        fromName: agentDisplayName(message.from),
        text: message.text,
        replyToMessageId:
          message.reply_to_message?.message_id,
        replyToText:
          message.reply_to_message?.text,
        replyToCaption:
          message.reply_to_message?.caption,
      });
    }

    // ----------------------------------------------------------
    // Ignore messages that aren't usable human replies
    // ----------------------------------------------------------

    if (!message) {
      return response.json({ ok: true });
    }

    if (typeof message.message_id !== "number") {
      console.warn("[inji] telegram message missing message_id");

      return response.json({ ok: true });
    }

    if (!message.text?.trim()) {
      console.info("[inji] telegram message has no text");

      return response.json({ ok: true });
    }

    // ----------------------------------------------------------
    // SECURITY: only process messages from configured chat
    // ----------------------------------------------------------

    if (
      String(message.chat?.id) !==
      String(telegram.chatId)
    ) {
      console.warn("[inji] telegram message from wrong chat", {
        messageChatId: message.chat?.id,
        configuredChatId: telegram.chatId,
      });

      return response.json({ ok: true });
    }

    // ----------------------------------------------------------
    // Native Telegram Reply is required
    // ----------------------------------------------------------

    if (
      typeof message.reply_to_message?.message_id !==
      "number"
    ) {
      console.info(
        "[inji] telegram message is not a reply",
        {
          messageId: message.message_id,
        },
      );

      return response.json({ ok: true });
    }

    // ----------------------------------------------------------
    // Resolve the Formiva session
    // ----------------------------------------------------------

    const resolution =
      await resolveSessionFromReply(
        message.reply_to_message,
      );

    console.info("[inji] telegram reply resolution", {
      messageId: message.message_id,
      replyToMessageId:
        message.reply_to_message.message_id,
      sessionId: resolution.sessionId,
      source: resolution.source,
    });

    if (!resolution.sessionId) {
      console.warn(
        "[inji] could not resolve session from telegram reply",
      );

      return response.json({ ok: true });
    }

    // ----------------------------------------------------------
    // Load session
    // ----------------------------------------------------------

    const session = await getSession(
      resolution.sessionId,
    );

    if (!session) {
      console.warn("[inji] telegram reply session missing", {
        sessionId: resolution.sessionId,
      });

      return response.json({ ok: true });
    }

    if (session.status !== "active") {
      console.warn(
        "[inji] telegram reply session is not active",
        {
          sessionId: session.sessionId,
          status: session.status,
        },
      );

      return response.json({ ok: true });
    }

    // ----------------------------------------------------------
    // Prevent duplicate human messages
    // ----------------------------------------------------------

    const humanMessageId =
      `telegram-${message.message_id}`;

    if (
      session.messages.some(
        item => item.id === humanMessageId,
      )
    ) {
      console.info(
        "[inji] duplicate human reply ignored",
        {
          sessionId: session.sessionId,
          messageId: message.message_id,
        },
      );

      return response.json({ ok: true });
    }

    // ----------------------------------------------------------
    // SAVE HUMAN MESSAGE
    // ----------------------------------------------------------

    const humanText =
      message.text.trim().slice(0, 2000);

    const humanName =
      agentDisplayName(message.from);

    session.messages.push({
      id: humanMessageId,
      role: "human",
      text: humanText,
      timestamp: Date.now(),
      senderName: humanName,
    });

    session.agentName =
      session.agentName || humanName;

    session.isTyping = false;

    await saveSession(session);

    // ----------------------------------------------------------
    // Map Telegram human reply message -> session
    //
    // This allows the visitor to reply to the human response
    // later and keeps the conversation chain alive.
    // ----------------------------------------------------------

    await saveTelegramMessage(
      session.sessionId,
      message.message_id,
    );

    console.info("[inji] HUMAN REPLY SAVED SUCCESSFULLY", {
      sessionId: session.sessionId,
      messageId: message.message_id,
      replyToMessageId:
        message.reply_to_message.message_id,
      agentName: humanName,
    });

    return response.json({ ok: true });

  } catch (error) {
    console.error(
      "[inji] telegram webhook processing error",
      error,
    );

    return response
      .status(503)
      .json({
        ok: false,
        error: "webhook_unavailable",
      });
  }
}