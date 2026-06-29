import { useState, useEffect } from "react";
import { C, font, fontSans } from "../lib/theme";
import { todayKey } from "../lib/time";
import { Badge, Btn, Modal } from "./UI";

const REMINDER_OPTIONS = [
  { minutes: 1440, label: "1 day before" },
  { minutes: 180, label: "3 hours before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 30, label: "30 minutes before" },
  { minutes: 15, label: "15 minutes before" },
];

const inputStyle = {
  width: "100%", boxSizing: "border-box", background: C.white, border: `1.5px solid ${C.softBorder}`,
  borderRadius: 10, padding: "9px 12px", fontFamily: fontSans, fontSize: 14, color: C.text, outline: "none",
};

// A child profile card with an editable list of care notes
// (bedtime routine, dinner plans, directions to practice, etc.).
function ChildCard({ child, canEdit = true, onRemoveChild, onAddCareNote, onUpdateCareNote, onRemoveCareNote, onUpdateChildMedical }) {
  const notes = child.notes || [];
  const [adding, setAdding] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addBody, setAddBody] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [busy, setBusy] = useState(false);

  // Allergies & medications (safety info)
  const [editingMed, setEditingMed] = useState(false);
  const [medAllergies, setMedAllergies] = useState(child.allergies || "");
  const [medMeds, setMedMeds] = useState(child.medications || "");
  const [medBusy, setMedBusy] = useState(false);

  function startEditMed() {
    setMedAllergies(child.allergies || "");
    setMedMeds(child.medications || "");
    setEditingMed(true);
  }
  async function submitMed() {
    setMedBusy(true);
    try {
      await onUpdateChildMedical(child.id, { allergies: medAllergies, medications: medMeds });
      setEditingMed(false);
    } finally { setMedBusy(false); }
  }

  async function submitAdd() {
    if (!addTitle.trim() && !addBody.trim()) return;
    setBusy(true);
    try {
      await onAddCareNote(child.id, { title: addTitle, body: addBody });
      setAddTitle(""); setAddBody(""); setAdding(false);
    } finally { setBusy(false); }
  }
  function startEdit(note) {
    setEditingId(note.id);
    setEditTitle(note.title || "");
    setEditBody(note.body || "");
  }
  async function submitEdit() {
    setBusy(true);
    try {
      await onUpdateCareNote(child.id, editingId, { title: editTitle, body: editBody });
      setEditingId(null);
    } finally { setBusy(false); }
  }

  return (
    <div style={{ background: C.white, borderRadius: 12, padding: "12px 16px", marginBottom: 8, border: `1.5px solid ${C.softBorder}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: fontSans, fontSize: 15, fontWeight: 700, color: C.text }}>{child.name}</div>
        {canEdit && (
          <button onClick={() => onRemoveChild(child.id)} style={{
            background: "none", border: "none", color: C.dustyRose, cursor: "pointer",
            fontSize: 13, fontWeight: 700, padding: "2px 8px", borderRadius: 6, fontFamily: fontSans,
          }}>Remove</button>
        )}
      </div>
      {/* Care notes */}
      <div style={{ marginTop: 10, borderTop: `1px solid ${C.softBorder}`, paddingTop: 10 }}>
        <div style={{ fontFamily: fontSans, fontSize: 10.5, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
          Care Notes
        </div>
        {notes.length === 0 && !adding && (
          <div style={{ fontFamily: fontSans, fontSize: 12.5, color: C.textMuted, marginBottom: 8 }}>
            {canEdit
              ? "No care notes yet — add bedtime routines, dinner plans, directions, allergies, etc."
              : "No care notes for this child yet."}
          </div>
        )}
        {notes.map((note) => (
          <div key={note.id} style={{ background: C.cream, borderRadius: 10, padding: "9px 11px", marginBottom: 7, border: `1px solid ${C.softBorder}` }}>
            {editingId === note.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title (e.g. Bedtime routine)" style={inputStyle} />
                <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} placeholder="Details…" rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn small onClick={submitEdit} disabled={busy}>{busy ? "Saving…" : "Save"}</Btn>
                  <button onClick={() => setEditingId(null)} style={{
                    background: C.sand, border: "none", borderRadius: 10, padding: "8px 14px",
                    fontFamily: fontSans, fontSize: 13, fontWeight: 700, color: C.textMuted, cursor: "pointer",
                  }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {note.title && <div style={{ fontFamily: fontSans, fontSize: 13.5, fontWeight: 700, color: C.warm }}>{note.title}</div>}
                  {note.body && <div style={{ fontFamily: fontSans, fontSize: 13, color: C.text, lineHeight: 1.5, marginTop: note.title ? 2 : 0, whiteSpace: "pre-wrap" }}>{note.body}</div>}
                </div>
                {canEdit && (
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => startEdit(note)} style={{
                      background: "none", border: "none", color: C.clay, cursor: "pointer",
                      fontSize: 12, fontWeight: 700, padding: "2px 6px", borderRadius: 6, fontFamily: fontSans,
                    }}>Edit</button>
                    <button onClick={() => onRemoveCareNote(child.id, note.id)} style={{
                      background: "none", border: "none", color: C.dustyRose, cursor: "pointer",
                      fontSize: 12, fontWeight: 700, padding: "2px 6px", borderRadius: 6, fontFamily: fontSans,
                    }}>Remove</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {canEdit && (adding ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 4 }}>
            <input value={addTitle} onChange={(e) => setAddTitle(e.target.value)} placeholder="Title (e.g. Bedtime routine)" autoFocus style={inputStyle} />
            <textarea value={addBody} onChange={(e) => setAddBody(e.target.value)} placeholder="Details…" rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <Btn small onClick={submitAdd} disabled={busy}>{busy ? "Saving…" : "Save note"}</Btn>
              <button onClick={() => { setAdding(false); setAddTitle(""); setAddBody(""); }} style={{
                background: C.sand, border: "none", borderRadius: 10, padding: "8px 14px",
                fontFamily: fontSans, fontSize: 13, fontWeight: 700, color: C.textMuted, cursor: "pointer",
              }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={{
            background: "none", border: `1.5px dashed ${C.softBorder}`, borderRadius: 10, padding: "8px 12px",
            fontFamily: fontSans, fontSize: 13, fontWeight: 700, color: C.clay, cursor: "pointer", width: "100%",
          }}>+ Add care note</button>
        ))}
      </div>

      {/* Allergies & medications (safety info) */}
      <div style={{ marginTop: 10, borderTop: `1px solid ${C.softBorder}`, paddingTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontFamily: fontSans, fontSize: 10.5, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Allergies & Medications
          </span>
          {canEdit && !editingMed && (
            <button onClick={startEditMed} style={{
              background: "none", border: "none", color: C.clay, cursor: "pointer",
              fontSize: 12, fontWeight: 700, padding: "2px 6px", borderRadius: 6, fontFamily: fontSans,
            }}>Edit</button>
          )}
        </div>
        {editingMed ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <textarea value={medAllergies} onChange={(e) => setMedAllergies(e.target.value)} placeholder="Allergies (e.g. peanuts, penicillin)" rows={2} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
            <textarea value={medMeds} onChange={(e) => setMedMeds(e.target.value)} placeholder="Medications (name, dose, time)" rows={2} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <Btn small onClick={submitMed} disabled={medBusy}>{medBusy ? "Saving…" : "Save"}</Btn>
              <button onClick={() => setEditingMed(false)} style={{
                background: C.sand, border: "none", borderRadius: 10, padding: "8px 14px",
                fontFamily: fontSans, fontSize: 13, fontWeight: 700, color: C.textMuted, cursor: "pointer",
              }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{
              background: child.allergies ? C.dustyRose + "14" : "transparent",
              border: child.allergies ? `1px solid ${C.dustyRose}44` : "none",
              borderRadius: 8, padding: child.allergies ? "7px 10px" : 0,
              fontFamily: fontSans, fontSize: 13, lineHeight: 1.5,
            }}>
              <span style={{ fontWeight: 800, color: child.allergies ? C.dustyRose : C.textMuted }}>Allergies: </span>
              <span style={{ color: child.allergies ? C.warm : C.textMuted, whiteSpace: "pre-wrap" }}>{child.allergies || "None listed"}</span>
            </div>
            <div style={{ fontFamily: fontSans, fontSize: 13, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 800, color: C.textMuted }}>Medications: </span>
              <span style={{ color: child.medications ? C.warm : C.textMuted, whiteSpace: "pre-wrap" }}>{child.medications || "None listed"}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Family-level emergency info (phones, address, pediatrician). Parents edit;
// everyone — including caregivers — can read it.
function EmergencyCard({ value, canEdit, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try { await onSave(draft); setEditing(false); } finally { setBusy(false); }
  }

  return (
    <div style={{ background: C.white, borderRadius: 12, padding: "12px 16px", marginBottom: 14, border: `1.5px solid ${C.clay}44` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontFamily: fontSans, fontSize: 11, fontWeight: 800, color: C.clay, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Emergency Info
        </span>
        {canEdit && !editing && (
          <button onClick={() => { setDraft(value || ""); setEditing(true); }} style={{
            background: "none", border: "none", color: C.clay, cursor: "pointer",
            fontSize: 12, fontWeight: 700, padding: "2px 6px", borderRadius: 6, fontFamily: fontSans,
          }}>Edit</button>
        )}
      </div>
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4}
            placeholder="Parent phone numbers, home address, pediatrician, anything a caregiver might need in an emergency."
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <Btn small onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Btn>
            <button onClick={() => setEditing(false)} style={{
              background: C.sand, border: "none", borderRadius: 10, padding: "8px 14px",
              fontFamily: fontSans, fontSize: 13, fontWeight: 700, color: C.textMuted, cursor: "pointer",
            }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ fontFamily: fontSans, fontSize: 13.5, color: value ? C.text : C.textMuted, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {value || (canEdit ? "Add phone numbers, address, and pediatrician so caregivers have them on hand." : "No emergency info added yet.")}
        </div>
      )}
    </div>
  );
}

export default function SettingsPanel({
  isParent, members, childrenList, shifts, familyCode, currentUser,
  families, onRemoveMember, onAddChild, onRemoveChild,
  onAddCareNote, onUpdateCareNote, onRemoveCareNote,
  onAddPlaceholderMember, onJoinFamily, onLeaveFamily, onCreateFamily, onRenameFamily,
  onUpdateReminders, onGetIcalUrl, onDeleteAccount,
  onUpdateChildMedical, emergencyInfo, onUpdateEmergencyInfo, onRegenerateCode,
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

  const [icalUrl, setIcalUrl] = useState(null);
  const [icalCopied, setIcalCopied] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [regenConfirm, setRegenConfirm] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);
  // Warn if deleting would leave this calendar with no parent/admin.
  const parentCount = (members || []).filter((m) => m.role === "parent").length;
  const youAreParent = (members || []).some((m) => m.id === currentUser?.id && m.role === "parent");
  const isLastParent = youAreParent && parentCount <= 1;

  // Load iCal URL lazily when the calendars tab is opened
  useEffect(() => {
    if (tab === "calendars" && !icalUrl && onGetIcalUrl) {
      onGetIcalUrl().then((url) => setIcalUrl(url || ""));
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  function copyIcalUrl() {
    if (!icalUrl) return;
    navigator.clipboard?.writeText(icalUrl).then(() => {
      setIcalCopied(true);
      setTimeout(() => setIcalCopied(false), 2000);
    });
  }

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
          {isParent && onRegenerateCode && (
            <button onClick={() => setRegenConfirm(true)} style={{
              background: C.white, border: `1.5px solid ${C.dustyRose}66`, borderRadius: 14, padding: "3px 12px",
              fontFamily: fontSans, fontSize: 11, fontWeight: 700, color: C.dustyRose, cursor: "pointer",
            }}>New code</button>
          )}
        </div>
        <div style={{ fontFamily: fontSans, fontSize: 11, color: C.textMuted, marginTop: 6 }}>
          Share the code or invite link to add family, nannies, or a second parent.
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
        {(isParent ? ["members", "children", "calendars", "notifications"] : ["children", "calendars", "notifications"]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 20px", borderRadius: "10px 10px 0 0", border: "none", cursor: "pointer",
            fontFamily: fontSans, fontWeight: 700, fontSize: 13, textTransform: "capitalize",
            background: tab === t ? C.white : C.sand,
            color: tab === t ? C.clay : C.textMuted,
            borderBottom: tab === t ? `2px solid ${C.clay}` : "none",
            marginBottom: tab === t ? "-1.5px" : "0",
          }}>{t === "calendars" ? "Linked Calendars" : t === "children" ? (isParent ? "Children" : "Care Notes") : t}</button>
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
              For someone who won't sign in (e.g. a grandparent). You can still assign them shifts.
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
          <EmergencyCard value={emergencyInfo} canEdit={isParent} onSave={onUpdateEmergencyInfo} />
          {!isParent && (
            <div style={{ fontFamily: fontSans, fontSize: 12, color: C.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
              Care notes the family has added for each child — bedtime routines, dinner plans, directions, allergies, and more.
            </div>
          )}
          {childrenList.length === 0 && (
            <div style={{ fontFamily: fontSans, fontSize: 13, color: C.textMuted, padding: "14px 16px", background: C.white, borderRadius: 12, border: `1.5px dashed ${C.softBorder}`, marginBottom: 8 }}>
              {isParent ? "Add your children below - their names will appear when posting shifts." : "No children have been added to this calendar yet."}
            </div>
          )}
          {childrenList.map((c) => (
            <ChildCard
              key={c.id}
              child={c}
              canEdit={isParent}
              onRemoveChild={onRemoveChild}
              onAddCareNote={onAddCareNote}
              onUpdateCareNote={onUpdateCareNote}
              onRemoveCareNote={onRemoveCareNote}
              onUpdateChildMedical={onUpdateChildMedical}
            />
          ))}
          {isParent && (
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
          )}
        </div>
      )}

      {tab === "calendars" && (
        <div>
          <div style={{ fontFamily: fontSans, fontSize: 12, color: C.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
            Link another family's calendar (e.g. a sibling's) to switch between them and help cover shifts. Ask them for their family code.
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

          {icalUrl && (
            <div style={{ background: C.white, borderRadius: 12, padding: "14px 16px", marginTop: 14, border: `1.5px solid ${C.softBorder}` }}>
              <div style={{ fontFamily: fontSans, fontSize: 13, fontWeight: 700, color: C.warm, marginBottom: 4 }}>
                Sync with your calendar app
              </div>
              <div style={{ fontFamily: fontSans, fontSize: 12, color: C.textMuted, marginBottom: 12, lineHeight: 1.5 }}>
                Paste this URL into your calendar app (Apple, Google, Outlook, Skylite) as "Subscribe by URL" to keep shifts in sync.
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{
                  flex: 1, minWidth: 0, background: C.sand, borderRadius: 8, padding: "8px 12px",
                  fontFamily: "monospace", fontSize: 11, color: C.clay, wordBreak: "break-all", lineHeight: 1.5,
                }}>
                  {icalUrl}
                </div>
                <button onClick={copyIcalUrl} style={{
                  background: icalCopied ? C.sage : C.clay, border: "none", borderRadius: 10,
                  padding: "9px 16px", fontFamily: fontSans, fontSize: 13, fontWeight: 700,
                  color: C.white, cursor: "pointer", flexShrink: 0,
                }}>{icalCopied ? "Copied!" : "Copy URL"}</button>
              </div>
              <div style={{ fontFamily: fontSans, fontSize: 11, color: C.textMuted, marginTop: 8 }}>
                Keep this URL private — anyone with it can view your family's shift schedule.
              </div>
            </div>
          )}

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
              Your title shows when you view this calendar (e.g. "as Auntie").
            </div>
            {joinErr && <div style={{ color: C.dustyRose, fontFamily: fontSans, fontSize: 12, marginTop: 8, fontWeight: 600 }}>{joinErr}</div>}
          </div>

          {onCreateFamily && (
            <div style={{ background: C.white, borderRadius: 12, padding: "14px 16px", marginTop: 14, border: `1.5px dashed ${C.softBorder}` }}>
              <div style={{ fontFamily: fontSans, fontSize: 13, fontWeight: 700, color: C.warm, marginBottom: 4 }}>
                Create your own calendar
              </div>
              <div style={{ fontFamily: fontSans, fontSize: 12, color: C.textMuted, marginBottom: 12, lineHeight: 1.5 }}>
                Start a separate calendar for your own kids — you'll be its parent/admin with a new code to share.
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
            Get a reminder before a shift you're covering — in-app and by email.
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

      {/* Delete account — simple link; details live in the confirmation popup */}
      {onDeleteAccount && (
        <div style={{ marginTop: 30, textAlign: "center" }}>
          <button onClick={() => setConfirmingDelete(true)} style={{
            background: "none", border: "none", color: C.dustyRose, cursor: "pointer",
            fontFamily: fontSans, fontSize: 13, fontWeight: 700, padding: 8, textDecoration: "underline",
          }}>Delete account</button>
        </div>
      )}

      <Modal open={regenConfirm} onClose={() => { if (!regenBusy) setRegenConfirm(false); }} title="Generate a new code?">
        <div style={{ fontFamily: fontSans, fontSize: 14, color: C.text, lineHeight: 1.6, marginBottom: 14 }}>
          Your current family code and invite link will stop working right away. Anyone you've removed won't be able to rejoin with the old code. Current members stay connected.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={async () => { setRegenBusy(true); try { await onRegenerateCode(); setRegenConfirm(false); } finally { setRegenBusy(false); } }} disabled={regenBusy}>
            {regenBusy ? "Generating…" : "Generate new code"}
          </Btn>
          <Btn variant="secondary" onClick={() => setRegenConfirm(false)} disabled={regenBusy}>Cancel</Btn>
        </div>
      </Modal>

      <Modal open={confirmingDelete} onClose={() => { if (!deleteBusy) setConfirmingDelete(false); }} title="Delete account?">
        <div style={{ fontFamily: fontSans, fontSize: 14, color: C.text, lineHeight: 1.6, marginBottom: 14 }}>
          This permanently deletes your account and removes you from all calendars. Any shifts you're covering will reopen. This can't be undone.
        </div>
        {isLastParent && (
          <div style={{
            background: C.dustyRose + "1A", border: `1.5px solid ${C.dustyRose}66`, borderRadius: 10,
            padding: "10px 12px", marginBottom: 14, fontFamily: fontSans, fontSize: 13, color: C.warm, lineHeight: 1.5,
          }}>
            <strong style={{ color: C.dustyRose }}>You're the only parent on this calendar.</strong> No one else will be able to manage it.
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="danger" onClick={async () => { setDeleteBusy(true); try { await onDeleteAccount(); } finally { setDeleteBusy(false); } }} disabled={deleteBusy}>
            {deleteBusy ? "Deleting…" : "Delete account"}
          </Btn>
          <Btn variant="secondary" onClick={() => setConfirmingDelete(false)} disabled={deleteBusy}>Cancel</Btn>
        </div>
      </Modal>

    </div>
  );
}
