import { useState } from "react";
import { C, font, fontSans, DAYS, MONTHS } from "../lib/theme";
import { daysInMonth, firstDayOfMonth, dateKey, fmt12 } from "../lib/time";

function NavArrow({ dir, label, onClick }) {
  return (
    <button onClick={onClick} aria-label={label} style={{
      background: C.sand, border: "none", borderRadius: 20, width: 34, height: 34,
      cursor: "pointer", color: C.warm, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: dir === "prev" ? "rotate(180deg)" : "none" }}>
        <path d="M5 2 L10 7 L5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// -- small date helpers (local to the calendar) -------------------------------
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function startOfWeek(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; }
function keyOf(d) { return dateKey(d.getFullYear(), d.getMonth(), d.getDate()); }
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// A readable, detailed shift card used by the Week and Day views.
function ShiftCard({ shift }) {
  const covered = Boolean(shift.coveredByName);
  const accent = covered ? C.sage : C.dustyRose;
  return (
    <div style={{
      borderRadius: 10, padding: "10px 12px", marginTop: 6,
      background: covered ? C.sage + "14" : C.dustyRose + "14",
      border: `1.5px solid ${accent}66`,
    }}>
      {/* Time range + coverage status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontFamily: fontSans, fontWeight: 800, fontSize: 14, color: accent }}>
          {fmt12(shift.start)} – {fmt12(shift.end)}
        </div>
        <span style={{
          fontFamily: fontSans, fontSize: 11, fontWeight: 800, color: C.white,
          background: accent, borderRadius: 20, padding: "2px 10px", whiteSpace: "nowrap",
        }}>
          {covered ? shift.coveredByName : "Open"}
        </span>
      </div>
      {/* Optional label / note */}
      {shift.label && (
        <div style={{ fontFamily: fontSans, fontSize: 12.5, fontWeight: 700, color: C.clay, marginTop: 5 }}>
          {shift.label}
        </div>
      )}
      {/* Children being watched (full names) */}
      {shift.kids?.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
          <span style={{ fontFamily: fontSans, fontSize: 10.5, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Watching
          </span>
          {shift.kids.map((k) => (
            <span key={k} style={{
              fontFamily: fontSans, fontSize: 12, fontWeight: 700, color: C.earth,
              background: C.clay + "22", borderRadius: 8, padding: "2px 9px",
            }}>{k}</span>
          ))}
        </div>
      )}
      {/* Care notes indicator (full notes shown when the shift is opened) */}
      {shift.noteIds?.length > 0 && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5, marginTop: 7,
          background: C.sage + "22", color: C.sage, borderRadius: 8, padding: "2px 8px",
          fontFamily: fontSans, fontSize: 11, fontWeight: 800,
        }}>
          {shift.noteIds.length} care note{shift.noteIds.length > 1 ? "s" : ""}
        </div>
      )}
      {/* Who posted it (when available) */}
      {shift.postedByName && (
        <div style={{ fontFamily: fontSans, fontSize: 11, color: C.textMuted, marginTop: 7 }}>
          Posted by {shift.postedByName.split(" ")[0]}
        </div>
      )}
    </div>
  );
}

export default function CalendarView({ shifts, currentUser, onDayClick }) {
  const todayObj = new Date();
  const [mode, setMode] = useState("month"); // "month" | "week" | "day"
  const [anchor, setAnchor] = useState(() => new Date());
  const isParent = currentUser?.role === "parent";

  const aYear = anchor.getFullYear();
  const aMonth = anchor.getMonth();

  function prev() {
    if (mode === "month") setAnchor(new Date(aYear, aMonth - 1, 1));
    else if (mode === "week") setAnchor((a) => addDays(a, -7));
    else setAnchor((a) => addDays(a, -1));
  }
  function next() {
    if (mode === "month") setAnchor(new Date(aYear, aMonth + 1, 1));
    else if (mode === "week") setAnchor((a) => addDays(a, 7));
    else setAnchor((a) => addDays(a, 1));
  }

  // -- header label per mode --------------------------------------------------
  const weekStart = startOfWeek(anchor);
  const weekEnd = addDays(weekStart, 6);
  let title;
  if (mode === "month") {
    title = `${MONTHS[aMonth]} ${aYear}`;
  } else if (mode === "week") {
    const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
    title = sameMonth
      ? `${MONTHS[weekStart.getMonth()].slice(0, 3)} ${weekStart.getDate()} – ${weekEnd.getDate()}`
      : `${MONTHS[weekStart.getMonth()].slice(0, 3)} ${weekStart.getDate()} – ${MONTHS[weekEnd.getMonth()].slice(0, 3)} ${weekEnd.getDate()}`;
  } else {
    title = `${DAYS[anchor.getDay()]}, ${MONTHS[aMonth]} ${anchor.getDate()}`;
  }

  return (
    <div style={{ background: C.white, borderRadius: 20, padding: "16px 12px", boxShadow: "0 2px 20px rgba(139,99,71,0.08)" }}>
      {/* View mode toggle */}
      <div style={{
        display: "flex", gap: 4, background: C.cream, borderRadius: 12, padding: 4,
        marginBottom: 16, maxWidth: 280, marginLeft: "auto", marginRight: "auto",
      }}>
        {[["month", "Month"], ["week", "Week"], ["day", "Day"]].map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: "7px 0", borderRadius: 9, border: "none", cursor: "pointer",
            fontFamily: fontSans, fontSize: 13, fontWeight: 700,
            background: mode === m ? C.white : "transparent",
            color: mode === m ? C.clay : C.textMuted,
            boxShadow: mode === m ? "0 1px 4px rgba(139,99,71,0.15)" : "none",
            transition: "background .15s, color .15s",
          }}>{label}</button>
        ))}
      </div>

      {/* Period nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "0 4px" }}>
        <NavArrow dir="prev" label="Previous" onClick={prev} />
        <div style={{ fontFamily: font, fontSize: mode === "month" ? 22 : 19, color: C.clay, fontWeight: 600, textAlign: "center" }}>{title}</div>
        <NavArrow dir="next" label="Next" onClick={next} />
      </div>

      {/* ── Month view ── */}
      {mode === "month" && (() => {
        const fd = firstDayOfMonth(aYear, aMonth);
        const dim = daysInMonth(aYear, aMonth);
        const cells = Array(fd).fill(null).concat(Array.from({ length: dim }, (_, i) => i + 1));
        while (cells.length % 7 !== 0) cells.push(null);
        return (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 8 }}>
              {DAYS.map((d) => (
                <div key={d} style={{
                  textAlign: "center", fontSize: 11, fontFamily: fontSans, fontWeight: 700,
                  color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", padding: "4px 0",
                }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, overflow: "hidden" }}>
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const key = dateKey(aYear, aMonth, day);
                const dayShifts = shifts[key] || [];
                const isToday = todayObj.getFullYear() === aYear && todayObj.getMonth() === aMonth && todayObj.getDate() === day;
                const anyOpen = dayShifts.some((s) => !s.coveredByName);
                const hasShifts = dayShifts.length > 0;
                const clickable = hasShifts || isParent;
                return (
                  <div key={i} onClick={() => clickable && onDayClick(key)}
                    style={{
                      borderRadius: 12, padding: "5px 3px", minHeight: 68, minWidth: 0, overflow: "hidden", boxSizing: "border-box",
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
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {fmt12(shift.start)}-{fmt12(shift.end)}
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
          </>
        );
      })()}

      {/* ── Week view ── */}
      {mode === "week" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((d) => {
            const key = keyOf(d);
            const dayShifts = shifts[key] || [];
            const isToday = sameDay(d, todayObj);
            const hasShifts = dayShifts.length > 0;
            const clickable = hasShifts || isParent;
            return (
              <div key={key} onClick={() => clickable && onDayClick(key)}
                style={{
                  borderRadius: 14, padding: "10px 12px",
                  background: isToday ? C.clay + "12" : C.cream,
                  border: isToday ? `2px solid ${C.clay}` : `1.5px solid ${C.softBorder}`,
                  cursor: clickable ? "pointer" : "default",
                }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: fontSans, fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{DAYS[d.getDay()]}</span>
                  <span style={{ fontFamily: font, fontSize: 17, fontWeight: 700, color: isToday ? C.clay : C.warm }}>{d.getDate()}</span>
                  {isToday && <span style={{ fontFamily: fontSans, fontSize: 10, fontWeight: 800, color: C.clay }}>TODAY</span>}
                </div>
                {hasShifts
                  ? dayShifts.map((shift) => <ShiftCard key={shift.id} shift={shift} />)
                  : <div style={{ fontFamily: fontSans, fontSize: 12, color: C.textMuted, marginTop: 4 }}>{isParent ? "Tap to add a shift" : "No shifts"}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Day view ── */}
      {mode === "day" && (() => {
        const key = keyOf(anchor);
        const dayShifts = shifts[key] || [];
        const isToday = sameDay(anchor, todayObj);
        const hasShifts = dayShifts.length > 0;
        const clickable = hasShifts || isParent;
        return (
          <div onClick={() => clickable && onDayClick(key)}
            style={{
              borderRadius: 14, padding: "16px 14px", minHeight: 160,
              background: isToday ? C.clay + "12" : C.cream,
              border: isToday ? `2px solid ${C.clay}` : `1.5px solid ${C.softBorder}`,
              cursor: clickable ? "pointer" : "default",
            }}>
            {hasShifts
              ? dayShifts.map((shift) => <ShiftCard key={shift.id} shift={shift} />)
              : (
                <div style={{ textAlign: "center", padding: "28px 12px", fontFamily: fontSans, fontSize: 14, color: C.textMuted }}>
                  No shifts scheduled.{isParent && <><br /><span style={{ fontSize: 13 }}>Tap anywhere here to add one.</span></>}
                </div>
              )}
          </div>
        );
      })()}

      {/* Legend */}
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
