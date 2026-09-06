import { type ApiRequest, type ApiResponse } from "../../_types.js";

export function adminKey(request: ApiRequest) {
  const configured = process.env.INJI_ADMIN_KEY;
  const supplied = request.headers["x-inji-admin-key"];
  const value = Array.isArray(supplied) ? supplied[0] : supplied;
  if (!configured || !value || value !== configured) return false;
  return true;
}

export function adminUnauthorized(response: ApiResponse) {
  return response.status(401).json({ ok: false, error: "admin_unauthorized" });
}
