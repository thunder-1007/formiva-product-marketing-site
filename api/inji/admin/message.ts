import { type ApiRequest, type ApiResponse } from "../../_types.js";
import { bodyObject, MAX_MESSAGE_LENGTH, methodNotAllowed, validSessionId } from "../common.js";
import { getSession, saveSession } from "../storage.js";
import { adminKey, adminUnauthorized } from "./auth.js";

const createId = () => `team-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  if (!adminKey(request)) return adminUnauthorized(response);
  const body = bodyObject(request);
  const sessionId = body?.sessionId;
  const message = body?.message;
  if (!validSessionId(sessionId) || typeof message !== "string" || !message.trim() || message.length > MAX_MESSAGE_LENGTH) return response.status(400).json({ ok: false, error: "invalid_request" });
  try {
    const session = await getSession(sessionId);
    if (!session || session.status !== "active") return response.status(409).json({ ok: false, error: "chat_not_active" });
    const text = message.trim();
    session.messages.push({ id: createId(), role: "human", text, timestamp: Date.now(), senderName: session.agentName || "Formiva Team" });
    session.isTyping = false;
    session.typingUntil = undefined;
    await saveSession(session);
    return response.json({ ok: true, session });
  } catch {
    return response.status(503).json({ ok: false, error: "message_unavailable" });
  }
}
