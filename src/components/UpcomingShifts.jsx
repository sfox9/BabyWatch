import { C, font, fontSans, DAYS, MONTHS } from "../lib/theme";
import { fmt12, todayKey } from "../lib/time";
import { downloadICal } from "../lib/ical";
import { Badge } from "./UI";

export default function UpcomingShifts({ shifts, onShiftClick }) {
  const today = todayKey();
  const upcoming = Object.entries(shifts)
    .filter(([k]) => k >= today)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 6);

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontFamily: font, fontSize: 20, color: C.warm }}>Upcoming Shifts</div>
        <button onClick={() => downloadICal(shifts)} style={{
          background: C.sand, border: `1.5px solid ${C.softBorder}`, borderRadius: 20, padding: "6px 14px",
          fontFamily: fontSans, fontSize: 12, fontWeight: 700, color: C.warm, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1 V8 M3 5.5 L6 8.5 L9 5.5 M1.5 10.5 H10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Export iCal
        </button>
      </div>

      {upcoming.length === 0 && (
        <div style={{
          fontFamily: fontSans, fontSize: 14, color: C.textMuted, padding: 20, textAlign: "center",
          background: C.white, borderRadius: 14, border: `1.5px solid ${C.softBorder}`,
        }}>
          No upcoming shifts posted yet.
        </div>
      )}

      {upcoming.map(([key, shift]) => {
        const [y, m, d] = key.split("-").map(Number);
        const weekday = DAYS[new Date(y, m - 1, d).getDay()];
        return (
          <div key={key} onClick={() => onShiftClick(key)}
            style={{
              background: C.white, borderRadius: 14, padding: "12px 16px", marginBottom: 10,
              display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
              border: `1.5px solid ${C.softBorder}`, transition: "box-shadow .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 14px rgba(139,99,71,0.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "")}
          >
            <div style={{ textAlign: "center", minWidth: 48, background: C.sand, borderRadius: 10, padding: "6px 8px" }}>
              <div style={{ fontFamily: fontSans, fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase" }}>{weekday}</div>
              <div style={{ fontFamily: font, fontSize: 20, color: C.warm, fontWeight: 700 }}>{d}</div>
              <div style={{ fontFamily: fontSans, fontSize: 10, color: C.textMuted }}>{MONTHS[m - 1].slice(0, 3)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: fontSans, fontSize: 14, fontWeight: 700, color: C.text }}>
                {fmt12(shift.start)} – {fmt12(shift.end)}
                {shift.label && <span style={{ color: C.clay, fontWeight: 700 }}> · {shift.label}</span>}
              </div>
              <div style={{ fontFamily: fontSans, fontSize: 12, color: C.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {shift.kids?.length ? shift.kids.join(", ") : "All kids"}
                {shift.postedByName && <span> · posted by {shift.postedByName.split(" ")[0]}</span>}
              </div>
            </div>
            <div>
              {shift.coveredByName
                ? <Badge color={C.sage}>{shift.coveredByName.split(" ")[0]}</Badge>
                : <Badge color={C.dustyRose}>Open</Badge>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
