import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, CircleUserRound, LogOut, RefreshCw, Send, Sparkles, X } from "lucide-react";
import { Link } from "wouter";
import "./TeamInbox.css";

type Message = {
  id: string;
  role: "user" | "human";
  text: string;
  timestamp: number;
  senderName?: string;
};

type Session = {
  sessionId: string;
  question: string;
  status: "waiting" | "active" | "closed" | "expired";
  messages: Message[];
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

const keyStorage = "formiva_team_inbox_key";
const pollMs = 1000;

const createId = () =>
  `team-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

function timeLabel(timestamp: number) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(timestamp);
  } catch {
    return "";
  }
}

function uniqueBy<T extends { id: string }>(items: T[]) {
  const map = new Map<string, T>();
  for (const item of items) map.set(item.id, item);
  return [...map.values()];
}

export default function TeamInbox() {
  const [adminKey, setAdminKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [authed, setAuthed] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState<Session | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const typingTimer = useRef<number | null>(null);
  const typingState = useRef(false);
  const selectedRequestSeq = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(keyStorage);
    if (saved) {
      setAdminKey(saved);
      setAuthed(true);
    }
  }, []);

  const headers = useMemo(
    () => ({
      "content-type": "application/json",
      "x-inji-admin-key": adminKey,
    }),
    [adminKey],
  );

  async function fetchSessions(selectFirst = false) {
    if (!adminKey) return;
    try {
      setLoading(true);
      const response = await fetch("/api/inji/admin", {
        headers: { "x-inji-admin-key": adminKey },
        cache: "no-store",
      });
      const data = await response.json() as {
        ok?: boolean;
        sessions?: Session[];
        error?: string;
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to load conversations");
      }

      const next = data.sessions || [];
      setSessions(next);

      if (selectFirst && !selectedId && next[0]) {
        setSelectedId(next[0].sessionId);
      }

      if (selectedId && !next.some((s) => s.sessionId === selectedId)) {
        setSelectedId(next[0]?.sessionId || "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load conversations");
    } finally {
      setLoading(false);
    }
  }

  async function fetchSelected() {
    if (!adminKey || !selectedId) return;

    const requestSeq = ++selectedRequestSeq.current;
    const requestSessionId = selectedId;

    try {
      const response = await fetch(
        `/api/inji/admin?sessionId=${encodeURIComponent(requestSessionId)}`,
        {
          headers: { "x-inji-admin-key": adminKey },
          cache: "no-store",
        },
      );

      const data = await response.json() as {
        ok?: boolean;
        session?: Session;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.session) {
        throw new Error(data.error || "Conversation unavailable");
      }

      if (
        requestSeq !== selectedRequestSeq.current ||
        requestSessionId !== selectedId
      ) {
        return;
      }

      setSelected(data.session);
      setSessions((current) =>
        current.map((item) =>
          item.sessionId === data.session!.sessionId ? data.session! : item,
        ),
      );
    } catch (err) {
      if (
        requestSeq !== selectedRequestSeq.current ||
        requestSessionId !== selectedId
      ) {
        return;
      }

      setError(
        err instanceof Error ? err.message : "Unable to load conversation",
      );
    }
  }

  useEffect(() => {
    if (!authed) return;
    void fetchSessions(true);

    const interval = window.setInterval(() => {
      void fetchSessions(false);
    }, 2000);

    return () => window.clearInterval(interval);
  }, [authed, adminKey]);

  useEffect(() => {
    if (!authed || !selectedId) return;
    void fetchSelected();

    const interval = window.setInterval(() => {
      void fetchSelected();
    }, pollMs);

    return () => window.clearInterval(interval);
  }, [authed, adminKey, selectedId]);

  useEffect(
    () => () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
    },
    [],
  );

  async function login(event: React.FormEvent) {
    event.preventDefault();

    const value = keyInput.trim();
    if (!value) return;

    setAdminKey(value);
    setError("");
    sessionStorage.setItem(keyStorage, value);
    setAuthed(true);
  }

  function logout() {
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    sessionStorage.removeItem(keyStorage);
    setAdminKey("");
    setAuthed(false);
    setSessions([]);
    setSelected(null);
    setSelectedId("");
    setInput("");
    typingState.current = false;
  }

  async function takeChat() {
    if (!selected || busy) return;

    ++selectedRequestSeq.current;
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/inji/admin", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "take",
          sessionId: selected.sessionId,
          agentName: "Sree",
        }),
      });

      const data = await response.json() as {
        ok?: boolean;
        session?: Session;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.session) {
        throw new Error(data.error || "Unable to take chat");
      }

      setSelected(data.session);
      setSessions((current) =>
        current.map((item) =>
          item.sessionId === data.session!.sessionId ? data.session! : item,
        ),
      );
      typingState.current = false;
      await fetchSessions(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to take chat");
    } finally {
      setBusy(false);
    }
  }

  async function closeChat() {
    if (!selected || busy) return;

    ++selectedRequestSeq.current;
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/inji/admin", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "close",
          sessionId: selected.sessionId,
        }),
      });

      const data = await response.json() as {
        ok?: boolean;
        session?: Session;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.session) {
        throw new Error(data.error || "Unable to close chat");
      }

      setSelected(data.session);
      setSessions((current) =>
        current.map((item) =>
          item.sessionId === data.session!.sessionId ? data.session! : item,
        ),
      );
      typingState.current = false;
      await fetchSessions(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to close chat");
    } finally {
      setBusy(false);
    }
  }

  async function setTyping(active: boolean) {
    if (!selected || selected.status !== "active") return;

    try {
      await fetch("/api/inji/admin", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "typing",
          sessionId: selected.sessionId,
          isTyping: active,
        }),
        keepalive: true,
      });
    } catch {
      // Typing presence is best-effort; polling recovers the visible state.
    }
  }

  function handleInput(value: string) {
    setInput(value);

    if (!selected || selected.status !== "active") return;

    if (!value.trim()) {
      typingState.current = false;
      void setTyping(false);
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      return;
    }

    if (!typingState.current) {
      typingState.current = true;
      void setTyping(true);
    }

    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      typingState.current = false;
      void setTyping(false);
    }, 1800);
  }

  async function sendMessage(event?: React.FormEvent) {
    event?.preventDefault();

    const text = input.trim();
    if (!text || !selected || selected.status !== "active" || busy) return;

    ++selectedRequestSeq.current;
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingState.current = false;
    setBusy(true);
    setError("");

    // Do not send a separate typing=false request here.
    // The message mutation clears agent typing atomically with the append,
    // preventing a stale typing write from overwriting this new message.

    const messageId = createId();

    try {
      const response = await fetch("/api/inji/admin", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "message",
          sessionId: selected.sessionId,
          message: text,
          messageId,
        }),
      });

      const data = await response.json() as {
        ok?: boolean;
        session?: Session;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.session) {
        throw new Error(data.error || "Unable to send message");
      }

      setInput("");
      setSelected(data.session);
      setSessions((current) =>
        current.map((item) =>
          item.sessionId === data.session!.sessionId ? data.session! : item,
        ),
      );
      inputRef.current?.focus();
    } catch (err) {
      setInput(text);
      typingState.current = false;
      setError(err instanceof Error ? err.message : "Unable to send message");
    } finally {
      setBusy(false);
    }
  }

  if (!authed) {
    return (
      <main className="team-inbox-login">
        <div className="team-login-card">
          <div className="team-brand">
            <span className="team-brand-mark"><Sparkles size={17} /></span>
            <div>
              <strong>Formiva Team</strong>
              <span>Inji conversation inbox</span>
            </div>
          </div>
          <h1>Team Inbox</h1>
          <p>Private workspace for handling Inji customer conversations.</p>
          <form onSubmit={login}>
            <label>
              Team access key
              <input
                type="password"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                autoFocus
              />
            </label>
            <button type="submit">
              Open inbox <ChevronRight size={16} />
            </button>
          </form>
          <Link href="/">← Back to Formiva</Link>
        </div>
      </main>
    );
  }

  const activeCount = sessions.filter((s) => s.status === "active").length;
  const waitingCount = sessions.filter((s) => s.status === "waiting").length;
  const visibleMessages = uniqueBy(selected?.messages || []).sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  return (
    <main className="team-inbox-page">
      <header className="team-inbox-header">
        <div className="team-inbox-brand">
          <span className="team-brand-mark"><Sparkles size={16} /></span>
          <div>
            <strong>Formiva Team</strong>
            <span>Inji conversations</span>
          </div>
        </div>

        <div className="team-header-meta">
          <span><i /> {activeCount} active</span>
          <span>{waitingCount} waiting</span>
          <button
            type="button"
            onClick={() => void fetchSessions(false)}
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
          </button>
          <button type="button" onClick={logout}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </header>

      <div className="team-inbox-layout">
        <aside className="team-conversation-list">
          <div className="team-list-head">
            <span>Conversations</span>
            <small>{sessions.length}</small>
          </div>

          <div className="team-list-scroll">
            {sessions.length === 0 && (
              <div className="team-empty-list">
                <CircleUserRound size={22} />
                <strong>No conversations yet</strong>
                <span>New Inji handoffs will appear here.</span>
              </div>
            )}

            {sessions.map((item) => {
              const last = [...item.messages].sort(
                (a, b) => b.timestamp - a.timestamp,
              )[0];

              return (
                <button
                  type="button"
                  key={item.sessionId}
                  className={`team-conversation-item ${
                    selectedId === item.sessionId ? "selected" : ""
                  }`}
                  onClick={() => setSelectedId(item.sessionId)}
                >
                  <span className={`team-status-dot ${item.status}`} />
                  <span className="team-conversation-copy">
                    <strong>{item.visitorName || "Visitor"}</strong>
                    <small>{item.company || "No company provided"}</small>
                    <span>{last?.text || item.question}</span>
                  </span>
                  <span className="team-conversation-side">
                    <small>{timeLabel(last?.timestamp || item.createdAt)}</small>
                    <ChevronRight size={14} />
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="team-chat-panel">
          {!selected ? (
            <div className="team-no-selection">
              <div className="team-no-selection-mark"><Sparkles size={22} /></div>
              <h2>Select a conversation</h2>
              <p>Choose a customer from the left to start helping them.</p>
            </div>
          ) : (
            <>
              <div className="team-chat-head">
                <div>
                  <div className="team-chat-name">
                    <span className={`team-status-dot ${selected.status}`} />
                    {selected.visitorName}
                  </div>
                  <span>
                    {selected.company || "No company provided"} ·{" "}
                    {selected.email || selected.phone || "No contact provided"}
                  </span>
                </div>

                <div className="team-chat-actions">
                  {selected.status === "waiting" && (
                    <button
                      type="button"
                      className="team-primary-button"
                      disabled={busy}
                      onClick={() => void takeChat()}
                    >
                      Take chat
                    </button>
                  )}

                  {selected.status === "active" && (
                    <button
                      type="button"
                      className="team-secondary-button"
                      disabled={busy}
                      onClick={() => void closeChat()}
                    >
                      <X size={14} /> Close
                    </button>
                  )}

                  {selected.status === "closed" && (
                    <span className="team-closed-pill">
                      <Check size={13} /> Closed
                    </span>
                  )}
                </div>
              </div>

              <div className="team-chat-body">
                <div className="team-question-card">
                  <small>ORIGINAL QUESTION</small>
                  <p>{selected.originalQuestion}</p>
                </div>

                {visibleMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`team-message-row ${
                      message.role === "human" ? "human" : "visitor"
                    }`}
                  >
                    <div className="team-message-bubble">
                      {message.role === "human" && (
                        <strong>
                          {message.senderName ||
                            selected.agentName ||
                            "Formiva Team"}
                        </strong>
                      )}
                      <span>{message.text}</span>
                      <time>{timeLabel(message.timestamp)}</time>
                    </div>
                  </div>
                ))}

                {selected.status === "active" && selected.customerTyping && (
                  <div className="team-customer-typing">
                    <span /><span /><span /> Customer is typing…
                  </div>
                )}
              </div>

              <form className="team-composer" onSubmit={sendMessage}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => handleInput(event.target.value)}
                  onBlur={() => {
                    if (typingTimer.current) {
                      window.clearTimeout(typingTimer.current);
                    }
                    typingState.current = false;
                    void setTyping(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder={
                    selected.status === "active"
                      ? "Write a reply…"
                      : "Take the chat to reply"
                  }
                  disabled={selected.status !== "active" || busy}
                />
                <button
                  type="submit"
                  disabled={
                    !input.trim() ||
                    selected.status !== "active" ||
                    busy
                  }
                  aria-label="Send reply"
                >
                  <Send size={17} />
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      {error && (
        <button
          type="button"
          className="team-error-toast"
          onClick={() => setError("")}
        >
          {error}
          <X size={14} />
        </button>
      )}
    </main>
  );
}
