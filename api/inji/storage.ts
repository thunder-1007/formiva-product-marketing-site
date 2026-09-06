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
  typingUntil?: number;
  customerTyping?: boolean;
  customerTypingUntil?: number;
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
const LOCK_TTL_MS = 5000;

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
const sessionsIndexKey = "formiva:inji:sessions:index";
const sessionLockKey = (id: string) => `formiva:inji:session-lock:${id}`;
const agentTypingKey = (id: string) => `formiva:inji:typing:agent:${id}`;
const customerTypingKey = (id: string) => `formiva:inji:typing:customer:${id}`;

export const isExpired = (session: HandoffSession) => Date.now() >= session.expiresAt;

export const normalizeTyping = (session: HandoffSession): HandoffSession => {
  const now = Date.now();
  let next = session;

  if (session.isTyping && session.typingUntil && now >= session.typingUntil) {
    next = { ...next, isTyping: false, typingUntil: undefined };
  }

  if (next.customerTyping && next.customerTypingUntil && now >= next.customerTypingUntil) {
    next = { ...next, customerTyping: false, customerTypingUntil: undefined };
  }

  return next;
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireSessionLock(sessionId: string) {
  const token = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const key = sessionLockKey(sessionId);

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const result = await redisCommand<string | null>([
      "SET",
      key,
      token,
      "NX",
      "PX",
      String(LOCK_TTL_MS),
    ]);
    if (result === "OK") {
      return async () => {
        try {
          await redisCommand(["DEL", key]);
        } catch {
          // Best effort; the lock also expires automatically.
        }
      };
    }
    await sleep(40 + attempt * 15);
  }

  throw new Error("session_busy");
}

async function withSessionLock<T>(sessionId: string, task: () => Promise<T>): Promise<T> {
  const release = await acquireSessionLock(sessionId);
  try {
    return await task();
  } finally {
    await release();
  }
}

export async function saveSession(session: HandoffSession) {
  session.updatedAt = Date.now();
  const normalized = normalizeTyping(session);
  await redisCommand(["SET", sessionKey(session.sessionId), JSON.stringify(normalized), "EX", String(TTL)]);
  await redisCommand(["ZADD", sessionsIndexKey, String(normalized.updatedAt), session.sessionId]);
}

export async function getSession(id: string): Promise<HandoffSession | null> {
  const [value, agentTypingState, customerTypingState] = await Promise.all([
    redisCommand<string | null>(["GET", sessionKey(id)]),
    redisCommand<string | null>(["GET", agentTypingKey(id)]),
    redisCommand<string | null>(["GET", customerTypingKey(id)]),
  ]);

  if (!value) return null;

  const raw = JSON.parse(value) as HandoffSession;
  if (isExpired(raw)) {
    return {
      ...raw,
      status: "expired",
      isTyping: false,
      typingUntil: undefined,
      customerTyping: false,
      customerTypingUntil: undefined,
    };
  }

  let session = normalizeTyping(raw);

  if (agentTypingState !== null) {
    const active = agentTypingState === "1";
    session = {
      ...session,
      isTyping: active,
      typingUntil: active ? Date.now() + 2500 : undefined,
    };
  }

  if (customerTypingState !== null) {
    const active = customerTypingState === "1";
    session = {
      ...session,
      customerTyping: active,
      customerTypingUntil: active ? Date.now() + 2200 : undefined,
    };
  }

  return session;
}

export async function deleteSession(id: string) {
  await redisCommand([
    "DEL",
    sessionKey(id),
    sessionLockKey(id),
    agentTypingKey(id),
    customerTypingKey(id),
  ]);
}

export async function listSessions(limit = 100): Promise<HandoffSession[]> {
  const ids = await redisCommand<string[]>([
    "ZREVRANGE",
    sessionsIndexKey,
    "0",
    String(Math.max(0, limit - 1)),
  ]);

  if (!Array.isArray(ids) || ids.length === 0) return [];

  const sessions = await Promise.all(ids.map((id) => getSession(id)));
  return sessions
    .filter((session): session is HandoffSession => Boolean(session))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function mutateSession(
  sessionId: string,
  updater: (session: HandoffSession) => void | Promise<void>,
): Promise<HandoffSession | null> {
  return withSessionLock(sessionId, async () => {
    const session = await getSession(sessionId);
    if (!session) return null;
    await updater(session);
    await saveSession(session);
    return session;
  });
}

type AppendOptions = {
  clearAgentTyping?: boolean;
  clearCustomerTyping?: boolean;
  setAgentName?: string;
};

export async function appendSessionMessage(
  sessionId: string,
  message: SessionMessage,
  options: AppendOptions = {},
): Promise<{ session: HandoffSession; added: boolean } | null> {
  return withSessionLock(sessionId, async () => {
    const session = await getSession(sessionId);
    if (!session) return null;

    if (session.messages.some((item) => item.id === message.id)) {
      return { session, added: false };
    }

    session.messages.push(message);

    if (options.setAgentName) {
      session.agentName = options.setAgentName.slice(0, 80);
    }

    if (options.clearAgentTyping) {
      session.isTyping = false;
      session.typingUntil = undefined;
      await redisCommand(["SET", agentTypingKey(sessionId), "0", "EX", "5"]);
    }

    if (options.clearCustomerTyping) {
      session.customerTyping = false;
      session.customerTypingUntil = undefined;
      await redisCommand(["SET", customerTypingKey(sessionId), "0", "EX", "5"]);
    }

    await saveSession(session);
    return { session, added: true };
  });
}

export async function setSessionTyping(sessionId: string, isTyping: boolean, durationMs = 2500) {
  const session = await getSession(sessionId);
  if (!session || session.status !== "active") return null;

  await redisCommand([
    "SET",
    agentTypingKey(sessionId),
    isTyping ? "1" : "0",
    "EX",
    String(Math.max(5, Math.ceil(durationMs / 1000))),
  ]);

  return getSession(sessionId);
}

export async function setCustomerTyping(sessionId: string, isTyping: boolean, durationMs = 2200) {
  const session = await getSession(sessionId);
  if (!session || session.status !== "active") return null;

  await redisCommand([
    "SET",
    customerTypingKey(sessionId),
    isTyping ? "1" : "0",
    "EX",
    String(Math.max(5, Math.ceil(durationMs / 1000))),
  ]);

  return getSession(sessionId);
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
  const result = await redisCommand<string | null>([
    "SET",
    updateKey(updateId),
    "1",
    "NX",
    "EX",
    String(TTL),
  ]);
  return result === "OK";
}

export function newSession(
  sessionId: string,
  question: string,
  details: Pick<HandoffSession, "visitorName" | "company" | "phone" | "email">,
): HandoffSession {
  const now = Date.now();
  return {
    sessionId,
    question,
    originalQuestion: question,
    ...details,
    status: "waiting",
    messages: [],
    isTyping: false,
    customerTyping: false,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + TTL_MS,
  };
}
