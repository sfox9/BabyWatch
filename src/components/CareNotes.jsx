import { C, fontSans } from "../lib/theme";

// Notes available to attach to a shift, for the given kid names.
// Falls back to all children's notes when no kids are selected.
export function availableNotes(childrenList, kids) {
  const list = childrenList || [];
  const relevant = kids && kids.length ? list.filter((c) => kids.includes(c.name)) : list;
  const out = [];
  relevant.forEach((c) => (c.notes || []).forEach((note) => out.push({ childName: c.name, note })));
  return out;
}

// Resolve attached note ids into displayable notes (with the child's name).
export function resolveNotes(childrenList, noteIds) {
  if (!noteIds || !noteIds.length) return [];
  const out = [];
  (childrenList || []).forEach((c) =>
    (c.notes || []).forEach((n) => { if (noteIds.includes(n.id)) out.push({ childName: c.name, ...n }); })
  );
  return out;
}

// Parent-facing checkbox list to attach care notes to a shift.
export function CareNotePicker({ childrenList, kids, selected, onToggle }) {
  const opts = availableNotes(childrenList, kids);
  if (opts.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Attach care notes for the caregiver
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {opts.map(({ childName, note }) => {
          const on = (selected || []).includes(note.id);
          return (
            <button key={note.id} onClick={() => onToggle(note.id)} style={{
              display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left",
              padding: "9px 12px", borderRadius: 10, cursor: "pointer",
              border: `1.5px solid ${on ? C.clay : C.softBorder}`,
              background: on ? C.clay + "14" : C.white, fontFamily: fontSans,
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                border: `1.5px solid ${on ? C.clay : C.softBorder}`,
                background: on ? C.clay : C.white, color: C.white,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800,
              }}>{on ? "✓" : ""}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: C.warm }}>
                  {note.title || "Untitled note"}
                  <span style={{ fontWeight: 600, color: C.textMuted, fontSize: 12 }}>{"  ·  "}{childName}</span>
                </span>
                {note.body && (
                  <span style={{ display: "block", fontSize: 12.5, color: C.text, lineHeight: 1.4, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {note.body}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Read-only list of the care notes attached to a shift (what caregivers see).
export function CareNoteList({ childrenList, noteIds }) {
  const notes = resolveNotes(childrenList, noteIds);
  if (!notes.length) return null;
  return (
    <div style={{ background: C.sage + "14", border: `1.5px solid ${C.sage}55`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: C.sage, marginBottom: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Care Notes
      </div>
      {notes.map((note) => (
        <div key={note.id} style={{ marginBottom: 8 }}>
          <div style={{ fontFamily: fontSans, fontSize: 13.5, fontWeight: 700, color: C.warm }}>
            {note.title || "Note"}
            <span style={{ fontWeight: 600, color: C.textMuted, fontSize: 12 }}>{"  ·  "}{note.childName}</span>
          </div>
          {note.body && (
            <div style={{ fontFamily: fontSans, fontSize: 13, color: C.text, lineHeight: 1.5, marginTop: 2, whiteSpace: "pre-wrap" }}>
              {note.body}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
