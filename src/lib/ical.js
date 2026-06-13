// iCal (.ics) export — compatible with Skylight, Apple Calendar, Google Calendar.

function icsEscape(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function stamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function generateICal(shiftsMap) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BabyWatch//Family Shifts//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:BabyWatch Shifts",
  ];
  const dtstamp = stamp();
  Object.entries(shiftsMap).forEach(([dateStr, shift]) => {
    if (!shift) return;
    const ymd = dateStr.replace(/-/g, "");
    const start = (shift.start || "07:00").replace(":", "") + "00";
    const end = (shift.end || "19:00").replace(":", "") + "00";
    const kids = shift.kids?.length ? shift.kids.join(", ") : "children";
    const status = shift.coveredByName ? `Covered by ${shift.coveredByName}` : "OPEN - needs coverage";
    lines.push(
      "BEGIN:VEVENT",
      `UID:babywatch-${shift.id || dateStr}@babywatch.app`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${ymd}T${start}`,
      `DTEND:${ymd}T${end}`,
      `SUMMARY:${icsEscape(`BabyWatch: ${kids} (${status})`)}`,
      `DESCRIPTION:${icsEscape(`${status}. Kids: ${kids}.`)}`,
      "END:VEVENT"
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadICal(shiftsMap) {
  const blob = new Blob([generateICal(shiftsMap)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "babywatch.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
