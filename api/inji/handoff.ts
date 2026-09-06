import { type ApiRequest, type ApiResponse } from "../_types.js";
import {
  bodyObject,
  MAX_QUESTION_LENGTH,
  methodNotAllowed,
  sendTelegramNotification,
  validConversation,
  validSessionId,
} from "./common.js";
import { allowHandoff, deleteSession, newSession, saveSession } from "./storage.js";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") {
    methodNotAllowed(response, ["POST"]);
    return;
  }

  const body = bodyObject(request);
  const sessionId = body?.sessionId;
  const question = body?.question;
  const conversation = body?.conversation;
  if (!validSessionId(sessionId) || typeof question !== "string" || question.trim().length === 0 || question.length > MAX_QUESTION_LENGTH || !validConversation(conversation)) {
    response.status(400).json({ ok: false, error: "invalid_request" });
    return;
  }

  try {
    if (!(await allowHandoff(sessionId))) {
      response.status(429).json({ ok: false, error: "rate_limited" });
      return;
    }
    const session = newSession(sessionId, question.trim());
    await saveSession(session);
    await sendTelegramNotification(session, conversation);
    response.json({ ok: true, status: "waiting" });
  } catch {
    try {
      await deleteSession(sessionId);
    } catch {
      // The client still receives the same generic failure response.
    }
    response.json({ ok: false, error: "handoff_unavailable" });
  }
}
