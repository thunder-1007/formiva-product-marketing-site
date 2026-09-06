import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight, Bot, Send, Sparkles, X } from "lucide-react";
import { createPortal } from "react-dom";
import { Link } from "wouter";
import { getInjiResponse } from "./injiKnowledge";

type ContextAction = {
  label: string;
  href: string;
};

type Message = {
  role: "user" | "assistant";
  text: string;
  action?: ContextAction;
  handoffQuestion?: string;
  teamResponse?: boolean;
};

type HandoffStatus = "idle" | "sending" | "waiting" | "expired" | "error";

const welcomeSeenKey = "formiva_inji_welcome_seen";
const sessionIdKey = "formiva_inji_session_id";
const pendingHandoffKey = "formiva_inji_pending_handoff";

const suggestedQuestions = [
  "What is Formiva?",
  "How does CaseFlow work?",
  "How does AI work?",
  "Employee onboarding",
  "Features",
  "Pricing",
  "Talk to the team",
];

function createSessionId() {
  const cryptoApi = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export default function InjiAI() {
  const [open, setOpen] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const responseTimerRef = useRef<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "Hi! I'm Inji. How can I help you learn about Formiva?" }]);
  const [handoffStatus, setHandoffStatus] = useState<HandoffStatus>("idle");
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(welcomeSeenKey) !== "true") setWelcomeVisible(true);
      const storedSessionId = window.localStorage.getItem(sessionIdKey);
      sessionIdRef.current = storedSessionId || createSessionId();
      if (window.localStorage.getItem(pendingHandoffKey) === sessionIdRef.current) setHandoffStatus("waiting");
    } catch {
      setWelcomeVisible(true);
      sessionIdRef.current = createSessionId();
    }

    return () => {
      if (responseTimerRef.current !== null) window.clearTimeout(responseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open || handoffStatus !== "waiting" || !sessionIdRef.current) return;
    let stopped = false;

    const pollForReply = async () => {
      try {
        const response = await fetch(`/api/inji/reply?sessionId=${encodeURIComponent(sessionIdRef.current!)}`);
        if (!response.ok || stopped) return;
        const result = await response.json() as { status?: string; reply?: string };
        if (result.status === "replied" && result.reply) {
          stopped = true;
          setHandoffStatus("idle");
          removePendingHandoff();
          setIsResponding(true);
          responseTimerRef.current = window.setTimeout(() => {
            setMessages((current) => [...current, { role: "assistant", text: result.reply!, teamResponse: true }]);
            setIsResponding(false);
            responseTimerRef.current = null;
          }, 500);
        } else if (result.status === "expired") {
          stopped = true;
          setHandoffStatus("expired");
          removePendingHandoff();
          setMessages((current) => [...current, { role: "assistant", text: "Inji's previous team request has expired. You can send the question again." }]);
        }
      } catch {
        // Keep polling while the handoff is pending; the UI stays usable offline.
      }
    };

    void pollForReply();
    const interval = window.setInterval(() => { void pollForReply(); }, 7000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [handoffStatus, open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, isResponding]);

  function markWelcomeSeen() {
    setWelcomeVisible(false);
    try {
      window.localStorage.setItem(welcomeSeenKey, "true");
    } catch {
      // Continue without persistence when storage is unavailable.
    }
  }

  function openChat() {
    markWelcomeSeen();
    setOpen(true);
  }

  function removePendingHandoff() {
    try {
      window.localStorage.removeItem(pendingHandoffKey);
    } catch {
      // Continue when storage is unavailable.
    }
  }

  function savePendingHandoff(sessionId: string) {
    try {
      window.localStorage.setItem(pendingHandoffKey, sessionId);
    } catch {
      // Continue when storage is unavailable.
    }
  }

  async function sendToFormivaTeam(question: string) {
    if (!question || isResponding || handoffStatus === "sending" || handoffStatus === "waiting") return;
    const sessionId = sessionIdRef.current || createSessionId();
    sessionIdRef.current = sessionId;
    setHandoffStatus("sending");
    setIsResponding(true);

    let sent = false;
    try {
      const response = await fetch("/api/inji/handoff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          question,
          conversation: messages.map((message) => ({ role: message.role, content: message.text })),
        }),
      });
      const result = await response.json() as { ok?: boolean };
      sent = response.ok && result.ok === true;
    } catch {
      sent = false;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 500));
    if (sent) {
      savePendingHandoff(sessionId);
      setHandoffStatus("waiting");
      setMessages((current) => [...current, { role: "assistant", text: "I've sent your question to the Formiva team. I'll show their response here when it arrives." }]);
    } else {
      setHandoffStatus("error");
      setMessages((current) => [...current, { role: "assistant", text: "I couldn't send that to the Formiva team right now. Please try again, or use the Contact page.", action: { label: "Contact Formiva", href: "/company/contact" } }]);
    }
    setIsResponding(false);
  }

  function sendMessage(suggestedQuestion?: string) {
    const question = (suggestedQuestion ?? input).trim();
    if (!question || isResponding) return;

    setMessages((current) => [
      ...current,
      { role: "user", text: question }
    ]);
    setInput("");
    setIsResponding(true);
    responseTimerRef.current = window.setTimeout(() => {
      const response = getInjiResponse(question);
      setMessages((current) => [...current, { role: "assistant", text: response.answer, action: response.action, handoffQuestion: response.id === "fallback" ? question : undefined }]);
      setIsResponding(false);
      responseTimerRef.current = null;
    }, 650);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") sendMessage();
  }

  return createPortal(
    <>
      {welcomeVisible && !open && (
        <aside className="inji-welcome-teaser" aria-label="Inji welcome">
          <button type="button" className="inji-teaser-copy" onClick={openChat}>
            <span>Hi! I'm Inji</span>
            <strong>Need help exploring Formiva?</strong>
          </button>
          <button type="button" className="inji-teaser-action" onClick={openChat}>Ask Inji</button>
          <button type="button" className="inji-teaser-dismiss" onClick={markWelcomeSeen} aria-label="Dismiss Inji welcome">×</button>
        </aside>
      )}

      {open && (
        <section className="inji-chat" aria-label="Inji chat assistant">
          <div className="inji-header">
            <div className="inji-title">
              <div className="inji-avatar"><Bot size={18} /><Sparkles className="inji-avatar-spark" size={11} /></div>
              <div><strong>Inji</strong><span>Formiva's AI assistant</span></div>
            </div>
            <button className="inji-close" onClick={() => setOpen(false)} aria-label="Close Inji" type="button">
              <X size={19} />
            </button>
          </div>

          <div className="inji-messages" aria-live="polite">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`inji-message ${message.role === "user" ? "inji-user" : "inji-bot"} ${index === 0 ? "inji-welcome" : ""}`}>
                {message.teamResponse ? <><strong>Formiva Team:</strong><br />{message.text}</> : message.text}
                {message.action && <Link className="inji-action" href={message.action.href}>{message.action.label}<ArrowUpRight size={14} /></Link>}
                {message.handoffQuestion && <button className="inji-action inji-action-button" type="button" onClick={() => void sendToFormivaTeam(message.handoffQuestion!)} disabled={isResponding || handoffStatus === "sending" || handoffStatus === "waiting"}>Ask the Formiva Team<ArrowUpRight size={14} /></button>}
              </div>
            ))}
            {isResponding && (
              <div className="inji-message inji-bot inji-typing" role="status" aria-label="Inji is typing">
                <span>Inji</span><span className="inji-typing-dots" aria-hidden="true"><i /><i /><i /></span>
              </div>
            )}
            {handoffStatus === "waiting" && <div className="inji-handoff-status" role="status">Waiting for Formiva team...</div>}
            {messages.length === 1 && (
              <div className="inji-suggestions" aria-label="Suggested questions">
                <span>Try asking</span>
                {suggestedQuestions.map((question) => (
                  <button key={question} type="button" onClick={() => sendMessage(question)} disabled={isResponding}>{question}</button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="inji-input" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
            <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} placeholder="Ask Inji..." aria-label="Ask Inji" disabled={isResponding} />
            <button type="submit" aria-label="Send message" disabled={isResponding}><Send size={17} /></button>
          </form>
        </section>
      )}

      <button className={`inji-button ${open ? "inji-button-open" : ""}`} onClick={() => { if (open) setOpen(false); else openChat(); }} aria-label={open ? "Close Inji" : "Ask Inji"} type="button">
        {open ? <X size={22} /> : <Bot size={22} />}
        {!open && <span>Ask Inji</span>}
      </button>
    </>,
    document.body,
  );
}
