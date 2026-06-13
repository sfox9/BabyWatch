import { useEffect, useState } from "react";
import { C, fontSans } from "../lib/theme";
import { fmt12, prettyDateFull } from "../lib/time";
import { Btn, Modal, Select, Input } from "./UI";

const LABEL_SUGGESTIONS = ["School Drop Off", "School Pick Up", "Doctor Visit", "Event", "Date Night", "Overnight"];

export default function ShiftModal({
  open, onClose, dateStr, shift, currentUser, members, childrenList,
  onClaim, onUnclaim, onAssign, onDelete, onUpdateDetails,
}) {
  const [assignId, setAssignId] = useState("");
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState("07:00");
  const [end, setEnd] = useState("19:00");
  const [kids, setKids] = useState([]);
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (shift) {
      setStart(shift.start);
      setEnd(shift.end);
      setKids(shift.kids || []);
      setLabel(shift.label || "");
      setEditing(false);
      setAssignId("");
    }
  }, [shift, open]);

  if (!shift || !dateStr) return null;
  const isParent = currentUser?.role === "parent";
  const covered = Boolean(shift.coveredByName);
  const mine = shift.coveredById === currentUser?.id;
  const toggleKid = (k) => setKids((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  return (
    <Modal open={open} onClose={onClose} title={prettyDateFull(dateStr)}>
      <div style={{ fontFamily: fontSans }}>
        {shift.label && (
          <div style={{
            display: "inline-block", background: C.clay + "22", color: C.clay, borderRadius: 20,
            padding: "4px 14px", fontSize: 13, fontWeight: 700, marginBottom: 14,
          }}>{shift.label}</div>
        )}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ background: C.sand, borderRadius: 12, padding: "10px 16px", flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2, textTransform: "uppercase", fontWeight: 700 }}>Hours</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.warm }}>{fmt12(shift.start)} – {fmt12(shift.end)}</div>
          </div>
          <div style={{ background: C.sand, borderRadius: 12, padding: "10px 16px", flex: 1, minWidth: 100 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2, textTransform: "uppercase", fontWeight: 700 }}>Kids</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.warm }}>{shift.kids?.length ? shift.kids.join(", ") : "All"}</div>
          </div>
        </div>

        {shift.postedByName && (
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>
            Posted by <strong style={{ color: C.warm }}>{shift.postedByName}</strong>
          </div>
        )}

        <div style={{ background: covered ? C.sageMuted + "33" : C.dustyRose + "22", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: covered ? C.sage : C.dustyRose }}>
            {covered ? `Covered by ${shift.coveredByName}` : "Open — needs coverage"}
          </div>
        </div>

        {!isParent && !covered && (
          <Btn onClick={() => { onClaim(dateStr); onClose(); }} variant="sage" style={{ width: "100%", marginBottom: 10 }}>
            Claim this shift
          </Btn>
        )}
        {!isParent && covered && mine && (
          <Btn onClick={() => { onUnclaim(dateStr); onClose(); }} variant="secondary" style={{ width: "100%", marginBottom: 10 }}>
            Unclaim — I can no longer cover this
          </Btn>
        )}

        {isParent && (
          <div style={{ borderTop: `1px solid ${C.softBorder}`, paddingTop: 16 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Parent Controls
            </div>

            {!editing ? (
              <>
                <Select label="Manually assign to" value={assignId} onChange={(e) => setAssignId(e.target.value)}>
                  <option value="">— Select person —</option>
                  {members.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.tag || u.role})</option>
                  ))}
                </Select>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Btn small variant="sage" onClick={() => {
                    const m = members.find((u) => u.id === assignId);
                    if (m) { onAssign(dateStr, m); onClose(); }
                  }}>Assign</Btn>
                  {covered && (
                    <Btn small variant="secondary" onClick={() => { onAssign(dateStr, null); onClose(); }}>Clear</Btn>
                  )}
                  <Btn small variant="ghost" onClick={() => setEditing(true)}>Edit Details</Btn>
                  <Btn small variant="danger" onClick={() => { onDelete(dateStr); onClose(); }}>Delete Shift</Btn>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}><Input label="Start" type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div>
                  <div style={{ flex: 1 }}><Input label="End" type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
                </div>
                <Input label="Description (optional)" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. School Drop Off, Doctor Visit, Event" />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: -8, marginBottom: 16 }}>
                  {LABEL_SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => setLabel(s)} style={{
                      padding: "4px 12px", borderRadius: 20, cursor: "pointer", fontFamily: fontSans, fontWeight: 600, fontSize: 12,
                      border: `1.5px solid ${C.softBorder}`, background: C.white, color: C.textMuted,
                    }}>{s}</button>
                  ))}
                </div>
                {childrenList.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Kids</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {childrenList.map((c) => (
                        <button key={c.id} onClick={() => toggleKid(c.name)} style={{
                          padding: "7px 16px", borderRadius: 20, cursor: "pointer", fontFamily: fontSans, fontWeight: 600, fontSize: 13,
                          border: `1.5px solid ${kids.includes(c.name) ? C.clay : C.softBorder}`,
                          background: kids.includes(c.name) ? C.clay + "22" : C.white,
                          color: kids.includes(c.name) ? C.clay : C.textMuted, transition: "all .15s",
                        }}>{c.name}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn small onClick={() => { onUpdateDetails(dateStr, { start, end, kids, label }); onClose(); }}>Save Changes</Btn>
                  <Btn small variant="secondary" onClick={() => setEditing(false)}>Cancel</Btn>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
