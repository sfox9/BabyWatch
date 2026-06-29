import { useEffect, useState } from "react";
import { C, fontSans, DAYS } from "../lib/theme";
import { prettyDateFull, dateKey } from "../lib/time";
import { Btn, Input, Modal } from "./UI";
import { CareNotePicker } from "./CareNotes";

const LABEL_SUGGESTIONS = ["School Drop Off", "School Pick Up", "Work", "Doctor Visit", "Event", "Date Night", "Overnight"];

function parseKey(k) { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); }
function ymd(d) { return dateKey(d.getFullYear(), d.getMonth(), d.getDate()); }

export default function AddShiftModal({ open, onClose, selectedDate, onAdd, childrenList }) {
  const [start, setStart] = useState("07:00");
  const [end, setEnd] = useState("19:00");
  const [kids, setKids] = useState([]);
  const [label, setLabel] = useState("");
  const [noteIds, setNoteIds] = useState([]);
  const [repeat, setRepeat] = useState("none"); // "none" | "daily" | "weekly"
  const [weekdays, setWeekdays] = useState([]); // 0=Sun..6=Sat
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (open) {
      setKids(childrenList.map((c) => c.name));
      setLabel("");
      setNoteIds([]);
      setRepeat("none");
      if (selectedDate) {
        const s = parseKey(selectedDate);
        setWeekdays([s.getDay()]);
        const e = new Date(s); e.setDate(e.getDate() + 28);
        setEndDate(ymd(e));
      }
    }
  }, [open, childrenList, selectedDate]);

  const toggleKid = (k) => setKids((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const toggleNote = (id) => setNoteIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleWeekday = (n) => setWeekdays((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));

  // Expand the recurrence into the list of dates to create (capped for safety).
  function buildDates() {
    if (!selectedDate || repeat === "none") return [selectedDate];
    const start0 = parseKey(selectedDate);
    const end0 = endDate ? parseKey(endDate) : start0;
    if (end0 < start0) return [selectedDate];
    const out = [];
    const cur = new Date(start0);
    let guard = 0;
    while (cur <= end0 && guard < 400) {
      guard++;
      if (repeat === "daily" || (repeat === "weekly" && weekdays.includes(cur.getDay()))) out.push(ymd(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return out.length ? out : [selectedDate];
  }
  const occurrenceCount = buildDates().length;

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

        {/* Repeat */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Repeat
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: repeat === "none" ? 0 : 12 }}>
            {[["none", "Once"], ["daily", "Daily"], ["weekly", "Weekly"]].map(([val, lbl]) => (
              <button key={val} onClick={() => setRepeat(val)} style={{
                flex: 1, padding: "8px 0", borderRadius: 10, cursor: "pointer",
                fontFamily: fontSans, fontWeight: 700, fontSize: 13,
                border: `1.5px solid ${repeat === val ? C.clay : C.softBorder}`,
                background: repeat === val ? C.clay + "22" : C.white,
                color: repeat === val ? C.clay : C.textMuted,
              }}>{lbl}</button>
            ))}
          </div>
          {repeat === "weekly" && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
              {DAYS.map((d, i) => (
                <button key={d} onClick={() => toggleWeekday(i)} style={{
                  width: 38, padding: "7px 0", borderRadius: 9, cursor: "pointer",
                  fontFamily: fontSans, fontWeight: 700, fontSize: 12,
                  border: `1.5px solid ${weekdays.includes(i) ? C.clay : C.softBorder}`,
                  background: weekdays.includes(i) ? C.clay + "22" : C.white,
                  color: weekdays.includes(i) ? C.clay : C.textMuted,
                }}>{d[0]}</button>
              ))}
            </div>
          )}
          {repeat !== "none" && (
            <>
              <Input label="Repeat until" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: -8 }}>
                Creates {occurrenceCount} shift{occurrenceCount === 1 ? "" : "s"}.
              </div>
            </>
          )}
        </div>

        <CareNotePicker childrenList={childrenList} kids={kids} selected={noteIds} onToggle={toggleNote} />
        <Btn onClick={() => { onAdd(buildDates(), { start, end, kids, label, noteIds }); onClose(); }} style={{ width: "100%" }}>
          {repeat === "none" ? "Post Shift" : `Post ${occurrenceCount} Shift${occurrenceCount === 1 ? "" : "s"}`}
        </Btn>
      </div>
    </Modal>
  );
}
