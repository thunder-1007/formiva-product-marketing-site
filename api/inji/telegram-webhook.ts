import {
  type ApiRequest,
  type ApiResponse,
} from "../_types.js";

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
  deleteActiveChat,
  getActiveChat,
  getSession,
  getTelegramMessageSession,
  saveActiveChat,
  saveSession,
  saveTelegramMessage,
} from "./storage.js";

// ============================================================
// Telegram types
// ============================================================

type TelegramUser = {
  id?: number;
  first_name?: string;
  last_name?: string;
};

type TelegramReplyMessage = {
  message_id?: number;
  text?: string;
  caption?: string;
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

  reply_to_message?: TelegramReplyMessage;
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

// ============================================================
// Agent display name
// ============================================================

const agentDisplayName = (
  from?: TelegramUser,
) =>
  [
    from?.first_name,
    from?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 80) ||
  "Formiva Team";

// ============================================================
// Resolve customer session from a Telegram Reply
// ============================================================
//
// Priority:
//
// 1. Telegram reply_to_message.message_id -> Redis mapping
// 2. Session ID embedded inside replied message
// 3. Active chat fallback
//
// The fallback is important because your current Telegram
// updates are arriving without reply_to_message.
// ============================================================

async function resolveSession(
  message: TelegramMessage,
  telegramChatId: string,
) {
  // ----------------------------------------------------------
  // METHOD 1
  // Native Telegram Reply -> Redis message mapping
  // ----------------------------------------------------------

  const replyMessageId =
    message.reply_to_message?.message_id;

  if (typeof replyMessageId === "number") {
    const mappedSessionId =
      await getTelegramMessageSession(
        replyMessageId,
      );

    if (
      mappedSessionId &&
      validSessionId(mappedSessionId)
    ) {
      return {
        sessionId: mappedSessionId,
        source: "telegram_reply_mapping",
      };
    }

    // --------------------------------------------------------
    // METHOD 2
    // Try finding Session ID in replied Telegram text
    // --------------------------------------------------------

    const repliedText = [
      message.reply_to_message?.text || "",
      message.reply_to_message?.caption || "",
    ].join("\n");

    const sessionMatch =
      repliedText.match(
        /session-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
      );

    if (
      sessionMatch &&
      validSessionId(sessionMatch[0])
    ) {
      return {
        sessionId: sessionMatch[0],
        source: "telegram_reply_text",
      };
    }
  }

  // ----------------------------------------------------------
  // METHOD 3
  // Active chat fallback
  //
  // This is the important fix for your current logs.
  // ----------------------------------------------------------

  const activeSessionId =
    await getActiveChat(
      telegramChatId,
    );

  if (
    activeSessionId &&
    validSessionId(activeSessionId)
  ) {
    return {
      sessionId: activeSessionId,
      source: "active_chat_fallback",
    };
  }

  return {
    sessionId: null,
    source: "unresolved",
  };
}

// ============================================================
// Main webhook handler
// ============================================================

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  // ----------------------------------------------------------
  // Method
  // ----------------------------------------------------------

  if (request.method !== "POST") {
    return methodNotAllowed(
      response,
      ["POST"],
    );
  }

  // ----------------------------------------------------------
  // Telegram config
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // Verify Telegram secret
  // ----------------------------------------------------------

  const secret = headerValue(
    request,
    "x-telegram-bot-api-secret-token",
  );

  if (
    secret !== telegram.webhookSecret
  ) {
    console.warn(
      "[inji] telegram webhook unauthorized",
    );

    return response
      .status(401)
      .json({
        ok: false,
        error: "unauthorized",
      });
  }

  // ----------------------------------------------------------
  // Parse update
  // ----------------------------------------------------------

  const update =
    bodyObject(request) as TelegramUpdate | null;

  if (!update) {
    return response
      .status(400)
      .json({
        ok: false,
        error: "invalid_update",
      });
  }

  try {
    // ========================================================
    // Prevent duplicate Telegram updates
    // ========================================================

    if (
      typeof update.update_id ===
      "number"
    ) {
      const claimed =
        await claimTelegramUpdate(
          update.update_id,
        );

      if (!claimed) {
        console.info(
          "[inji] duplicate telegram update ignored",
          {
            updateId: update.update_id,
          },
        );

        return response.json({
          ok: true,
        });
      }
    }

    // ========================================================
    // CALLBACK QUERY
    // Take Chat / Typing / Stop Typing / Close
    // ========================================================

    const callback =
      update.callback_query;

    if (callback) {
      console.info(
        "[inji] telegram callback received",
        {
          callbackId: callback.id,
          data: callback.data,
          fromId: callback.from?.id,
          configuredChatId: telegram.chatId,
          messageId:
            callback.message?.message_id,
        },
      );

      // Only the configured admin Telegram chat
      // can control the conversation.

      if (
        String(callback.from?.id) !==
          String(telegram.chatId) ||
        typeof callback.message?.message_id !==
          "number"
      ) {
        console.warn(
          "[inji] telegram callback rejected",
          {
            fromId: callback.from?.id,
            configuredChatId:
              telegram.chatId,
            messageId:
              callback.message?.message_id,
          },
        );

        return response.json({
          ok: true,
        });
      }

      // ------------------------------------------------------
      // Find session associated with the button message
      // ------------------------------------------------------

      const sessionId =
        await getTelegramMessageSession(
          callback.message.message_id,
        );

      const session = sessionId
        ? await getSession(sessionId)
        : null;

      if (
        !session ||
        session.status === "expired"
      ) {
        console.warn(
          "[inji] callback session missing or expired",
          {
            sessionId,
            data: callback.data,
          },
        );

        return response.json({
          ok: true,
        });
      }

      const data = callback.data;

      // ======================================================
      // TAKE CHAT
      // ======================================================

      if (
        data === "take" &&
        session.status !== "closed"
      ) {
        session.status = "active";

        session.agentName =
          agentDisplayName(
            callback.from,
          );

        session.isTyping = false;

        await saveSession(
          session,
        );

        // THIS IS THE IMPORTANT PART:
        //
        // Remember which visitor this admin is currently
        // chatting with.

        await saveActiveChat(
          String(telegram.chatId),
          session.sessionId,
        );

        console.info(
          "[inji] chat taken",
          {
            sessionId:
              session.sessionId,
            agentName:
              session.agentName,
          },
        );
      }

      // ======================================================
      // TYPING ON
      // ======================================================

      if (
        data === "typing_on" &&
        session.status === "active"
      ) {
        session.isTyping = true;

        await saveSession(
          session,
        );

        console.info(
          "[inji] typing enabled",
          {
            sessionId:
              session.sessionId,
          },
        );
      }

      // ======================================================
      // TYPING OFF
      // ======================================================

      if (
        data === "typing_off" &&
        session.status === "active"
      ) {
        session.isTyping = false;

        await saveSession(
          session,
        );

        console.info(
          "[inji] typing disabled",
          {
            sessionId:
              session.sessionId,
          },
        );
      }

      // ======================================================
      // CLOSE CHAT
      // ======================================================

      if (
        data === "close" &&
        session.status !== "closed"
      ) {
        session.status = "closed";

        session.isTyping = false;

        session.closedAt =
          Date.now();

        await saveSession(
          session,
        );

        await deleteActiveChat(
          String(telegram.chatId),
        );

        console.info(
          "[inji] chat closed",
          {
            sessionId:
              session.sessionId,
          },
        );
      }

      // ------------------------------------------------------
      // Answer Telegram callback
      // ------------------------------------------------------

      if (callback.id) {
        await telegramRequest(
          telegram.token,
          "answerCallbackQuery",
          {
            callback_query_id:
              callback.id,
          },
        );
      }

      return response.json({
        ok: true,
      });
    }

    // ========================================================
    // TELEGRAM MESSAGE
    // ========================================================

    const message =
      update.message;

    // --------------------------------------------------------
    // No message
    // --------------------------------------------------------

    if (!message) {
      return response.json({
        ok: true,
      });
    }

    // --------------------------------------------------------
    // DEBUG LOG
    //
    // This is deliberately before filtering so we can see
    // exactly what Telegram sent.
    // --------------------------------------------------------

    console.info(
      "[inji] telegram message received",
      {
        updateId:
          update.update_id,

        messageId:
          message.message_id,

        chatId:
          message.chat?.id,

        configuredChatId:
          telegram.chatId,

        chatType:
          message.chat?.type,

        fromId:
          message.from?.id,

        fromName:
          agentDisplayName(
            message.from,
          ),

        text:
          message.text,

        replyToMessageId:
          message.reply_to_message
            ?.message_id ?? null,

        replyToText:
          message.reply_to_message
            ?.text ?? null,

        replyToCaption:
          message.reply_to_message
            ?.caption ?? null,
      },
    );

    // --------------------------------------------------------
    // Validate message ID
    // --------------------------------------------------------

    if (
      typeof message.message_id !==
      "number"
    ) {
      console.warn(
        "[inji] telegram message missing message_id",
      );

      return response.json({
        ok: true,
      });
    }

    // --------------------------------------------------------
    // We only support text replies
    // --------------------------------------------------------

    if (
      typeof message.text !== "string" ||
      !message.text.trim()
    ) {
      console.info(
        "[inji] telegram message has no text",
        {
          messageId:
            message.message_id,
        },
      );

      return response.json({
        ok: true,
      });
    }

    // --------------------------------------------------------
    // SECURITY
    //
    // Ignore messages from other Telegram chats.
    // --------------------------------------------------------

    if (
      String(message.chat?.id) !==
      String(telegram.chatId)
    ) {
      console.warn(
        "[inji] telegram message from wrong chat",
        {
          messageChatId:
            message.chat?.id,

          configuredChatId:
            telegram.chatId,
        },
      );

      return response.json({
        ok: true,
      });
    }

    // ========================================================
    // RESOLVE CUSTOMER SESSION
    // ========================================================

    const resolution =
      await resolveSession(
        message,
        String(telegram.chatId),
      );

    console.info(
      "[inji] telegram reply resolved",
      {
        messageId:
          message.message_id,

        replyToMessageId:
          message.reply_to_message
            ?.message_id ?? null,

        sessionId:
          resolution.sessionId,

        source:
          resolution.source,
      },
    );

    // --------------------------------------------------------
    // No session
    // --------------------------------------------------------

    if (!resolution.sessionId) {
      console.warn(
        "[inji] unable to resolve telegram message to a session",
        {
          messageId:
            message.message_id,
        },
      );

      return response.json({
        ok: true,
      });
    }

    // ========================================================
    // LOAD CUSTOMER SESSION
    // ========================================================

    const session =
      await getSession(
        resolution.sessionId,
      );

    if (!session) {
      console.warn(
        "[inji] resolved session does not exist",
        {
          sessionId:
            resolution.sessionId,
          messageId:
            message.message_id,
        },
      );

      return response.json({
        ok: true,
      });
    }

    // ========================================================
    // MUST BE ACTIVE
    // ========================================================

    if (
      session.status !== "active"
    ) {
      console.warn(
        "[inji] resolved session is not active",
        {
          sessionId:
            session.sessionId,

          status:
            session.status,

          messageId:
            message.message_id,
        },
      );

      return response.json({
        ok: true,
      });
    }

    // ========================================================
    // Prevent duplicate human replies
    // ========================================================

    const humanMessageId =
      `telegram-${message.message_id}`;

    if (
      session.messages.some(
        item =>
          item.id ===
          humanMessageId,
      )
    ) {
      console.info(
        "[inji] duplicate human reply ignored",
        {
          sessionId:
            session.sessionId,

          messageId:
            message.message_id,
        },
      );

      return response.json({
        ok: true,
      });
    }

    // ========================================================
    // SAVE HUMAN MESSAGE
    // ========================================================

    const humanText =
      message.text
        .trim()
        .slice(0, 2000);

    const humanName =
      agentDisplayName(
        message.from,
      );

    session.messages.push({
      id: humanMessageId,
      role: "human",
      text: humanText,
      timestamp: Date.now(),
      senderName: humanName,
    });

    // Preserve agent selected when Take Chat was clicked.

    session.agentName =
      session.agentName ||
      humanName;

    session.isTyping = false;

    // Save updated customer session.

    await saveSession(
      session,
    );

    // Map the human's Telegram reply to this session too.
    //
    // This keeps the conversation mapping available if later
    // Telegram messages are replied to.

    await saveTelegramMessage(
      session.sessionId,
      message.message_id,
    );

    console.info(
      "[inji] HUMAN REPLY SAVED SUCCESSFULLY",
      {
        sessionId:
          session.sessionId,

        messageId:
          message.message_id,

        replyToMessageId:
          message.reply_to_message
            ?.message_id ?? null,

        source:
          resolution.source,

        agentName:
          humanName,
      },
    );

    return response.json({
      ok: true,
    });

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