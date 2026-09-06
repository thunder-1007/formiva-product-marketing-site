import { type ApiRequest, type ApiResponse } from "../../_types.js";
import { methodNotAllowed } from "../common.js";
import { listSessions } from "../storage.js";
import { adminKey, adminUnauthorized } from "./auth.js";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  if (!adminKey(request)) return adminUnauthorized(response);
  try {
    const sessions = await listSessions(100);
    response.setHeader?.("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    return response.json({ ok: true, sessions });
  } catch {
    return response.status(503).json({ ok: false, error: "admin_sessions_unavailable" });
  }
}
