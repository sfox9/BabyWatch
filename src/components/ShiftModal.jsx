import { useEffect, useState } from "react";
import { C, fontSans } from "../lib/theme";
import { fmt12, prettyDateFull } from "../lib/time";
import { Btn, Modal, Select, Input } from "./UI";

const LABEL_SUGGESTIONS = ["School Drop Off", "School Pick Up", "Work", "Doctor Visit", "Event", "Date Night", "Overnight"];

function ShiftCard({ shift, dateStr, currentUser, members, childrenList, onClaim, onUnclaim, onAssign, onDelete, onUpdateDetails }) {
  const [assignId, setAssignId] = useState("");
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(shift.start);
  const [end, setEnd] = useState(shift.end);
  const [kids, setKids] = useState(shift.kids || []);
  const [label, setLabel] = useState(shift.label || "");

  useEffect(() => {
    setStart(shift.start);
    setEnd(shift.end);
    setKids(shift.kids || []);
    setLabel(shift.label || "");
    setEditing(false);
    setAssignId("");
  }, [shift]);

  const isParent = currentUser?.role === "parent";
  const covered = Boolean(shift.coveredByName);
  const mine = shift.coveredById === currentUser?.id;
  const toggleKid = (k) => setKids((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  return (
    <div style={{ border: `1.5px solid ${C.softBorder}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
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

      <div style={{ background: covered ? C.sageMuted + "33" : C.dustyRose + "22", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
        <div style={{ fontWeight: 700, color: covered ? C.sage : C.dustyRose }}>
          {covered ? `Covered by ${shift.coveredByName}` : "Open — needs coverage"}
        </div>
      </div>

      {!isParent && !covered && (
        <Btn onClick={() => onClaim(shift)} variant="sage" style={{ width: "100%", marginBottom: 10 }}>
          Claim this shift
        </Btn>
      )}
      {!isParent && covered && mine && (
        <Btn onClick={() => onUnclaim(shift)} variant="secondary" style={{ width: "100%", marginBottom: 10 }}>
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
                  if (m) onAssign(shift, m);
                }}>Assign</Btn>
                {covered && (
                  <Btn small variant="secondary" onClick={() => onAssign(shift, null)}>Clear</Btn>
                )}
                <Btn small variant="ghost" onClick={() => setEditing(true)}>Edit Details</Btn>
                <Btn small variant="danger" onClick={() => onDelete(shift)}>Delete Shift</Btn>
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
                <Btn small onClick={() => { onUpdateDetails(shift, { start, end, kids, label }); setEditing(false); }}>Save Changes</Btn>
                <Btn small variant="secondary" onClick={() => setEditing(false)}>Cancel</Btn>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ShiftModal({
  open, onClose, dateStr, shiftList, currentUser, members, childrenList,
  onClaim, onUnclaim, onAssign, onDelete, onUpdateDetails, onAddAnother,
}) {
  if (!dateStr) return null;

  return (
    <Modal open={open} onClose={onClose} title={prettyDateFull(dateStr)}>
      <div style={{ fontFamily: fontSans }}>
        {(shiftList || []).length === 0 && (
          <div style={{ fontFamily: fontSans, fontSize: 14, color: C.textMuted, padding: "10px 0 18px" }}>
            No shifts left on this day.
          </div>
        )}
        {(shiftList || []).map((shift) => (
          <ShiftCard
            key={shift.id} shift={shift} dateStr={dateStr} currentUser={currentUser}
            members={members} childrenList={childrenList}
            onClaim={(s) => { onClaim(s); }}
            onUnclaim={(s) => { onUnclaim(s); }}
            onAssign={(s, m) => onAssign(s, m)}
            onDelete={(s) => onDelete(s)}
            onUpdateDetails={(s, details) => onUpdateDetails(s, details)}
          />
        ))}

        {onAddAnother && (
          <Btn variant="ghost" onClick={() => onAddAnother(dateStr)} style={{ width: "100%" }}>
            + Add another shift
          </Btn>
        )}
      </div>
    </Modal>
  );
}
