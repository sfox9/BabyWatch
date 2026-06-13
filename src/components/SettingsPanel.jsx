import { useState } from "react";
import { C, font, fontSans } from "../lib/theme";
import { todayKey } from "../lib/time";
import { Badge, Btn } from "./UI";

const REMINDER_OPTIONS = [
  { minutes: 1440, label: "1 day before" },
  { minutes: 180, label: "3 hours before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 30, label: "30 minutes before" },
  { minutes: 15, label: "15 minutes before" },
];

export default function SettingsPanel({
  isParent, members, childrenList, shifts, familyCode, currentUser,
  families, onRemoveMember, onAddChild, onRemoveChild,
  onAddPlaceholderMember, onJoinFamily, onLeaveFamily, onCreateFamily, onRenameFamily,
  onUpdateReminders,
}) {
  const [renamingId, setRenamingId] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [newChild, setNewChild] = useState("");
  const [tab, setTab] = useState(isParent ? "members" : "calendars");
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const inviteLink = `${window.location.origin}${window.location.pathname}?code=${familyCode}`;

  const [placeholderName, setPlaceholderName] = useState("");
  const [placeholderTag, setPlaceholderTag] = useState("");
  const [placeholderErr, setPlaceholderErr] = useState("");
  const [placeholderBusy, setPlaceholderBusy] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [joinRelationship, setJoinRelationship] = useState("");
  const [joinErr, setJoinErr] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);

  const [newFamName, setNewFamName] = useState("");
  const [newFamRelationship, setNewFamRelationship] = useState("");
  const [createErr, setCreateErr] = useState("");
  const [createBusy, setCreateBusy] = useState(false);

  const [reminderOffsets, setReminderOffsets] = useState(currentUser.reminderOffsets || [1440, 60]);
  const [reminderSaved, setReminderSaved] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);

  const today = todayKey();
  const upcoming = Object.entries(shifts)
    .filter(([k]) => k >= today)
    .flatMap(([, list]) => list || []);
  const openShifts = upcoming.filter((s) => !s.coveredByName).length;
  const coveredShifts = upcoming.filter((s) => s.coveredByName).length;

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

  async function addPlaceholder() {
    setPlaceholderErr("");
    if (!placeholderName.trim()) {
      setPlaceholderErr("Please enter a name.");
      return;
    }
    setPlaceholderBusy(true);
    try {
      await onAddPlaceholderMember({ name: placeholderName.trim(), tag: placeholderTag.trim() });
      setPlaceholderName("");
      setPlaceholderTag("");
    } catch (e) {
      setPlaceholderErr(e.message || "Could not add that family member.");
    } finally {
      setPlaceholderBusy(false);
    }
  }

  async function joinCalendar() {
    setJoinErr("");
    if (!joinCode.trim()) {
      setJoinErr("Enter a family code.");
      return;
    }
    setJoinBusy(true);
    try {
      await onJoinFamily(joinCode.trim(), joinRelationship.trim());
      setJoinCode("");
      setJoinRelationship("");
    } catch (e) {
      setJoinErr(e.message || "Could not link that calendar.");
    } finally {
      setJoinBusy(false);
    }
  }

  function toggleReminder(minutes) {
    setReminderSaved(false);
    setReminderOffsets((prev) =>
      prev.includes(minutes) ? prev.filter((m) => m !== minutes) : [...prev, minutes].sort((a, b) => b - a)
    );
  }

  async function saveReminders() {
    setReminderBusy(true);
    try {
      await onUpdateReminders(reminderOffsets);
      setReminderSaved(true);
      setTimeout(() => setReminderSaved(false), 1800);
    } finally {
      setReminderBusy(false);
    }
  }

  async function createCalendar() {
    setCreateErr("");
    setCreateBusy(true);
    try {
      await onCreateFamily({ name: newFamName.trim(), relationship: newFamRelationship.trim() });
      setNewFamName("");
      setNewFamRelationship("");
    } catch (e) {
      setCreateErr(e.message || "Could not create that calendar.");
    } finally {
      setCreateBusy(false);
    }
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

      <div style={{ display: "flex", gap: 8, marginBottom: 18, borderBottom: `1.5px solid ${C.softBorder}`, flexWrap: "wrap" }}>
        {(isParent ? ["members", "children", "calendars", "notifications"] : ["calendars", "notifications"]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 20px", borderRadius: "10px 10px 0 0", border: "none", cursor: "pointer",
            fontFamily: fontSans, fontWeight: 700, fontSize: 13, textTransform: "capitalize",
            background: tab === t ? C.white : C.sand,
            color: tab === t ? C.clay : C.textMuted,
            borderBottom: tab === t ? `2px solid ${C.clay}` : "none",
            marginBottom: tab === t ? "-1.5px" : "0",
          }}>{t === "calendars" ? "Linked Calendars" : t}</button>
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
                <div style={{ fontFamily: fontSans, fontSize: 12, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {u.isPlaceholder ? "No login - added by a parent" : u.email}
                </div>
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

          <div style={{ background: C.white, borderRadius: 12, padding: "14px 16px", marginTop: 14, border: `1.5px dashed ${C.softBorder}` }}>
            <div style={{ fontFamily: fontSans, fontSize: 13, fontWeight: 700, color: C.warm, marginBottom: 4 }}>
              Add a family member without an account
            </div>
            <div style={{ fontFamily: fontSans, fontSize: 12, color: C.textMuted, marginBottom: 12, lineHeight: 1.5 }}>
              For someone who won't sign in themselves (e.g. a grandparent). You can still assign them shifts.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: 2, minWidth: 140 }}>
                <input value={placeholderName} onChange={(e) => setPlaceholderName(e.target.value)} placeholder="Name (e.g. Grandma Sue)"
                  style={{
                    width: "100%", boxSizing: "border-box", background: C.white, border: `1.5px solid ${C.softBorder}`, borderRadius: 10,
                    padding: "10px 14px", fontFamily: fontSans, fontSize: 14, color: C.text, outline: "none",
                  }} />
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <input value={placeholderTag} onChange={(e) => setPlaceholderTag(e.target.value)} placeholder="Tag (optional)"
                  style={{
                    width: "100%", boxSizing: "border-box", background: C.white, border: `1.5px solid ${C.softBorder}`, borderRadius: 10,
                    padding: "10px 14px", fontFamily: fontSans, fontSize: 14, color: C.text, outline: "none",
                  }} />
              </div>
              <Btn small onClick={addPlaceholder} disabled={placeholderBusy}>{placeholderBusy ? "Adding..." : "Add"}</Btn>
            </div>
            {placeholderErr && <div style={{ color: C.dustyRose, fontFamily: fontSans, fontSize: 12, marginTop: 8, fontWeight: 600 }}>{placeholderErr}</div>}
          </div>
        </div>
      )}

      {tab === "children" && (
        <div>
          {childrenList.length === 0 && (
            <div style={{ fontFamily: fontSans, fontSize: 13, color: C.textMuted, padding: "14px 16px", background: C.white, borderRadius: 12, border: `1.5px dashed ${C.softBorder}`, marginBottom: 8 }}>
              Add your children below - their names will appear when posting shifts.
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

      {tab === "calendars" && (
        <div>
          <div style={{ fontFamily: fontSans, fontSize: 12, color: C.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
            Link another family's calendar - for example a sibling's - so you can switch between calendars and help cover their shifts too. Ask them for their family code in their Settings.
          </div>
          {(families || []).map((f) => (
            <div key={f.id} style={{
              background: C.white, borderRadius: 12, padding: "12px 14px", marginBottom: 8,
              border: `1.5px solid ${C.softBorder}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: fontSans, fontSize: 14, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.name || f.code}
                  </div>
                  <div style={{ fontFamily: fontSans, fontSize: 12, color: C.textMuted, letterSpacing: "0.06em" }}>
                    {f.isHome ? "Your family" : "Linked calendar"}{f.name ? ` - code ${f.code}` : ""}
                    {!f.isHome && f.relationship ? ` - you're ${f.relationship}` : ""}
                  </div>
                </div>
                {!f.isHome && (
                  <Badge color={f.role === "parent" ? C.clay : C.sage}>{f.relationship || (f.role === "parent" ? "Parent" : "Family")}</Badge>
                )}
                {(f.isHome ? isParent : f.role === "parent") && onRenameFamily && (
                  <button onClick={() => { setRenamingId(renamingId === f.id ? null : f.id); setNameInput(f.name || ""); }} style={{
                    background: "none", border: "none", color: C.clay, cursor: "pointer",
                    fontSize: 13, fontWeight: 700, padding: "2px 6px", borderRadius: 6, fontFamily: fontSans,
                  }}>{renamingId === f.id ? "Cancel" : "Rename"}</button>
                )}
                {!f.isHome && (
                  <button onClick={() => onLeaveFamily(f.id)} style={{
                    background: "none", border: "none", color: C.dustyRose, cursor: "pointer",
                    fontSize: 13, fontWeight: 700, padding: "2px 6px", borderRadius: 6, fontFamily: fontSans,
                  }}>Remove</button>
                )}
              </div>
              {renamingId === f.id && (
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="e.g. Fox Family Calendar"
                      style={{
                        width: "100%", boxSizing: "border-box", background: C.white, border: `1.5px solid ${C.softBorder}`, borderRadius: 10,
                        padding: "10px 14px", fontFamily: fontSans, fontSize: 14, color: C.text, outline: "none",
                      }} />
                  </div>
                  <Btn small onClick={async () => { await onRenameFamily(f.id, nameInput.trim()); setRenamingId(null); }}>Save</Btn>
                </div>
              )}
            </div>
          ))}

          <div style={{ background: C.white, borderRadius: 12, padding: "14px 16px", marginTop: 14, border: `1.5px dashed ${C.softBorder}` }}>
            <div style={{ fontFamily: fontSans, fontSize: 13, fontWeight: 700, color: C.warm, marginBottom: 8 }}>
              Link a calendar by code
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="e.g. 7K3MQ2"
                  style={{
                    width: "100%", boxSizing: "border-box", background: C.white, border: `1.5px solid ${C.softBorder}`, borderRadius: 10,
                    padding: "10px 14px", fontFamily: fontSans, fontSize: 14, color: C.text, outline: "none", textTransform: "uppercase", letterSpacing: "0.1em",
                  }} />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <input value={joinRelationship} onChange={(e) => setJoinRelationship(e.target.value)} placeholder="Your title (e.g. Auntie)"
                  style={{
                    width: "100%", boxSizing: "border-box", background: C.white, border: `1.5px solid ${C.softBorder}`, borderRadius: 10,
                    padding: "10px 14px", fontFamily: fontSans, fontSize: 14, color: C.text, outline: "none",
                  }} />
              </div>
              <Btn small onClick={joinCalendar} disabled={joinBusy}>{joinBusy ? "Linking..." : "Link Calendar"}</Btn>
            </div>
            <div style={{ fontFamily: fontSans, fontSize: 11, color: C.textMuted, marginTop: 6 }}>
              Your title shows up when you're viewing this calendar (e.g. "viewing Smith Family calendar (as Auntie)").
            </div>
            {joinErr && <div style={{ color: C.dustyRose, fontFamily: fontSans, fontSize: 12, marginTop: 8, fontWeight: 600 }}>{joinErr}</div>}
          </div>

          {onCreateFamily && (
            <div style={{ background: C.white, borderRadius: 12, padding: "14px 16px", marginTop: 14, border: `1.5px dashed ${C.softBorder}` }}>
              <div style={{ fontFamily: fontSans, fontSize: 13, fontWeight: 700, color: C.warm, marginBottom: 4 }}>
                Create your own calendar
              </div>
              <div style={{ fontFamily: fontSans, fontSize: 12, color: C.textMuted, marginBottom: 12, lineHeight: 1.5 }}>
                Start a brand-new calendar for your own kids - you'll be the parent/admin of this one, with your own family code to share.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <input value={newFamName} onChange={(e) => setNewFamName(e.target.value)} placeholder="Calendar name (e.g. Smith Family)"
                    style={{
                      width: "100%", boxSizing: "border-box", background: C.white, border: `1.5px solid ${C.softBorder}`, borderRadius: 10,
                      padding: "10px 14px", fontFamily: fontSans, fontSize: 14, color: C.text, outline: "none",
                    }} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <input value={newFamRelationship} onChange={(e) => setNewFamRelationship(e.target.value)} placeholder="Your title (e.g. Parent)"
                    style={{
                      width: "100%", boxSizing: "border-box", background: C.white, border: `1.5px solid ${C.softBorder}`, borderRadius: 10,
                      padding: "10px 14px", fontFamily: fontSans, fontSize: 14, color: C.text, outline: "none",
                    }} />
                </div>
                <Btn small onClick={createCalendar} disabled={createBusy}>{createBusy ? "Creating..." : "Create Calendar"}</Btn>
              </div>
              {createErr && <div style={{ color: C.dustyRose, fontFamily: fontSans, fontSize: 12, marginTop: 8, fontWeight: 600 }}>{createErr}</div>}
            </div>
          )}
        </div>
      )}

      {tab === "notifications" && (
        <div>
          <div style={{ fontFamily: fontSans, fontSize: 12, color: C.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
            When you're covering a shift, get a reminder before it starts - as an in-app notification and an email (if email alerts are set up).
          </div>
          <div style={{ background: C.white, borderRadius: 12, padding: "14px 16px", border: `1.5px solid ${C.softBorder}` }}>
            <div style={{ fontFamily: fontSans, fontSize: 13, fontWeight: 700, color: C.warm, marginBottom: 10 }}>
              Remind me
            </div>
            {REMINDER_OPTIONS.map((opt) => (
              <label key={opt.minutes} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 2px",
                fontFamily: fontSans, fontSize: 14, color: C.text, cursor: "pointer",
              }}>
                <input
                  type="checkbox"
                  checked={reminderOffsets.includes(opt.minutes)}
                  onChange={() => toggleReminder(opt.minutes)}
                  style={{ width: 18, height: 18, accentColor: C.clay, cursor: "pointer" }}
                />
                {opt.label}
              </label>
            ))}
            <div style={{ marginTop: 12 }}>
              <Btn small onClick={saveReminders} disabled={reminderBusy}>
                {reminderBusy ? "Saving..." : reminderSaved ? "Saved" : "Save"}
              </Btn>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
