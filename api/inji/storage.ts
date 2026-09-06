export type HandoffStatus = "waiting" | "answered" | "expired";

export type HandoffSession = {
  sessionId: string;
  question: string;
  status: HandoffStatus;
  answer?: string;
  createdAt: number;
  answeredAt?: number;
  expiresAt: number;
};

const SESSION_TTL_SECONDS = 24 * 60 * 60;
const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("storage_not_configured");
  return { url: url.replace(/\/$/, ""), token };
}

async function redisCommand<T>(command: string[]): Promise<T> {
  const { url, token } = redisConfig();
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!response.ok) throw new Error("storage_request_failed");
  const result = await response.json() as { result?: T };
  return result.result as T;
}

function sessionKey(sessionId: string) {
  return `formiva:inji:session:${sessionId}`;
}

function rateKey(sessionId: string) {
  return `formiva:inji:rate:${sessionId}`;
}

export function isExpired(session: HandoffSession) {
  return Date.now() >= session.expiresAt;
}

export async function saveSession(session: HandoffSession) {
  await redisCommand(["SET", sessionKey(session.sessionId), JSON.stringify(session), "EX", String(SESSION_TTL_SECONDS)]);
}

export async function getSession(sessionId: string) {
  const value = await redisCommand<string | null>(["GET", sessionKey(sessionId)]);
  if (!value) return null;
  const session = JSON.parse(value) as HandoffSession;
  if (isExpired(session)) {
    await deleteSession(sessionId);
    return { ...session, status: "expired" as const };
  }
  return session;
}

export async function deleteSession(sessionId: string) {
  await redisCommand(["DEL", sessionKey(sessionId)]);
}

export async function allowHandoff(sessionId: string) {
  const count = await redisCommand<number>(["INCR", rateKey(sessionId)]);
  if (count === 1) await redisCommand(["EXPIRE", rateKey(sessionId), "60"]);
  return count <= 5;
}

export function newSession(sessionId: string, question: string): HandoffSession {
  const now = Date.now();
  return {
    sessionId,
    question,
    status: "waiting",
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
}
