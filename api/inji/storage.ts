export type HandoffStatus = "waiting" | "active" | "closed" | "expired";

export type SessionMessage = {
  id: string;
  role: "user" | "human";
  text: string;
  timestamp: number;
  senderName?: string;
};

export type HandoffSession = {
  sessionId: string;
  question: string;
  status: HandoffStatus;
  messages: SessionMessage[];
  visitorName: string;
  company: string;
  phone: string;
  email: string;
  originalQuestion: string;
  agentName?: string;
  isTyping: boolean;
  rating?: number;
  feedback?: string;
  feedbackSubmitted?: boolean;
  createdAt: number;
  updatedAt: number;
  closedAt?: number;
  expiresAt: number;
};

const TTL = 24 * 60 * 60;
const TTL_MS = TTL * 1000;

function config() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("storage_not_configured");
  return { url, token };
}

export async function redisCommand<T>(command: string[]): Promise<T> {
  const { url, token } = config();
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!response.ok) throw new Error("storage_request_failed");
  return (await response.json() as { result: T }).result;
}

const sessionKey = (id: string) => `formiva:inji:session:${id}`;
const messageKey = (id: number) => `formiva:inji:telegram-message:${id}`;
const updateKey = (id: number) => `formiva:inji:telegram-update:${id}`;
const activeChatKey = (chatId: string) => `formiva:inji:active-chat:${chatId}`;

export const isExpired = (session: HandoffSession) => Date.now() >= session.expiresAt;

export async function saveSession(session: HandoffSession) {
  session.updatedAt = Date.now();
  await redisCommand(["SET", sessionKey(session.sessionId), JSON.stringify(session), "EX", String(TTL)]);
}

export async function getSession(id: string): Promise<HandoffSession | null> {
  const value = await redisCommand<string | null>(["GET", sessionKey(id)]);
  if (!value) return null;
  const session = JSON.parse(value) as HandoffSession;
  return isExpired(session) ? { ...session, status: "expired" } : session;
}

export async function deleteSession(id: string) {
  await redisCommand(["DEL", sessionKey(id)]);
}

export async function allowHandoff(id: string) {
  const key = `formiva:inji:rate:${id}`;
  const count = await redisCommand<number>(["INCR", key]);
  if (count === 1) await redisCommand(["EXPIRE", key, "60"]);
  return count <= 5;
}

export async function saveTelegramMessage(sessionId: string, messageId: number) {
  await redisCommand(["SET", messageKey(messageId), sessionId, "EX", String(TTL)]);
}

export async function getTelegramMessageSession(messageId: number) {
  return redisCommand<string | null>(["GET", messageKey(messageId)]);
}

export async function saveActiveChat(chatId: string, sessionId: string) {
  await redisCommand(["SET", activeChatKey(chatId), sessionId, "EX", String(TTL)]);
}

export async function getActiveChat(chatId: string) {
  return redisCommand<string | null>(["GET", activeChatKey(chatId)]);
}

export async function deleteActiveChat(chatId: string) {
  await redisCommand(["DEL", activeChatKey(chatId)]);
}

export async function claimTelegramUpdate(updateId: number) {
  const result = await redisCommand<string | null>(["SET", updateKey(updateId), "1", "NX", "EX", String(TTL)]);
  return result === "OK";
}

export function newSession(sessionId: string, question: string, details: Pick<HandoffSession, "visitorName" | "company" | "phone" | "email">): HandoffSession {
  const now = Date.now();
  return {
    sessionId,
    question,
    originalQuestion: question,
    ...details,
    status: "waiting",
    messages: [],
    isTyping: false,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + TTL_MS,
  };
}
