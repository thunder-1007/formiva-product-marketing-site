import { type ApiRequest, type ApiResponse } from "../../_types.js";
import { bodyObject, methodNotAllowed, validSessionId } from "../common.js";
import { setSessionTyping } from "../storage.js";
import { adminKey, adminUnauthorized } from "./auth.js";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  if (!adminKey(request)) return adminUnauthorized(response);
  const body = bodyObject(request);
  const sessionId = body?.sessionId;
  const isTyping = body?.isTyping;
  if (!validSessionId(sessionId) || typeof isTyping !== "boolean") return response.status(400).json({ ok: false, error: "invalid_request" });
  try {
    const session = await setSessionTyping(sessionId, isTyping, 2500);
    if (!session) return response.status(409).json({ ok: false, error: "chat_not_active" });
    return response.json({ ok: true, session });
  } catch {
    return response.status(503).json({ ok: false, error: "typing_unavailable" });
  }
}
