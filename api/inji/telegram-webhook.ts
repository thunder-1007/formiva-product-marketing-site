import { type ApiRequest, type ApiResponse } from "../_types";
import { bodyObject, configuredTelegram, headerValue, MAX_MESSAGE_LENGTH, methodNotAllowed, validSessionId } from "./common";
import { getSession, saveSession } from "./storage";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") {
    methodNotAllowed(response, ["POST"]);
    return;
  }

  let telegram;
  try {
    telegram = configuredTelegram();
  } catch {
    response.status(503).json({ ok: false, error: "webhook_not_configured" });
    return;
  }

  if (headerValue(request, "x-telegram-bot-api-secret-token") !== telegram.webhookSecret) {
    response.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  const body = bodyObject(request) as { message?: { chat?: { id?: number | string }; text?: string } } | null;
  const message = body?.message;
  if (!message?.text || String(message.chat?.id) !== String(telegram.chatId)) {
    response.json({ ok: true });
    return;
  }

  const match = message.text.match(/^\/reply(?:@\w+)?\s+([A-Za-z0-9_-]{8,128})\s+([\s\S]+)$/i);
  if (!match || match[2].trim().length > MAX_MESSAGE_LENGTH) {
    response.json({ ok: true });
    return;
  }
  if (!validSessionId(match[1])) {
    response.json({ ok: true });
    return;
  }

  try {
    const session = await getSession(match[1]);
    if (!session || session.status === "expired") {
      response.json({ ok: true });
      return;
    }
    await saveSession({ ...session, status: "answered", answer: match[2].trim(), answeredAt: Date.now() });
    response.json({ ok: true });
  } catch {
    response.status(503).json({ ok: false, error: "webhook_unavailable" });
  }
}
