import { type ApiRequest, type ApiResponse } from "../../_types.js";
import { methodNotAllowed, validSessionId } from "../common.js";
import { getSession } from "../storage.js";
import { adminKey, adminUnauthorized } from "./auth.js";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  if (!adminKey(request)) return adminUnauthorized(response);
  const sessionId = request.query.sessionId;
  if (!validSessionId(sessionId)) return response.status(400).json({ ok: false, error: "invalid_session" });
  try {
    const value = await getSession(sessionId);
    if (!value) return response.status(404).json({ ok: false, error: "session_not_found" });
    response.setHeader?.("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    return response.json({ ok: true, session: value });
  } catch {
    return response.status(503).json({ ok: false, error: "admin_session_unavailable" });
  }
}
