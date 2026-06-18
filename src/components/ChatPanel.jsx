// BabyWatch — in-app family chat
// Floating button (bottom-right) → slide-up panel.
// Threads: Everyone (all family), Parents only, or individual DMs.

import { useState, useEffect, useRef, useCallback } from "react";
import { C, fontSans, font } from "../lib/theme";

const FIXED_THREADS = [
  { id: "all", label: "Everyone" },
  { id: "parents", label: "Parents" },
];

function ChatBubbleIcon({ size = 22, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SendIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" fill={color} stroke="none" />
    </svg>
  );
}

export default function ChatPanel({
  user,
  members,
  familyId,
  onFetchMessages,
  onSendMessage,
  onSubscribe,
  isCloud,
}) {
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState("all");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [sendError, setSendError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  // Refs so subscription callback always reads latest values without recreating
  const openRef = useRef(open);
  const threadRef = useRef(thread);
  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { threadRef.current = thread; }, [thread]);

  // Build thread list: fixed + one chip per non-placeholder non-self member
  const threads = [
    ...FIXED_THREADS,
    ...( members || [])
      .filter((m) => m.id !== user?.id && !m.is_placeholder)
      .map((m) => ({ id: m.id, label: m.name.split(" ")[0] })),
  ];

  const activeThread = threads.find((t) => t.id === thread) || threads[0];

  const loadMessages = useCallback(async () => {
    if (!isCloud) return;
    const msgs = await onFetchMessages(thread);
    setMessages(msgs || []);
  }, [thread, onFetchMessages, isCloud]);

  // Reload when panel opens or thread changes
  useEffect(() => {
    if (!open) return;
    setHasUnread(false);
    loadMessages();
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [open, thread]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime subscription — badge when closed OR when message is on a different thread
  useEffect(() => {
    if (!isCloud || !onSubscribe) return;
    const unsub = onSubscribe((payload) => {
      const incomingThread = payload?.new?.thread || "";
      // Compute the DB-format thread key for what the user is currently viewing
      const cur = threadRef.current;
      const viewingDbThread =
        cur === "all" || cur === "parents"
          ? cur
          : "dm:" + [user?.id, cur].sort().join("-");
      const matchesCurrent = incomingThread === viewingDbThread;

      if (openRef.current && matchesCurrent) {
        loadMessages(); // refresh the thread in view
      } else {
        setHasUnread(true); // badge: panel closed, or message is on a different thread
        if (openRef.current) loadMessages(); // still refresh current thread in case sender also posts here
      }
    });
    return unsub;
  }, [isCloud]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError("");
    try {
      await onSendMessage(thread, body);
      setInput("");
      await loadMessages();
    } catch (e) {
      setSendError(e?.message || "Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Group messages by date for display
  function formatDate(iso) {
    const d = new Date(iso);
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
    if (isToday) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear()
    )
      return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // Build display items with date separators
  const displayItems = [];
  let lastDate = null;
  for (const msg of messages) {
    const d = formatDate(msg.created_at);
    if (d !== lastDate) {
      displayItems.push({ type: "date", label: d, key: "date-" + msg.id });
      lastDate = d;
    }
    displayItems.push({ type: "msg", msg });
  }

  return (
    <>
      {/* Floating chat button — only rendered when panel is closed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Family chat"
          aria-label="Open family chat"
          style={{
            position: "fixed", bottom: 24, right: 20, zIndex: 150,
            width: 54, height: 54, borderRadius: "50%",
            background: C.clay, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 18px rgba(0,0,0,0.22)",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.boxShadow = "0 6px 22px rgba(0,0,0,0.28)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 18px rgba(0,0,0,0.22)";
          }}
        >
          <ChatBubbleIcon size={22} color={C.white} />
          {hasUnread && (
            <span style={{
              position: "absolute", top: 7, right: 7,
              width: 11, height: 11, borderRadius: "50%",
              background: "#e53935", border: `2.5px solid ${C.white}`,
            }} />
          )}
        </button>
      )}

      {/* Backdrop + panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Family chat"
          style={{
            position: "fixed", inset: 0, zIndex: 160,
            background: "rgba(0,0,0,0.32)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{
            width: "100%", maxWidth: 620,
            background: C.white,
            borderRadius: "20px 20px 0 0",
            boxShadow: "0 -6px 32px rgba(0,0,0,0.16)",
            display: "flex", flexDirection: "column",
            height: "78vh", maxHeight: 620,
          }}>

            {/* Header */}
            <div style={{
              padding: "14px 16px 0",
              borderBottom: `1.5px solid ${C.softBorder}`,
              flexShrink: 0,
            }}>
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between", marginBottom: 12,
              }}>
                <span style={{
                  fontFamily: font, fontSize: 18, fontWeight: 700, color: C.warm,
                }}>
                  Family Chat
                </span>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    background: C.sand, border: "none", borderRadius: 20,
                    padding: "5px 14px", fontFamily: fontSans, fontSize: 12,
                    fontWeight: 700, color: C.textMuted, cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>

              {/* Thread selector chips */}
              <div style={{
                display: "flex", gap: 6, flexWrap: "nowrap",
                overflowX: "auto", paddingBottom: 10,
                scrollbarWidth: "none",
              }}>
                {threads.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setThread(t.id)}
                    style={{
                      flexShrink: 0,
                      padding: "6px 14px", borderRadius: 20, border: "none",
                      cursor: "pointer", fontFamily: fontSans, fontSize: 12,
                      fontWeight: 700, whiteSpace: "nowrap",
                      background: thread === t.id ? C.clay : C.sand,
                      color: thread === t.id ? C.white : C.warm,
                      transition: "background 0.12s",
                    }}
                  >
                    {t.id === "all" ? "👨‍👩‍👧 Everyone" : t.id === "parents" ? "👪 Parents" : t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message list */}
            <div style={{
              flex: 1, overflowY: "auto", padding: "10px 14px 6px",
              display: "flex", flexDirection: "column", gap: 4,
            }}>
              {!isCloud && (
                <div style={{
                  fontFamily: fontSans, fontSize: 13, color: C.textMuted,
                  textAlign: "center", margin: "auto", padding: "32px 20px", lineHeight: 1.6,
                }}>
                  Chat requires cloud sync.<br />
                  Set up your Supabase connection to use family chat.
                </div>
              )}
              {isCloud && displayItems.length === 0 && (
                <div style={{
                  fontFamily: fontSans, fontSize: 13, color: C.textMuted,
                  textAlign: "center", margin: "auto", padding: "32px 20px", lineHeight: 1.6,
                }}>
                  No messages yet in <strong>{activeThread?.label}</strong>.<br />
                  Say hi! 👋
                </div>
              )}

              {displayItems.map((item) => {
                if (item.type === "date") {
                  return (
                    <div key={item.key} style={{
                      textAlign: "center", fontFamily: fontSans, fontSize: 11,
                      color: C.textMuted, margin: "10px 0 4px", fontWeight: 600,
                    }}>
                      {item.label}
                    </div>
                  );
                }
                const { msg } = item;
                const isMe = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex", flexDirection: "column",
                      alignItems: isMe ? "flex-end" : "flex-start",
                      marginBottom: 2,
                    }}
                  >
                    {!isMe && (
                      <div style={{
                        fontFamily: fontSans, fontSize: 11, color: C.textMuted,
                        marginBottom: 2, marginLeft: 4, fontWeight: 600,
                      }}>
                        {msg.sender_name}
                      </div>
                    )}
                    <div style={{
                      maxWidth: "76%",
                      background: isMe ? C.clay : C.sand,
                      color: isMe ? C.white : C.warm,
                      borderRadius: isMe
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                      padding: "9px 14px",
                      fontFamily: fontSans, fontSize: 14, lineHeight: 1.45,
                      wordBreak: "break-word",
                    }}>
                      {msg.body}
                    </div>
                    <div style={{
                      fontFamily: fontSans, fontSize: 10, color: C.textMuted,
                      marginTop: 2,
                      [isMe ? "marginRight" : "marginLeft"]: 4,
                    }}>
                      {formatTime(msg.created_at)}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Send error */}
            {sendError && (
              <div style={{
                padding: "6px 14px", background: "#fdecea",
                fontFamily: fontSans, fontSize: 12, color: "#b71c1c",
                flexShrink: 0,
              }}>
                {sendError}
              </div>
            )}

            {/* Input bar */}
            {isCloud && (
              <div style={{
                padding: "10px 12px 18px",
                borderTop: `1.5px solid ${C.softBorder}`,
                display: "flex", gap: 8, alignItems: "flex-end",
                flexShrink: 0,
              }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${activeThread?.label || "family"}…`}
                  rows={1}
                  style={{
                    flex: 1, resize: "none", overflowY: "hidden",
                    border: `1.5px solid ${C.softBorder}`,
                    borderRadius: 14, padding: "10px 13px",
                    fontFamily: fontSans, fontSize: 14, color: C.warm,
                    background: C.cream, outline: "none", lineHeight: 1.4,
                    maxHeight: 90,
                  }}
                  onInput={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 90) + "px";
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  title="Send"
                  style={{
                    width: 42, height: 42, borderRadius: "50%", border: "none",
                    background: input.trim() && !sending ? C.clay : C.sand,
                    color: input.trim() && !sending ? C.white : C.textMuted,
                    cursor: input.trim() && !sending ? "pointer" : "default",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, transition: "background 0.15s",
                  }}
                >
                  <SendIcon size={15} color={input.trim() && !sending ? C.white : C.textMuted} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
