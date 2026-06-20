// BabyWatch — in-app family chat
// Opens to an inbox showing the latest message per thread (sorted newest-first).
// Tap a thread to read it; back button returns to inbox.
// Tap the pencil icon to compose — type a name in the "To:" field to pick a recipient.
// Red dots on inbox rows indicate unread messages from others.

import { useState, useEffect, useRef, useCallback } from "react";
import { C, fontSans, font } from "../lib/theme";

// Emoji as Unicode escapes — avoids UTF-8 mojibake in JSX source files
const _UNUSED_EMO_ALL = "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67"; // man+woman+girl family
const _UNUSED_EMO_PARENTS = "\uD83D\uDC6A"; // family emoji

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

function PencilIcon({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

// Three-person "group" icon for the Everyone thread — a calmer, line-art
// stand-in for the family emoji, matching the app's outlined icon style.
function PeopleIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7.5" r="3" />
      <path d="M6.5 20v-0.8a5.5 5.5 0 0 1 11 0V20" />
      <circle cx="4.5" cy="10.2" r="2.1" />
      <path d="M1.5 20v-0.6a3.4 3.4 0 0 1 4.6-3.2" />
      <circle cx="19.5" cy="10.2" r="2.1" />
      <path d="M22.5 20v-0.6a3.4 3.4 0 0 0 -4.6-3.2" />
    </svg>
  );
}

// Two-person "parents" icon (with a small heart) — a calmer, line-art
// stand-in for the family emoji, matching the app's outlined icon style.
function ParentsIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.3" cy="7" r="2.7" />
      <path d="M2.3 20v-0.8a4.6 4.6 0 0 1 9.2 0V20" />
      <circle cx="16.3" cy="6" r="3" />
      <path d="M11 20v-0.9a5.3 5.3 0 0 1 10.5 0V20" />
      <g transform="translate(6.55 11) scale(0.44)" strokeWidth="4">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </g>
    </svg>
  );
}

// Wraps a plain-text thread label with the matching icon whenever it's
// exactly "Everyone" or "Parents", so every render site (header, inbox
// rows, compose picker) gets the icon for free without duplicating the
// check everywhere.
function renderEveryoneAware(label, opts = {}) {
  if (label !== "Everyone" && label !== "Parents") return label;
  const { size = 14, color = "currentColor" } = opts;
  const Icon = label === "Everyone" ? PeopleIcon : ParentsIcon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <Icon size={size} color={color} />
      {label}
    </span>
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
  const [view, setView] = useState("inbox"); // "inbox" | "thread" | "compose"
  const [thread, setThread] = useState("all");
  const [messages, setMessages] = useState([]);
  const [inboxItems, setInboxItems] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [unreadThreads, setUnreadThreads] = useState(new Set()); // DB thread keys
  const [sendError, setSendError] = useState("");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState([]); // chips in compose, before starting a chat
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const composeInputRef = useRef(null);
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

  // Convert UI thread id (string "all"/"parents", a single member id, or an
  // array of member ids for a DM/group) -> DB thread key. The key is a sorted,
  // dash-joined list of every participant's id (including the current user),
  // so a given set of people always maps to the same thread regardless of
  // who started it or the order they were picked in.
  function toDbThread(t) {
    if (t === "all" || t === "parents") return t;
    const ids = Array.isArray(t) ? t : [t];
    return "dm:" + [user?.id, ...ids].sort().join("-");
  }

  // Convert DB thread key -> UI thread id. For "dm:" keys this returns an
  // array of the *other* participants' ids (every 36-char id chunk except
  // the current user's).
  function fromDbThread(dbThread) {
    if (dbThread === "all" || dbThread === "parents") return dbThread;
    if (dbThread.startsWith("dm:")) {
      const rest = dbThread.slice(3);
      const ids = [];
      for (let i = 0; i < rest.length; i += 37) ids.push(rest.slice(i, i + 36));
      return ids.filter((id) => id !== user?.id);
    }
    return dbThread;
  }

  // Human-readable label for a UI thread id (string or array of member ids)
  function labelForThread(t) {
    if (t === "all") return "Everyone";
    if (t === "parents") return "Parents";
    const ids = Array.isArray(t) ? t : [t];
    const names = ids.map((id) => (members || []).find((m) => m.id === id)?.name?.split(" ")[0] || "Someone");
    return names.join(", ") || "DM";
  }

  // Human-readable label for a DB thread key (used in the inbox list)
  function threadLabel(dbThread) {
    if (dbThread === "all") return "Everyone";
    if (dbThread === "parents") return "Parents";
    if (dbThread.startsWith("dm:")) return labelForThread(fromDbThread(dbThread));
    return dbThread;
  }

  // Open a conversation by UI thread id (string or array of member ids),
  // switching to thread view
  function openThread(id) {
    setThread(id);
    setView("thread");
    setRecipientQuery("");
    setSelectedRecipients([]);
  }

  // Add a recipient to the in-progress compose selection, or — for the fixed
  // Everyone/Parents groups, when nothing else is selected yet — open that
  // thread immediately, same as before.
  function pickRecipient(t) {
    if ((t.id === "all" || t.id === "parents")) {
      if (selectedRecipients.length === 0) openThread(t.id);
      return;
    }
    setSelectedRecipients((prev) => (prev.some((r) => r.id === t.id) ? prev : [...prev, t]));
    setRecipientQuery("");
    composeInputRef.current?.focus();
  }

  function removeRecipient(id) {
    setSelectedRecipients((prev) => prev.filter((r) => r.id !== id));
  }

  // Start a DM (1 person) or group chat (2+) from the selected compose chips
  function startChatWithSelected() {
    if (selectedRecipients.length === 0) return;
    openThread(selectedRecipients.map((r) => r.id));
  }

  // — data loaders —

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

  // Keep the latest loaders in refs so the long-lived realtime subscription
  // (below) always calls the current version instead of the one captured
  // when it first subscribed — otherwise it stays bound to whatever thread
  // was active on mount and overwrites the message list with that thread's
  // messages every time a new message arrives.
  const loadMessagesRef = useRef(loadMessages);
  const loadInboxRef = useRef(loadInbox);
  useEffect(() => { loadMessagesRef.current = loadMessages; }, [loadMessages]);
  useEffect(() => { loadInboxRef.current = loadInbox; }, [loadInbox]);

  // — panel open -> land on inbox —

  useEffect(() => {
    if (!open) return;
    setView("inbox");
    setHasUnread(false);
    setRecipientQuery("");
    setSelectedRecipients([]);
    loadInbox();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // — entering compose -> focus the recipient input —

  useEffect(() => {
    if (!open || view !== "compose") return;
    setTimeout(() => composeInputRef.current?.focus(), 80);
  }, [open, view]);

  // — entering a thread -> load messages + clear its unread dot —

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

  // — realtime subscription —

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
        if (openRef.current && viewRef.current === "inbox") loadInboxRef.current();
      }

      // Refresh thread messages if currently viewing this thread
      const viewingDbThread = toDbThread(threadRef.current);
      if (openRef.current && viewRef.current === "thread" && incomingThread === viewingDbThread) {
        loadMessagesRef.current();
      }
    });
    return unsub;
  }, [isCloud]); // eslint-disable-line react-hooks/exhaustive-deps

  // — auto-scroll —

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // — send —

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

  // — helpers —

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

  // Display label for whichever thread is currently open — JSX version (with
  // the people icon for Everyone) for headings/empty-states, and a plain-text
  // version for places that can't render JSX, like the textarea placeholder.
  const activeLabelPlain = labelForThread(thread);
  const activeLabel = renderEveryoneAware(activeLabelPlain, { size: 16, color: C.warm });

  // Recipients matching the compose "To:" search text — excludes anyone
  // already picked, and hides Everyone/Parents once a group is being built
  // (those fixed groups can't be combined with hand-picked members)
  const filteredRecipients = threads.filter((t) => {
    if (selectedRecipients.some((r) => r.id === t.id)) return false;
    if (selectedRecipients.length > 0 && (t.id === "all" || t.id === "parents")) return false;
    const label = t.id === "all" ? "Everyone" : t.id === "parents" ? "Parents" : t.label;
    return label.toLowerCase().includes(recipientQuery.trim().toLowerCase());
  });

  // — render —

  return (
    <>
      {/* Floating chat button — only when panel is closed */}
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

            {/* — Header — */}
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
                  {(view === "thread" || view === "compose") && (
                    <button
                      onClick={() => { setView("inbox"); setRecipientQuery(""); setSelectedRecipients([]); loadInbox(); }}
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
                    {view === "inbox" ? "Family Chat"
                      : view === "compose" ? "New Message"
                      : activeLabel}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {view === "inbox" && (
                    <button
                      onClick={() => setView("compose")}
                      title="New message"
                      aria-label="Compose new message"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        padding: "4px 6px", borderRadius: 8,
                        display: "flex", alignItems: "center", color: C.clay,
                      }}
                    >
                      <PencilIcon size={18} color={C.clay} />
                    </button>
                  )}
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
              </div>
            </div>

            {/* — Inbox view — */}
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
                    No messages yet. Tap the pencil icon above to start a conversation!
                  </div>
                )}
                {isCloud && inboxItems.length > 0 && inboxItems.map((item) => {
                  const isUnread = unreadThreads.has(item.thread);
                  const uiThread = fromDbThread(item.thread);
                  return (
                    <button
                      key={item.thread}
                      onClick={() => openThread(uiThread)}
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
                          {renderEveryoneAware(threadLabel(item.thread), { size: 13, color: C.warm })}
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
              </div>
            )}

            {/* — Compose view — */}
            {view === "compose" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                  marginBottom: 12, paddingBottom: 10,
                  borderBottom: `1.5px solid ${C.softBorder}`,
                }}>
                  <span style={{ fontFamily: fontSans, fontSize: 13, fontWeight: 700, color: C.textMuted }}>
                    To:
                  </span>
                  {selectedRecipients.map((r) => (
                    <span key={r.id} style={{
                      display: "flex", alignItems: "center", gap: 5,
                      background: C.sand, borderRadius: 16, padding: "4px 6px 4px 11px",
                      fontFamily: fontSans, fontSize: 13, fontWeight: 600, color: C.warm,
                    }}>
                      {r.label}
                      <button
                        onClick={() => removeRecipient(r.id)}
                        title={`Remove ${r.label}`}
                        style={{
                          width: 16, height: 16, borderRadius: "50%", border: "none",
                          background: "transparent", color: C.textMuted, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 14, lineHeight: 1, padding: 0,
                        }}
                      >
                        x
                      </button>
                    </span>
                  ))}
                  <input
                    ref={composeInputRef}
                    value={recipientQuery}
                    onChange={(e) => setRecipientQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (recipientQuery.trim() && filteredRecipients[0]) {
                          pickRecipient(filteredRecipients[0]);
                        } else if (selectedRecipients.length > 0) {
                          startChatWithSelected();
                        }
                      } else if (e.key === "Backspace" && !recipientQuery && selectedRecipients.length > 0) {
                        removeRecipient(selectedRecipients[selectedRecipients.length - 1].id);
                      }
                    }}
                    placeholder={selectedRecipients.length ? "Add another..." : "Type a name..."}
                    style={{
                      flex: 1, minWidth: 80, border: "none", outline: "none",
                      fontFamily: fontSans, fontSize: 15, color: C.warm,
                      background: "transparent", padding: "4px 0",
                    }}
                  />
                </div>
                {filteredRecipients.length === 0 && (
                  <div style={{
                    fontFamily: fontSans, fontSize: 13, color: C.textMuted,
                    textAlign: "center", padding: "24px 20px", lineHeight: 1.6,
                  }}>
                    No matches.
                  </div>
                )}
                {filteredRecipients.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => pickRecipient(t)}
                    style={{
                      width: "100%", textAlign: "left", display: "flex", alignItems: "center",
                      padding: "12px 4px", background: "transparent", border: "none",
                      borderBottom: `1px solid ${C.softBorder}`, cursor: "pointer",
                      fontFamily: fontSans, fontSize: 14, fontWeight: 600, color: C.warm,
                    }}
                  >
                    {renderEveryoneAware(t.id === "all" ? "Everyone" : t.id === "parents" ? "Parents" : t.label)}
                  </button>
                ))}
                {selectedRecipients.length > 0 && (
                  <button
                    onClick={startChatWithSelected}
                    style={{
                      marginTop: 14, padding: "11px 16px", borderRadius: 14, border: "none",
                      background: C.clay, color: C.white, cursor: "pointer",
                      fontFamily: fontSans, fontSize: 14, fontWeight: 700,
                    }}
                  >
                    {selectedRecipients.length === 1
                      ? `Start chat with ${selectedRecipients[0].label}`
                      : `Start group chat (${selectedRecipients.length} people)`}
                  </button>
                )}
              </div>
            )}

            {/* — Thread view — */}
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
                      No messages yet in <strong>{activeLabel}</strong>.<br />
                      Say hi!
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
                      placeholder={`Message ${activeLabelPlain || "family"}...`}
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
