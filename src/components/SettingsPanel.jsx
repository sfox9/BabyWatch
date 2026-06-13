import { useState } from "react";
import { C, font, fontSans } from "../lib/theme";
import { todayKey } from "../lib/time";
import { Badge, Btn } from "./UI";

export default function SettingsPanel({ members, childrenList, shifts, familyCode, currentUser, onRemoveMember, onAddChild, onRemoveChild }) {
  const [newChild, setNewChild] = useState("");
  const [tab, setTab] = useState("members");
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const inviteLink = `${window.location.origin}${window.location.pathname}?code=${familyCode}`;

  const today = todayKey();
  const upcoming = Object.entries(shifts).filter(([k]) => k >= today);
  const openShifts = upcoming.filter(([, s]) => !s.coveredByName).length;
  const coveredShifts = upcoming.filter(([, s]) => s.coveredByName).length;

  function addChild() {
    if (newChild.trim()) {
      onAddChild(newChild.trim());
      setNewChild("");
    }
  }

  function copyCode() {
    navigator.clipboard?.writeText(familyCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  function copyLink() {
    navigator.clipboard?.writeText(inviteLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
    });
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: font, fontSize: 26, color: C.warm, fontWeight: 600, marginBottom: 8 }}>Family Settings</div>
        <div style={{ background: C.sand, borderRadius: 12, padding: "10px 16px", display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontFamily: fontSans, fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Family Code</div>
          <div style={{ fontFamily: fontSans, fontSize: 15, fontWeight: 800, color: C.clay, letterSpacing: "0.14em" }}>{familyCode}</div>
          <button onClick={copyCode} style={{
            background: C.white, border: `1.5px solid ${C.softBorder}`, borderRadius: 14, padding: "3px 12px",
            fontFamily: fontSans, fontSize: 11, fontWeight: 700, color: copied ? C.sage : C.warm, cursor: "pointer",
          }}>{copied ? "Copied" : "Copy code"}</button>
          <button onClick={copyLink} style={{
            background: C.white, border: `1.5px solid ${C.softBorder}`, borderRadius: 14, padding: "3px 12px",
            fontFamily: fontSans, fontSize: 11, fontWeight: 700, color: linkCopied ? C.sage : C.warm, cursor: "pointer",
          }}>{linkCopied ? "Link copied" : "Copy invite link"}</button>
        </div>
        <div style={{ fontFamily: fontSans, fontSize: 11, color: C.textMuted, marginTop: 6 }}>
          Share the code or invite link with family members, nannies, or a second parent. Anyone who signs up with it joins this same family calendar.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Members", value: members.length },
          { label: "Open Shifts", value: openShifts },
          { label: "Covered", value: coveredShifts },
        ].map((s) => (
          <div key={s.label} style={{ background: C.white, borderRadius: 14, padding: "16px 12px", textAlign: "center", border: `1.5px solid ${C.softBorder}` }}>
            <div style={{ fontFamily: font, fontSize: 32, color: C.clay, fontWeight: 700, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontFamily: fontSans, fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18, borderBottom: `1.5px solid ${C.softBorder}` }}>
        {["members", "children"].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 20px", borderRadius: "10px 10px 0 0", border: "none", cursor: "pointer",
            fontFamily: fontSans, fontWeight: 700, fontSize: 13, textTransform: "capitalize",
            background: tab === t ? C.white : C.sand,
            color: tab === t ? C.clay : C.textMuted,
            borderBottom: tab === t ? `2px solid ${C.clay}` : "none",
            marginBottom: tab === t ? "-1.5px" : "0",
          }}>{t}</button>
        ))}
      </div>

      {tab === "members" && (
        <div>
          {members.map((u) => (
            <div key={u.id} style={{
              background: C.white, borderRadius: 12, padding: "12px 14px", marginBottom: 8,
              display: "flex", alignItems: "center", gap: 12, border: `1.5px solid ${C.softBorder}`,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%", background: C.clay + "33",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: fontSans, fontWeight: 800, color: C.clay, fontSize: 15, flexShrink: 0,
              }}>{u.name[0]?.toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: fontSans, fontSize: 14, fontWeight: 700, color: C.text }}>{u.name}</div>
                <div style={{ fontFamily: fontSans, fontSize: 12, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
              </div>
              <Badge color={u.role === "parent" ? C.clay : C.sage}>{u.tag || u.role}</Badge>
              {u.id !== currentUser.id && (
                <button onClick={() => onRemoveMember(u.id)} style={{
                  background: "none", border: "none", color: C.dustyRose, cursor: "pointer",
                  fontSize: 13, fontWeight: 700, padding: "2px 6px", borderRadius: 6, fontFamily: fontSans,
                }}>Remove</button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "children" && (
        <div>
          {childrenList.length === 0 && (
            <div style={{ fontFamily: fontSans, fontSize: 13, color: C.textMuted, padding: "14px 16px", background: C.white, borderRadius: 12, border: `1.5px dashed ${C.softBorder}`, marginBottom: 8 }}>
              Add your children below — their names will appear when posting shifts.
            </div>
          )}
          {childrenList.map((c) => (
            <div key={c.id} style={{
              background: C.white, borderRadius: 12, padding: "11px 16px", marginBottom: 8,
              display: "flex", alignItems: "center", justifyContent: "space-between", border: `1.5px solid ${C.softBorder}`,
            }}>
              <div style={{ fontFamily: fontSans, fontSize: 14, fontWeight: 600, color: C.text }}>{c.name}</div>
              <button onClick={() => onRemoveChild(c.id)} style={{
                background: "none", border: "none", color: C.dustyRose, cursor: "pointer",
                fontSize: 13, fontWeight: 700, padding: "2px 8px", borderRadius: 6, fontFamily: fontSans,
              }}>Remove</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input value={newChild} onChange={(e) => setNewChild(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addChild()}
              placeholder="Add child's name"
              style={{
                flex: 1, background: C.white, border: `1.5px solid ${C.softBorder}`, borderRadius: 10,
                padding: "10px 14px", fontFamily: fontSans, fontSize: 16, color: C.text, outline: "none",
              }}
            />
            <Btn onClick={addChild} small>Add</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
