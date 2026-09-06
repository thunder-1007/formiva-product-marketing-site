import { type ApiRequest, type ApiResponse } from "../_types.js";
import { methodNotAllowed, validSessionId } from "./common.js";
import { deleteSession, getSession } from "./storage.js";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "GET") {
    methodNotAllowed(response, ["GET"]);
    return;
  }

  const sessionId = request.query.sessionId;
  if (!validSessionId(sessionId)) {
    response.status(400).json({ ok: false, error: "invalid_session" });
    return;
  }

  try {
    const session = await getSession(sessionId);
    if (!session || session.status === "expired") {
      response.json({ ok: true, status: "expired" });
      return;
    }
    if (session.status === "answered" && session.answer) {
      await deleteSession(sessionId);
      response.json({ ok: true, status: "replied", reply: session.answer });
      return;
    }
    response.json({ ok: true, status: "waiting" });
  } catch {
    response.json({ ok: false, error: "reply_unavailable" });
  }
}
