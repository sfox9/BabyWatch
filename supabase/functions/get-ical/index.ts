// BabyWatch iCal Feed — Supabase Edge Function.
// Returns a live iCalendar (.ics) feed for a family's shifts.
// Subscribe to it in Skylight, Apple Calendar, Google Calendar, Outlook, etc.
//
// URL: https://<project>.supabase.co/functions/v1/get-ical?token=<ical_token>&tz=America/New_York
//
// HOW TO DEPLOY:
//   supabase functions deploy get-ical --project-ref <ref> --no-verify-jwt
//   OR Supabase dashboard -> Edge Functions -> get-ical -> disable "Enforce JWT"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Parse "7:30 AM" / "7:30 PM" OR 24-hour "07:30" / "14:00" into { h, m }
function parseTime(timeStr: string): { h: number; m: number } {
  const match12 = (timeStr || "").match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match12) {
    let h = parseInt(match12[1]);
    const m = parseInt(match12[2]);
    const period = match12[3].toUpperCase();
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return { h, m };
  }
  const match24 = (timeStr || "").match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return { h: parseInt(match24[1]), m: parseInt(match24[2]) };
  }
  return { h: 8, m: 0 };
}

// "2026-06-18" + "07:30" -> "20260618T073000"
function toICalDateTime(dateStr: string, timeStr: string): string {
  const { h, m } = parseTime(timeStr);
  const d = dateStr.replace(/-/g, "");
  return `${d}T${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
}

// Return DTSTART or DTEND property line.
function dtProp(prop: string, dateStr: string, timeStr: string, tz: string): string {
  const val = toICalDateTime(dateStr, timeStr);
  return tz ? `${prop};TZID=${tz}:${val}` : `${prop}:${val}`;
}

function escIcal(s: string): string {
  return (s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// iCal lines must be <= 75 octets; fold longer lines with CRLF + SPACE
function fold(line: string): string {
  if (line.length <= 75) return line;
  let out = "";
  let pos = 0;
  while (pos < line.length) {
    out += (pos === 0 ? "" : "\r\n ") + line.slice(pos, pos + 74);
    pos += 74;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const tz = url.searchParams.get("tz") || "";

  if (!token) {
    return new Response("Missing ?token= parameter.", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: family } = await sb
    .from("families")
    .select("id, name, code")
    .eq("ical_token", token)
    .maybeSingle();

  if (!family) {
    return new Response("Invalid or expired token.", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const { data: shifts } = await sb
    .from("shifts")
    .select("*")
    .eq("family_id", family.id)
    .order("date");

  const calName = escIcal(family.name || `BabyWatch - ${family.code}`);
  const stampNow = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";

  const events = (shifts || []).map((s) => {
    const kids = (s.kids || []).join(", ");
    const baseSummary = [s.label, kids].filter(Boolean).join(" - ") || "Childcare Shift";
    const summary = s.covered_by_name
      ? `${baseSummary}: Covered by ${s.covered_by_name}`
      : baseSummary;
    const descParts: string[] = [];
    if (s.covered_by_name) descParts.push(`Covered by: ${s.covered_by_name}`);
    else descParts.push("Open — not yet covered");
    if (s.created_by_name) descParts.push(`Posted by: ${s.created_by_name}`);

    return [
      "BEGIN:VEVENT",
      fold(`UID:babywatch-${s.id}`),
      `DTSTAMP:${stampNow}`,
      fold(dtProp("DTSTART", s.date, s.start_time, tz)),
      fold(dtProp("DTEND", s.date, s.end_time, tz)),
      fold(`SUMMARY:${escIcal(summary)}`),
      fold(`DESCRIPTION:${escIcal(descParts.join("\n"))}`),
      "END:VEVENT",
    ].join("\r\n");
  });

  const ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BabyWatch//BabyWatch//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${calName}`),
    "X-WR-CALDESC:Family shifts from BabyWatch",
    "X-PUBLISHED-TTL:PT15M",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ical, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="babywatch.ics"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
});
