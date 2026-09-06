import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { createPortal } from "react-dom";
import { getInjiResponse } from "./injiKnowledge";

type Message = { id: string; role: "user" | "assistant" | "human"; text: string; timestamp: number; agentName?: string };
type Status = "idle" | "lead_form" | "transferring" | "waiting" | "active" | "feedback" | "expired";

const welcomeKey = "formiva_inji_welcome_seen";
const sessionKey = "formiva_inji_session_id";
const handoffKey = "formiva_inji_pending_handoff";
const suggestions = ["What is Formiva?", "How does CaseFlow work?", "How does AI work?", "Employee onboarding", "Features", "Pricing", "Talk to the team"];
const ratings = [["😞", "Very dissatisfied"], ["😕", "Dissatisfied"], ["😐", "Neutral"], ["🙂", "Satisfied"], ["😍", "Very satisfied"]] as const;
const createId = (prefix = "local") => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
const initialMessages = (): Message[] => [{ id: "welcome", role: "assistant", text: "Hi! I'm Inji. How can I help you learn about Formiva?", timestamp: 0 }];

export default function InjiAI() {
  const [open, setOpen] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [input, setInput] = useState("");
  const [responding, setResponding] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [handoffQuestion, setHandoffQuestion] = useState("");
  const [agentName, setAgentName] = useState("");
  const [typing, setTyping] = useState(false);
  const [ending, setEnding] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [lead, setLead] = useState({ name: "", company: "", phone: "", email: "" });
  const [leadError, setLeadError] = useState("");
  const [feedback, setFeedback] = useState({ rating: 0, text: "", submitting: false, error: "", thankYou: false });
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const session = useRef("");
  const timer = useRef<number | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const restoredSession = useRef(false);

  const add = (role: Message["role"], text: string) => {
    setMessages((current) => [...current, { id: createId(), role, text, timestamp: Date.now() }]);
  };

  function clearStoredSession() {
    try {
      localStorage.removeItem(handoffKey);
      localStorage.removeItem(sessionKey);
    } catch {
      /* storage is optional */
    }
  }

  function resetConversation() {
    if (timer.current) clearTimeout(timer.current);
    clearStoredSession();
    session.current = createId("session");
    try { localStorage.setItem(sessionKey, session.current); } catch { /* storage is optional */ }
    restoredSession.current = false;
    setStatus("idle");
    setMessages(initialMessages());
    setInput("");
    setResponding(false);
    setHandoffQuestion("");
    setAgentName("");
    setTyping(false);
    setEnding(false);
    setShowEndConfirm(false);
    setLead({ name: "", company: "", phone: "", email: "" });
    setLeadError("");
    setFeedback({ rating: 0, text: "", submitting: false, error: "", thankYou: false });
  }

  useEffect(() => {
    try {
      setWelcome(localStorage.getItem(welcomeKey) !== "true");
      const stored = localStorage.getItem(sessionKey);
      const pending = localStorage.getItem(handoffKey);
      session.current = stored || createId("session");
      if (!stored) localStorage.setItem(sessionKey, session.current);
      restoredSession.current = pending === session.current;
      if (restoredSession.current) setStatus("waiting");
    } catch {
      session.current = createId("session");
      setWelcome(true);
    }
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, status, typing, responding]);

  useEffect(() => {
    if (!open || !["waiting", "active"].includes(status) || !session.current) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(`/api/inji/reply?sessionId=${encodeURIComponent(session.current)}`, { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = await response.json() as {
          status?: "waiting" | "active" | "closed" | "expired" | "not_found";
          messages?: Message[];
          agentName?: string;
          isTyping?: boolean;
        };
        if (cancelled || !data.status) return;

        if (["closed", "expired", "not_found"].includes(data.status)) {
          if (restoredSession.current) resetConversation();
          else {
            clearStoredSession();
            setTyping(false);
            setShowEndConfirm(false);
            setStatus("feedback");
          }
          return;
        }

        restoredSession.current = false;
        if (data.status === "active") setStatus("active");
        if (data.agentName) setAgentName(data.agentName);
        setTyping(Boolean(data.isTyping) && data.status === "active");

        if (data.messages) {
          setMessages((current) => {
            const merged = new Map(current.map((message) => [message.id, message]));
            data.messages!.forEach((message) => merged.set(message.id, { ...message, agentName: data.agentName || message.agentName }));
            return Array.from(merged.values()).sort((a, b) => a.timestamp - b.timestamp);
          });
        }
      } catch {
        /* retry on next poll */
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 2500);
    return () => { cancelled = true; clearInterval(interval); };
  }, [open, status]);

  const markSeen = () => {
    setWelcome(false);
    try { localStorage.setItem(welcomeKey, "true"); } catch { /* storage is optional */ }
  };

  function beginHandoff(question: string) {
    setHandoffQuestion(question);
    setStatus("lead_form");
    add("assistant", "Let's connect you with the Formiva Team\n\nI can connect you with a member of our team. Just a few details first.");
  }

  async function submitLead(event: React.FormEvent) {
    event.preventDefault();
    const name = lead.name.trim();
    const email = lead.email.trim();
    const phone = lead.phone.trim();

    if (!name) return setLeadError("Please enter your name.");
    if (!phone && !email) return setLeadError("Add a contact number or business email.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setLeadError("Enter a valid business email.");
    if (phone && !/^[+()\-\s\d]{7,25}$/.test(phone)) return setLeadError("Enter a valid contact number.");

    setLeadError("");
    setStatus("transferring");

    try {
      const response = await fetch("/api/inji/handoff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: session.current,
          question: handoffQuestion,
          details: { name, company: lead.company.trim(), email, phone },
          conversation: messages.map((message) => ({ role: message.role === "human" ? "assistant" : message.role, content: message.text })),
        }),
      });
      if (!response.ok) throw new Error();
      try { localStorage.setItem(handoffKey, session.current); } catch { /* storage is optional */ }
      add("assistant", "Transferring you to a member of the Formiva Team…");
      setStatus("waiting");
    } catch {
      setStatus("lead_form");
      setLeadError("We couldn't connect you right now. Please try again.");
    }
  }

  function endChat() {
    if (!ending) setShowEndConfirm(true);
  }

  async function confirmEndChat() {
    if (ending) return;
    setEnding(true);
    try {
      const response = await fetch("/api/inji/close", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: session.current }),
      });
      if (!response.ok) throw new Error();
      clearStoredSession();
      setTyping(false);
      setShowEndConfirm(false);
      setStatus("feedback");
    } catch {
      setEnding(false);
    }
  }

  async function submitFeedback() {
    if (!feedback.rating || feedback.submitting) return;
    setFeedback((current) => ({ ...current, submitting: true, error: "" }));
    try {
      const response = await fetch("/api/inji/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: session.current, rating: feedback.rating, feedback: feedback.text }),
      });
      if (!response.ok) throw new Error();
      setFeedback((current) => ({ ...current, submitting: false, thankYou: true }));
      timer.current = window.setTimeout(resetConversation, 1400);
    } catch {
      setFeedback((current) => ({ ...current, submitting: false, error: "We couldn't submit your feedback. Please try again." }));
    }
  }

  function send(question = input) {
    const text = question.trim();
    if (!text || responding || ["lead_form", "transferring", "waiting", "feedback"].includes(status)) return;
    setInput("");

    if (status === "active") {
      const messageId = createId("visitor");
      setMessages((current) => [...current, { id: messageId, role: "user", text, timestamp: Date.now() }]);
      void fetch("/api/inji/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: session.current, message: text, messageId }),
      });
      return;
    }

    add("user", text);
    setResponding(true);
    timer.current = window.setTimeout(() => {
      const answer = getInjiResponse(text);
      add("assistant", answer.answer);
      if (answer.id === "fallback") beginHandoff(text);
      setResponding(false);
      timer.current = null;
    }, 650);
  }

  const disabled = responding || ["lead_form", "transferring", "waiting", "feedback"].includes(status);

  return createPortal(
    <>
      {welcome && !open && (
        <aside className="inji-welcome-teaser" aria-label="Inji welcome">
          <button type="button" className="inji-teaser-copy" onClick={() => { markSeen(); setOpen(true); }}>
            <span>Hi! I'm Inji</span>
            <strong>Need help exploring Formiva?</strong>
          </button>
          <button type="button" className="inji-teaser-action" onClick={() => { markSeen(); setOpen(true); }}>Ask Inji</button>
          <button type="button" className="inji-teaser-dismiss" onClick={markSeen} aria-label="Dismiss Inji welcome">×</button>
        </aside>
      )}

      {open && (
        <section className="inji-chat" aria-label="Inji chat assistant">
          <div className="inji-header">
            <div className="inji-title">
              <div className="inji-avatar"><Bot size={18} /><Sparkles className="inji-avatar-spark" size={11} /></div>
              <div><strong>Inji</strong><span>Formiva's AI assistant</span></div>
            </div>
            <button className="inji-close" onClick={() => setOpen(false)} aria-label="Close Inji" type="button"><X size={19} /></button>
          </div>

          <div className="inji-messages" aria-live="polite">
            {messages.map((message, index) => (
              <div key={message.id} className={`inji-message ${message.role === "user" ? "inji-user" : "inji-bot"} ${index === 0 ? "inji-welcome" : ""}`}>
                {message.role === "human" && <><strong>Formiva Team · {message.agentName || agentName || "Team"}</strong><br /></>}
                {message.text}
              </div>
            ))}

            {status === "lead_form" && (
              <form className="inji-lead-form" onSubmit={submitLead}>
                <strong>Let's connect you with the Formiva Team</strong>
                <p>I can connect you with a member of our team. Just a few details first.</p>
                <label>Your name *<input value={lead.name} onChange={(event) => setLead({ ...lead, name: event.target.value })} autoComplete="name" /></label>
                <label>Company name<input value={lead.company} onChange={(event) => setLead({ ...lead, company: event.target.value })} autoComplete="organization" /></label>
                <label>Contact number<input value={lead.phone} onChange={(event) => setLead({ ...lead, phone: event.target.value })} inputMode="tel" autoComplete="tel" /></label>
                <label>Business email<input value={lead.email} onChange={(event) => setLead({ ...lead, email: event.target.value })} type="email" autoComplete="email" /></label>
                <small>Your details will be shared with the Formiva Team for this conversation.</small>
                {leadError && <p className="inji-form-error" role="alert">{leadError}</p>}
                <button type="submit">Connect me with the team</button>
              </form>
            )}

            {status === "waiting" && <div className="inji-handoff-status" role="status">Your question and details have been sent to the team. I'll show their response here.<br /><b>Waiting for Formiva Team…</b></div>}

            {status === "active" && (
              <>
                <div className="inji-human-controls">
                  <div className="inji-connected-status"><span className="inji-connected-dot" />Connected with <strong>{agentName || "the Formiva Team"}</strong></div>
                  <button type="button" className="inji-end-chat-button" onClick={endChat} disabled={ending}>{ending ? "Ending…" : "End Chat"}</button>
                </div>

                {showEndConfirm && (
                  <div className="inji-end-confirm">
                    <div className="inji-end-confirm-icon">×</div>
                    <div className="inji-end-confirm-content">
                      <strong>End this conversation?</strong>
                      <p>Your conversation with the Formiva Team will be closed.</p>
                      <div className="inji-end-confirm-actions">
                        <button type="button" className="inji-end-cancel" onClick={() => setShowEndConfirm(false)} disabled={ending}>Keep chatting</button>
                        <button type="button" className="inji-end-confirm-button" onClick={() => void confirmEndChat()} disabled={ending}>{ending ? "Ending…" : "End conversation"}</button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {typing && <div className="inji-agent-typing" role="status"><span className="inji-live-dot" />{agentName || "Formiva Team"} is typing…</div>}

            {status === "feedback" && (
              <div className="inji-feedback-form">
                {feedback.thankYou ? (
                  <><strong>Thanks for your feedback!</strong><p>You can start a new conversation whenever you're ready.</p></>
                ) : (
                  <>
                    <strong>Thanks for chatting with the Formiva Team!</strong>
                    <p>How was your experience?</p>
                    <div className="inji-rating" aria-label="Rating">
                      {ratings.map(([emoji, label], index) => (
                        <button type="button" key={label} aria-label={label} aria-pressed={feedback.rating === index + 1} className={feedback.rating === index + 1 ? "active" : ""} onClick={() => setFeedback((current) => ({ ...current, rating: index + 1 }))}>{emoji}</button>
                      ))}
                    </div>
                    <label>Tell us how we did (optional)<textarea maxLength={1000} value={feedback.text} onChange={(event) => setFeedback((current) => ({ ...current, text: event.target.value }))} /></label>
                    {feedback.error && <p className="inji-form-error" role="alert">{feedback.error}</p>}
                    <div className="inji-feedback-actions">
                      <button type="button" disabled={!feedback.rating || feedback.submitting} onClick={() => void submitFeedback()}>{feedback.submitting ? "Submitting…" : "Submit feedback"}</button>
                      <button type="button" className="inji-text-button" onClick={resetConversation}>Skip feedback</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {responding && <div className="inji-message inji-bot inji-typing" role="status"><span>Inji</span><span className="inji-typing-dots" aria-hidden="true"><i /><i /><i /></span></div>}
            {messages.length === 1 && status === "idle" && <div className="inji-suggestions" aria-label="Suggested questions"><span>Try asking</span>{suggestions.map((question) => <button key={question} type="button" onClick={() => send(question)} disabled={responding}>{question}</button>)}</div>}
            <div ref={end} />
          </div>

          <form className="inji-input" onSubmit={(event) => { event.preventDefault(); send(); }}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={status === "active" ? "Message the Formiva Team…" : "Ask Inji…"} aria-label="Chat message" disabled={disabled} />
            <button type="submit" aria-label="Send message" disabled={disabled}><Send size={17} /></button>
          </form>
        </section>
      )}

      <button className={`inji-button ${open ? "inji-button-open" : ""}`} onClick={() => open ? setOpen(false) : (markSeen(), setOpen(true))} aria-label={open ? "Close Inji" : "Ask Inji"} type="button">
        {open ? <X size={22} /> : <Bot size={22} />}
        {!open && <span>Ask Inji</span>}
      </button>
    </>,
    document.body,
  );
}
