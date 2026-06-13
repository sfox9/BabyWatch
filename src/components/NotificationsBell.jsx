import { useState } from "react";
import { C, font, fontSans } from "../lib/theme";

export default function NotificationsBell({ notifications, onOpen }) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) onOpen();
  }

  return (
    <div style={{ position: "relative" }}>
      <button onClick={toggle} aria-label="Notifications" style={{
        background: C.sand, border: "none", borderRadius: "50%", width: 36, height: 36,
        cursor: "pointer", color: C.warm, display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
      }}>
        <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
          <path d="M10 2.5 C7 2.5 5 5 5 8 V11.5 L3.5 14 H16.5 L15 11.5 V8 C15 5 13 2.5 10 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M8.2 16.5 C8.6 17.4 9.3 17.8 10 17.8 C10.7 17.8 11.4 17.4 11.8 16.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -2, right: -2, background: C.dustyRose, color: C.white,
            borderRadius: 10, minWidth: 17, height: 17, fontSize: 10, fontFamily: fontSans, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
          }}>{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "fixed", right: 12, top: 60, left: 12, marginLeft: "auto", width: "auto", maxWidth: 320,
            background: C.white, borderRadius: 16, border: `1.5px solid ${C.softBorder}`,
            boxShadow: "0 8px 30px rgba(61,43,31,0.15)", zIndex: 200, overflow: "hidden",
          }}>
            <div style={{ fontFamily: font, fontSize: 17, color: C.warm, fontWeight: 600, padding: "12px 16px", borderBottom: `1px solid ${C.softBorder}` }}>
              Notifications
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {notifications.length === 0 ? (
                <div style={{ fontFamily: fontSans, fontSize: 13, color: C.textMuted, padding: 18, textAlign: "center" }}>
                  Nothing yet. You will see updates here when shifts are posted or claimed.
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} style={{
                    padding: "11px 16px", borderBottom: `1px solid ${C.softBorder}`,
                    background: n.read ? "transparent" : C.clay + "0E",
                  }}>
                    <div style={{ fontFamily: fontSans, fontSize: 13, color: C.text, lineHeight: 1.45 }}>{n.message}</div>
                    <div style={{ fontFamily: fontSans, fontSize: 11, color: C.textMuted, marginTop: 3 }}>
                      {new Date(n.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
