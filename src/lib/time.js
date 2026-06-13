import { DAYS, MONTHS } from "./theme";

// "07:00" (24h) -> "7:00 AM"
export function fmt12(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  const am = h < 12;
  let hr = h % 12;
  if (hr === 0) hr = 12;
  return `${hr}:${String(m).padStart(2, "0")} ${am ? "AM" : "PM"}`;
}

export function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

export function firstDayOfMonth(y, m) {
  return new Date(y, m, 1).getDay();
}

export function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function todayKey() {
  const t = new Date();
  return dateKey(t.getFullYear(), t.getMonth(), t.getDate());
}

// "2026-06-20" -> "Sat, June 20"
export function prettyDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DAYS[dt.getDay()]}, ${MONTHS[m - 1]} ${d}`;
}

export function prettyDateFull(key) {
  const [y, m, d] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
