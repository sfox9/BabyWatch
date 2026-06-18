// BabyWatch â in-app family chat
// Opens to an inbox showing the latest message per thread (sorted newest-first).
// Tap a thread to read it; back button returns to inbox.
// Red dots on inbox rows + thread chips indicate unread messages from others.

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

function BackIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export default function ChatPanel({
  user,
  members,
  familyId,
  onFetchMessages,
  onFetchInbox,
  onSendMessage,
  onSubscribe,
  isCloud,
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("inbox"); // "inbox" | "thread"
  const [thread, setThread] = useState("all");
  const [messages, setMessages] = useState([]);
  const [inboxItems, setInboxItems] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [unreadThreads, setUnreadThreads] = useState(new Set()); // DB thread keys
  const [sendError, setSendError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  // Refs for stale-closure-safe subscription
  const openRef = useRef(open);
  const viewRef = useRef(view);
  const threadRef = useRef(thread);
  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { threadRef.current = thread; }, [thread]);

  // All thread definitions (fixed + one per non-self non-placeholder member)
  const threads = [
    ...FIXED_THREADS,
    ...(members || [])
      .filter((m) => m.id !== user?.id && !m.is_placeholder)
      .map((m) => ({ id: m.id, label: m.name.split(" ")[0] })),
  ];

  // Convert UI thread ID â DB thread key
  function toDbThread(t) {
    if (t === "all" || t === "parents") return t;
    return "dm:" + [user?.id, t].sort().join("-");
  }

  // Convert DB thread key â UI thread ID
  function fromDbThread(dbThread) {
    if (dbThread === "all" || dbThread === "parents") return dbThread;
    if (dbThread.startsWith("dm:")) {
      const rest = dbThread.slice(3);
      const uuid1 = rest.slice(0, 36);
      const uuid2 = rest.slice(37);
      return uuid1 === user?.id ? uuid2 : uuid1;
    }
    return dbThread;
  }

  // Human-readable label for a DB thread key
  function threadLabel(dbThread) {
    if (dbThread === "all") return "ð¨âð©âð§ Everyone";
    if (dbThread === "parents") return "ðª Parents";
    if (dbThread.startsWith("dm:")) {
      const otherId = fromDbThread(dbThread);
      const member = (members || []).find((m) => m.id === otherId);
      return member?.name || "DM";
    }
    return dbThread;
  }

  // ââ data loaders ââââââââââââââââââââââââââââââââââââââââââââââ

  const loadInbox = useCallback(async () => {
    if (!isCloud || !onFetchInbox) return;
    const items = await onFetchInbox();
    setInboxItems(items || []);
  }, [isCloud, onFetchInbox]);

  const loadMessages = useCallback(async () => {
    if (!isCloud) return;
    const msgs = await onFetchMessages(thread);
    setMessages(msgs || []);
  }, [thread, onFetchMessages, isCloud]);

  // ââ panel open â land on inbox ââââââââââââââââââââââââââââââââ

  useEffect(() => {
    if (!open) return;
    setView("inbox");
    setHasUnread(false);
    loadInbox();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ââ entering a thread â load messages + clear its unread dot â

  useEffect(() => {
    if (!open || view !== "thread") return;
    loadMessages();
    setTimeout(() => inputRef.current?.focus(), 80);
    const dbThread = toDbThread(thread);
    setUnreadThreads((prev) => {
      const next = new Set(prev);
      next.delete(dbThread);
      return next;
    });
  }, [open, view, thread]); // eslint-disable-line react-hooks/exhaustive-deps

  // ââ realtime subscription âââââââââââââââââââââââââââââââââââââ

  useEffect(() => {
    if (!isCloud || !onSubscribe) return;
    const unsub = onSubscribe((payload) => {
      const incomingThread = payload?.new?.thread || "";
      const isFromMe = payload?.new?.sender_id === user?.id;

      // Privacy: ignore DMs between other users that don't include the current user
      if (incomingThread.startsWith("dm:") && !incomingThread.includes(user?.id)) return;

      if (!isFromMe) {
        setHasUnread(true);
        setUnreadThreads((prev) => new Set([...prev, incomingThread]));
        // Refresh inbox if it's currently showing
        if (openRef.current && viewRef.current === "inbox") loadInbox();
      }

      // Refresh thread messages if currently viewing this thread
      const viewingDbThread = toDbThread(threadRef.current);
      if (openRef.current && viewRef.current === "thread" && incomingThread === viewingDbThread) {
        loadMessages();
      }
    });
    return unsub;
  }, [isCloud]); // eslint-disable-line react-hooks/exhaustive-deps

  // ââ auto-scroll âââââââââââââââââââââââââââââââââââââââââââââââ

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ââ send ââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // ââ helpers âââââââââââââââââââââââââââââââââââââââââââââââââââ

  function formatDate(iso) {
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    if (isToday) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function relativeTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  // Build display items with date separators for thread view
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

  const activeThread = threads.find((t) => t.id === thread) || threads[0];

  // ââ render ââââââââââââââââââââââââââââââââââââââââââââââââââââ

  return (
    <>
      {/* Floating chat button â only when panel is closed */}
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
            height: "82vh", maxHeight: 660,
          }}>

            {/* ââ Header ââ */}
            <div style={{
              padding: "14px 16px 0",
              borderBottom: `1.5px solid ${C.softBorder}`,
              flexShrink: 0,
            }}>
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between", marginBottom: 12,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {view === "thread" && (
                    <button
                      onClick={() => { setView("inbox"); loadInbox(); }}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        padding: "4px 6px 4px 2px", borderRadius: 8,
                        display: "flex", alignItems: "center", color: C.clay,
                      }}
                      title="Back to inbox"
                    >
                      <BackIcon size={18} color={C.clay} />
                    </button>
                  )}
                  <span style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: C.warm }}>
                    {view === "inbox" ? "Family Chat" : (
                      activeThread?.id === "all" ? "ð¨âð©âð§ Everyone"
                      : activeThread?.id === "parents" ? "ðª Parents"
                      : activeThread?.label
                    )}
                  </span>
                </div>
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

              {/* Thread chips â only in thread view */}
              {view === "thread" && (
                <div style={{
                  display: "flex", gap: 6, flexWrap: "nowrap",
                  overflowX: "auto", paddingBottom: 10,
                  scrollbarWidth: "none",
                }}>
                  {threads.map((t) => {
                    const dbT = toDbThread(t.id);
                    const isUnread = unreadThreads.has(dbT);
                    return (
                      <button
                        key={t.id}
                        onClick={() => setThread(t.id)}
                        style={{
                          flexShrink: 0, position: "relative",
                          padding: "6px 14px", borderRadius: 20, border: "none",
                          cursor: "pointer", fontFamily: fontSans, fontSize: 12,
                          fontWeight: 700, whiteSpace: "nowrap",
                          background: thread === t.id ? C.clay : C.sand,
                          color: thread === t.id ? C.white : C.warm,
                          transition: "background 0.12s",
                        }}
                      >
                        {t.id === "all" ? "ð¨âð©âð§ Everyone" : t.id === "parents" ? "ðª Parents" : t.label}
                        {isUnread && (
                          <span style={{
                            position: "absolute", top: 3, right: 3,
                            width: 8, height: 8, borderRadius: "50%",
                            background: "#e53935", border: `2px solid ${thread === t.id ? C.clay : C.sand}`,
                          }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ââ Inbox view ââ */}
            {view === "inbox" && (
              <div style={{ flex: 1, overflowY: "auto" }}>
                {!isCloud && (
                  <div style={{
                    fontFamily: fontSans, fontSize: 13, color: C.textMuted,
                    textAlign: "center", margin: "auto", padding: "32px 20px", lineHeight: 1.6,
                  }}>
                    Chat requires cloud sync.
                  </div>
                )}
                {isCloud && inboxItems.length === 0 && (
                  <div style={{
                    fontFamily: fontSans, fontSize: 13, color: C.textMuted,
                    textAlign: "center", padding: "40px 20px", lineHeight: 1.6,
                  }}>
                    No messages yet. Start a conversation below!
                  </div>
                )}
                {isCloud && inboxItems.length > 0 && inboxItems.map((item) => {
                  const isUnread = unreadThreads.has(item.thread);
                  const uiThread = fromDbThread(item.thread);
                  return (
                    <button
                      key={item.thread}
                      onClick={() => { setThread(uiThread); setView("thread"); }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center",
                        gap: 12, padding: "13px 16px",
                        background: isUnread ? `${C.cream}` : "transparent",
                        border: "none", borderBottom: `1px solid ${C.softBorder}`,
                        cursor: "pointer", textAlign: "left",
                      }}
                    >
                      {/* Unread dot */}
                      <div style={{ width: 10, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                        {isUnread && (
                          <span style={{
                            width: 10, height: 10, borderRadius: "50%",
                            background: "#e53935", display: "inline-block",
                          }} />
                        )}
                      </div>
                      {/* Thread info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: fontSans, fontSize: 13, fontWeight: isUnread ? 700 : 600,
                          color: C.warm, marginBottom: 3,
                        }}>
                          {threadLabel(item.thread)}
                        </div>
                        <div style={{
                          fontFamily: fontSans, fontSize: 12,
                          color: isUnread ? C.warm : C.textMuted,
                          fontWeight: isUnread ? 600 : 400,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {item.sender_id === user?.id ? "You" : item.sender_name}: {item.body}
                        </div>
                      </div>
                      {/* Time */}
                      <div style={{
                        fontFamily: fontSans, fontSize: 11, color: C.textMuted,
                        flexShrink: 0, alignSelf: "flex-start", marginTop: 1,
                      }}>
                        {relativeTime(item.created_at)}
                      </div>
                    </button>
                  );
                })}
                {/* Quick-start buttons for threads with no messages yet */}
                {isCloud && (
                  <div style={{ padding: "12px 16px 8px" }}>
                    <div style={{
                      fontFamily: fontSans, fontSize: 11, color: C.textMuted,
                      fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>
                      New message
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {threads.map((t) => {
                        const dbT = toDbThread(t.id);
                        const alreadyShown = inboxItems.some(i => i.thread === dbT);
                        if (alreadyShown) return null;
                        return (
                          <button
                            key={t.id}
                            onClick={() => { setThread(t.id); setView("thread"); }}
                            style={{
                              padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${C.softBorder}`,
                              background: "transparent", cursor: "pointer",
                              fontFamily: fontSans, fontSize: 12, fontWeight: 600, color: C.warm,
                            }}
                          >
                            {t.id === "all" ? "ð¨âð©âð§ Everyone" : t.id === "parents" ? "ðª Parents" : t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ââ Thread view ââ */}
            {view === "thread" && (
              <>
                {/* Message list */}
                <div style={{
                  flex: 1, overflowY: "auto", padding: "10px 14px 6px",
                  display: "flex", flexDirection: "column", gap: 4,
                }}>
                  {isCloud && displayItems.length === 0 && (
                    <div style={{
                      fontFamily: fontSans, fontSize: 13, color: C.textMuted,
                      textAlign: "center", margin: "auto", padding: "32px 20px", lineHeight: 1.6,
                    }}>
                      No messages yet in <strong>{activeThread?.label}</strong>.<br />
                      Say hi! ð
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
                      <div key={msg.id} style={{
                        display: "flex", flexDirection: "column",
                        alignItems: isMe ? "flex-end" : "flex-start",
                        marginBottom: 2,
                      }}>
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
                          borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
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
                    padding: "10px 12px max(18px, env(safe-area-inset-bottom, 18px))",
                    borderTop: `1.5px solid ${C.softBorder}`,
                    display: "flex", gap: 8, alignItems: "flex-end",
                    flexShrink: 0,
                  }}>
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Message ${activeThread?.label || "family"}â¦`}
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
