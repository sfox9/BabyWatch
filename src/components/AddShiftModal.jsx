import { useEffect, useState } from "react";
import { C, fontSans } from "../lib/theme";
import { prettyDateFull } from "../lib/time";
import { Btn, Input, Modal } from "./UI";

const LABEL_SUGGESTIONS = ["School Drop Off", "School Pick Up", "Work", "Doctor Visit", "Event", "Date Night", "Overnight"];

export default function AddShiftModal({ open, onClose, selectedDate, onAdd, childrenList }) {
  const [start, setStart] = useState("07:00");
  const [end, setEnd] = useState("19:00");
  const [kids, setKids] = useState([]);
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (open) { setKids(childrenList.map((c) => c.name)); setLabel(""); }
  }, [open, childrenList]);

  const toggleKid = (k) => setKids((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  return (
    <Modal open={open} onClose={onClose} title="Post New Shift">
      <div style={{ fontFamily: fontSans }}>
        {selectedDate && (
          <div style={{ background: C.sand, borderRadius: 10, padding: "8px 14px", marginBottom: 16, color: C.warm, fontWeight: 600, fontSize: 14 }}>
            {prettyDateFull(selectedDate)}
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}><Input label="Start Time" type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div style={{ flex: 1 }}><Input label="End Time" type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
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

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Which kids need care?
          </div>
          {childrenList.length === 0 ? (
            <div style={{ fontSize: 13, color: C.textMuted, background: C.white, border: `1.5px dashed ${C.softBorder}`, borderRadius: 10, padding: "10px 14px" }}>
              No children added yet — add them in Settings first, or post the shift without names.
            </div>
          ) : (
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
          )}
        </div>

        <Btn onClick={() => { onAdd(selectedDate, { start, end, kids, label }); onClose(); }} style={{ width: "100%" }}>
          Post Shift
        </Btn>
      </div>
    </Modal>
  );
}
