import { type ApiRequest, type ApiResponse } from "../_types.js";
import { bodyObject, methodNotAllowed, validSessionId } from "./common.js";
import { getSession, saveSession } from "./storage.js";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  const sessionId = bodyObject(request)?.sessionId;
  if (!validSessionId(sessionId)) return response.status(400).json({ ok: false, error: "invalid_session" });
  try {
    const session = await getSession(sessionId);
    if (!session || session.status === "expired") return response.status(404).json({ ok: false, error: "session_not_found" });
    if (session.status !== "closed") { session.status = "closed"; session.isTyping = false; session.closedAt = Date.now(); await saveSession(session); }
    response.json({ ok: true, status: "closed" });
  } catch { response.status(503).json({ ok: false, error: "close_unavailable" }); }
}
