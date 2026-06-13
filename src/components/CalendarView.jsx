import { C, font, fontSans, DAYS, MONTHS } from "../lib/theme";
import { daysInMonth, firstDayOfMonth, dateKey, fmt12 } from "../lib/time";

function NavArrow({ dir, onClick }) {
  return (
    <button onClick={onClick} aria-label={dir === "prev" ? "Previous month" : "Next month"} style={{
      background: C.sand, border: "none", borderRadius: 20, width: 34, height: 34,
      cursor: "pointer", color: C.warm, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: dir === "prev" ? "rotate(180deg)" : "none" }}>
        <path d="M5 2 L10 7 L5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export default function CalendarView({ shifts, currentUser, onDayClick, year, month, setYear, setMonth }) {
  const todayObj = new Date();
  const fd = firstDayOfMonth(year, month);
  const dim = daysInMonth(year, month);
  const cells = Array(fd).fill(null).concat(Array.from({ length: dim }, (_, i) => i + 1));
  while (cells.length % 7 !== 0) cells.push(null);

  function prev() { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); }
  function next() { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); }

  return (
    <div style={{ background: C.white, borderRadius: 20, padding: "20px 12px 16px", boxShadow: "0 2px 20px rgba(139,99,71,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, padding: "0 8px" }}>
        <NavArrow dir="prev" onClick={prev} />
        <div style={{ fontFamily: font, fontSize: 22, color: C.clay, fontWeight: 600 }}>{MONTHS[month]} {year}</div>
        <NavArrow dir="next" onClick={next} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 8 }}>
        {DAYS.map((d) => (
          <div key={d} style={{
            textAlign: "center", fontSize: 11, fontFamily: fontSans, fontWeight: 700,
            color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", padding: "4px 0",
          }}>{d}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const key = dateKey(year, month, day);
          const dayShifts = shifts[key] || [];
          const isToday = todayObj.getFullYear() === year && todayObj.getMonth() === month && todayObj.getDate() === day;
          const anyOpen = dayShifts.some((s) => !s.coveredByName);
          const hasShifts = dayShifts.length > 0;
          const clickable = hasShifts || currentUser?.role === "parent";

          return (
            <div key={i} onClick={() => clickable && onDayClick(key)}
              style={{
                borderRadius: 12, padding: "5px 3px", minHeight: 68,
                cursor: clickable ? "pointer" : "default",
                background: hasShifts ? (anyOpen ? C.dustyRose + "1A" : C.sage + "1A") : (isToday ? C.clay + "15" : C.cream),
                border: isToday ? `2px solid ${C.clay}` : `1.5px solid ${hasShifts ? (anyOpen ? C.dustyRose + "66" : C.sage + "66") : C.softBorder}`,
                transition: "box-shadow .15s, transform .15s",
              }}
              onMouseEnter={(e) => { if (clickable) { e.currentTarget.style.boxShadow = "0 4px 14px rgba(196,149,106,0.25)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}
            >
              <div style={{ fontFamily: fontSans, fontSize: 13, fontWeight: isToday ? 800 : 500, color: isToday ? C.clay : C.text, textAlign: "right", paddingRight: 2 }}>{day}</div>
              {dayShifts.map((shift) => {
                const covered = Boolean(shift.coveredByName);
                return (
                  <div key={shift.id} style={{ marginTop: 3 }}>
                    <div style={{
                      borderRadius: 6, padding: "2px 3px", fontSize: 8.5, fontFamily: fontSans, fontWeight: 700,
                      background: covered ? C.sage + "33" : C.dustyRose + "33",
                      color: covered ? C.sage : C.dustyRose,
                      lineHeight: 1.25, marginBottom: 2, textAlign: "center",
                    }}>
                      {fmt12(shift.start)}–{fmt12(shift.end)}
                    </div>
                    <div style={{
                      fontSize: 9, fontFamily: fontSans, fontWeight: 600, textAlign: "center",
                      color: covered ? C.sage : C.dustyRose,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {covered ? shift.coveredByName.split(" ")[0] : "Open"}
                    </div>
                    {shift.label && (
                      <div style={{
                        fontSize: 8, fontFamily: fontSans, fontWeight: 700, textAlign: "center", color: C.clay,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1,
                      }}>
                        {shift.label}
                      </div>
                    )}
                    {shift.kids?.length > 0 && (
                      <div style={{ display: "flex", gap: 2, flexWrap: "wrap", marginTop: 2, justifyContent: "center" }}>
                        {shift.kids.map((k) => (
                          <span key={k} style={{
                            fontSize: 8, background: C.clay + "26", color: C.earth, borderRadius: 5,
                            padding: "1px 4px", fontFamily: fontSans, fontWeight: 800,
                          }}>{k[0]?.toUpperCase()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.softBorder}`, padding: "14px 8px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: fontSans, fontSize: 12, color: C.textMuted }}>
          <div style={{ width: 10, height: 10, borderRadius: 4, background: C.dustyRose + "99" }} /> Open shift
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: fontSans, fontSize: 12, color: C.textMuted }}>
          <div style={{ width: 10, height: 10, borderRadius: 4, background: C.sage + "99" }} /> Covered
        </div>
      </div>
    </div>
  );
}
import { C, font, fontSans, DAYS, MONTHS } from "../lib/theme";
import { daysInMonth, firstDayOfMonth, dateKey, fmt12 } from "../lib/time";

function NavArrow({ dir, onClick }) {
  return (
    <button onClick={onClick} aria-label={dir === "prev" ? "Previous month" : "Next month"} style={{
      background: C.sand, border: "none", borderRadius: 20, width: 34, height: 34,
      cursor: "pointer", color: C.warm, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: dir === "prev" ? "rotate(180deg)" : "none" }}>
        <path d="M5 2 L10 7 L5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export default function CalendarView({ shifts, currentUser, onDayClick, year, month, setYear, setMonth }) {
  const todayObj = new Date();
  const fd = firstDayOfMonth(year, month);
  const dim = daysInMonth(year, month);
  const cells = Array(fd).fill(null).concat(Array.from({ length: dim }, (_, i) => i + 1));
  while (cells.length % 7 !== 0) cells.push(null);

  function prev() { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); }
  function next() { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); }

  return (
    <div style={{ background: C.white, borderRadius: 20, padding: "20px 12px 16px", boxShadow: "0 2px 20px rgba(139,99,71,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, padding: "0 8px" }}>
        <NavArrow dir="prev" onClick={prev} />
        <div style={{ fontFamily: font, fontSize: 22, color: C.clay, fontWeight: 600 }}>{MONTHS[month]} {year}</div>
        <NavArrow dir="next" onClick={next} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 8 }}>
        {DAYS.map((d) => (
          <div key={d} style={{
            textAlign: "center", fontSize: 11, fontFamily: fontSans, fontWeight: 700,
            color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", padding: "4px 0",
          }}>{d}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const key = dateKey(year, month, day);
          const shift = shifts[key];
          const isToday = todayObj.getFullYear() === year && todayObj.getMonth() === month && todayObj.getDate() === day;
          const covered = Boolean(shift?.coveredByName);
          const open = shift && !covered;
          const clickable = shift || currentUser?.role === "parent";

          return (
            <div key={i} onClick={() => clickable && onDayClick(key)}
              style={{
                borderRadius: 12, padding: "5px 3px", minHeight: 68,
                cursor: clickable ? "pointer" : "default",
                background: shift ? (covered ? C.sage + "1A" : C.dustyRose + "1A") : (isToday ? C.clay + "15" : C.cream),
                border: isToday ? `2px solid ${C.clay}` : `1.5px solid ${shift ? (covered ? C.sage + "66" : C.dustyRose + "66") : C.softBorder}`,
                transition: "box-shadow .15s, transform .15s",
              }}
              onMouseEnter={(e) => { if (clickable) { e.currentTarget.style.boxShadow = "0 4px 14px rgba(196,149,106,0.25)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}
            >
              <div style={{ fontFamily: fontSans, fontSize: 13, fontWeight: isToday ? 800 : 500, color: isToday ? C.clay : C.text, textAlign: "right", paddingRight: 2 }}>{day}</div>
              {shift && (
                <div style={{ marginTop: 3 }}>
                  <div style={{
                    borderRadius: 6, padding: "2px 3px", fontSize: 8.5, fontFamily: fontSans, fontWeight: 700,
                    background: covered ? C.sage + "33" : C.dustyRose + "33",
                    color: covered ? C.sage : C.dustyRose,
                    lineHeight: 1.25, marginBottom: 2, textAlign: "center",
                  }}>
                    {fmt12(shift.start)}–{fmt12(shift.end)}
                  </div>
                  <div style={{
                    fontSize: 9, fontFamily: fontSans, fontWeight: 600, textAlign: "center",
                    color: covered ? C.sage : C.dustyRose,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {covered ? shift.coveredByName.split(" ")[0] : "Open"}
                  </div>
                  {shift.label && (
                    <div style={{
                      fontSize: 8, fontFamily: fontSans, fontWeight: 700, textAlign: "center", color: C.clay,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1,
                    }}>
                      {shift.label}
                    </div>
                  )}
                  {shift.kids?.length > 0 && (
                    <div style={{ display: "flex", gap: 2, flexWrap: "wrap", marginTop: 2, justifyContent: "center" }}>
                      {shift.kids.map((k) => (
                        <span key={k} style={{
                          fontSize: 8, background: C.clay + "26", color: C.earth, borderRadius: 5,
                          padding: "1px 4px", fontFamily: fontSans, fontWeight: 800,
                        }}>{k[0]?.toUpperCase()}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.softBorder}`, padding: "14px 8px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: fontSans, fontSize: 12, color: C.textMuted }}>
          <div style={{ width: 10, height: 10, borderRadius: 4, background: C.dustyRose + "99" }} /> Open shift
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: fontSans, fontSize: 12, color: C.textMuted }}>
          <div style={{ width: 10, height: 10, borderRadius: 4, background: C.sage + "99" }} /> Covered
        </div>
      </div>
    </div>
  );
}
