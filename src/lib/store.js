// BabyWatch data layer.
// Two modes, one API:
//   CLOUD  — Supabase (set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY): shared
//            family data, realtime sync, email notifications via Edge Function.
//   DEVICE — localStorage fallback: everything persists across refreshes on
//            this device. No data ever resets on refresh in either mode.
// The rest of the app only talks to this module, which keeps the codebase
// ready to wrap with Capacitor or Expo later without a rewrite.

import { getSupabase, isCloudMode } from "./supabaseClient";
import { fmt12, prettyDate } from "./time";

const LS_DB = "babywatch_db_v2";
const LS_SESSION = "babywatch_session_v2";

// ── helpers ──────────────────────────────────────────────────────────────────

async function hashPassword(pw) {
  const data = new TextEncoder().encode("babywatch::" + pw);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

// Random, unambiguous family invite code (no 0/O/1/I/L).
function genFamilyCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// ── device-mode storage ──────────────────────────────────────────────────────

function readDB() {
  try {
    const raw = localStorage.getItem(LS_DB);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* corrupted — start fresh */ }
  return { members: [], children: [], shifts: {}, notifications: [] };
}

function writeDB(db) {
  localStorage.setItem(LS_DB, JSON.stringify(db));
}

// ── session ──────────────────────────────────────────────────────────────────

function saveSession(user) {
  localStorage.setItem(LS_SESSION, JSON.stringify({ id: user.id, familyId: user.familyId }));
}

export function clearSession() {
  localStorage.removeItem(LS_SESSION);
}

function readSessionRef() {
  try {
    const raw = localStorage.getItem(LS_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// ── shape mappers (cloud rows -> app objects) ───────────────────────────────

function mapMember(r) {
  return {
    id: r.id, familyId: r.family_id, name: r.name, email: r.email, role: r.role, tag: r.tag || "",
    familyCode: r.families?.code || r.familyCode || "",
  };
}

function mapShift(r) {
  return {
    id: r.id,
    date: r.date,
    start: r.start_time,
    end: r.end_time,
    kids: r.kids || [],
    coveredById: r.covered_by_id,
    coveredByName: r.covered_by_name,
  };
}

// ── public API ───────────────────────────────────────────────────────────────

export const store = {
  mode: isCloudMode() ? "cloud" : "device",

  // —— auth ——
  async restoreSession() {
    const ref = readSessionRef();
    if (!ref) return null;
    if (isCloudMode()) {
      const sb = getSupabase();
      const { data } = await sb.from("members").select("*, families(code)").eq("id", ref.id).maybeSingle();
      return data ? mapMember(data) : null;
    }
    const db = readDB();
    const u = db.members.find((m) => m.id === ref.id);
    if (!u) return null;
    const pub = { ...u, familyCode: db.familyCode || "" };
    delete pub.password_hash;
    return pub;
  },

  // `code` is a family's invite code. If provided, the new member joins that
  // family (used for family/nanny sign-ups and for adding a second parent).
  // If a parent signs up with no code, a brand-new family is created with a
  // freshly generated random code.
  async signUp({ name, email, password, role, tag, code }) {
    email = email.trim().toLowerCase();
    name = name.trim();
    code = (code || "").trim().toUpperCase();
    if (!name || !email || !password) throw new Error("Please fill in all fields.");
    if (role === "family" && !code) {
      throw new Error("Please enter your family's invite code (ask a parent for it, or use their invite link).");
    }
    const password_hash = await hashPassword(password);

    if (isCloudMode()) {
      const sb = getSupabase();
      const { data: existing } = await sb.from("members").select("id").eq("email", email).maybeSingle();
      if (existing) throw new Error("That email is already registered.");

      let fam;
      if (code) {
        const { data: f } = await sb.from("families").select("*").eq("code", code).maybeSingle();
        if (!f) throw new Error("That family code wasn't found. Double-check the code or invite link.");
        fam = f;
      } else {
        for (let i = 0; i < 6 && !fam; i++) {
          const tryCode = genFamilyCode();
          const { data: created } = await sb.from("families").insert({ code: tryCode }).select().maybeSingle();
          if (created) fam = created;
        }
        if (!fam) throw new Error("Could not create your family. Please try again.");
      }

      const { data, error } = await sb
        .from("members")
        .insert({ family_id: fam.id, name, email, password_hash, role, tag: tag?.trim() || (role === "parent" ? "Parent" : "Family") })
        .select()
        .single();
      if (error) throw new Error("Could not create the account. Please try again.");
      const user = mapMember({ ...data, families: { code: fam.code } });
      saveSession(user);
      return user;
    }

    const db = readDB();
    if (db.members.find((m) => m.email === email)) throw new Error("That email is already registered.");
    if (!db.familyCode) db.familyCode = genFamilyCode();
    if (code && db.members.length && code !== db.familyCode) {
      throw new Error("That family code doesn't match this device's family.");
    }
    const user = {
      id: uid(),
      familyId: "local-family",
      name,
      email,
      role,
      tag: tag?.trim() || (role === "parent" ? "Parent" : "Family"),
      password_hash,
    };
    db.members.push(user);
    writeDB(db);
    const pub = { ...user, familyCode: db.familyCode };
    delete pub.password_hash;
    saveSession(pub);
    return pub;
  },

  async signIn({ email, password }) {
    email = email.trim().toLowerCase();
    const password_hash = await hashPassword(password);
    if (isCloudMode()) {
      const sb = getSupabase();
      const { data } = await sb.from("members").select("*, families(code)").eq("email", email).eq("password_hash", password_hash).maybeSingle();
      if (!data) throw new Error("Invalid email or password.");
      const user = mapMember(data);
      saveSession(user);
      return user;
    }
    const db = readDB();
    const u = db.members.find((m) => m.email === email && m.password_hash === password_hash);
    if (!u) throw new Error("Invalid email or password.");
    const pub = { ...u, familyCode: db.familyCode || "" };
    delete pub.password_hash;
    saveSession(pub);
    return pub;
  },

  signOut() {
    clearSession();
  },

  // —— fetch everything the app needs ——
  async fetchAll(user) {
    if (isCloudMode()) {
      const sb = getSupabase();
      const [mem, kids, sh, notes] = await Promise.all([
        sb.from("members").select("*").eq("family_id", user.familyId).order("created_at"),
        sb.from("children").select("*").eq("family_id", user.familyId).order("created_at"),
        sb.from("shifts").select("*").eq("family_id", user.familyId),
        sb.from("notifications").select("*").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(30),
      ]);
      const shifts = {};
      (sh.data || []).forEach((r) => { shifts[r.date] = mapShift(r); });
      return {
        members: (mem.data || []).map(mapMember),
        children: (kids.data || []).map((r) => ({ id: r.id, name: r.name })),
        shifts,
        notifications: (notes.data || []).map((n) => ({ id: n.id, message: n.message, read: n.read, createdAt: n.created_at })),
      };
    }
    const db = readDB();
    return {
      members: db.members.map((m) => ({ id: m.id, familyId: m.familyId, name: m.name, email: m.email, role: m.role, tag: m.tag })),
      children: db.children,
      shifts: db.shifts,
      notifications: db.notifications
        .filter((n) => n.recipientId === user.id)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, 30)
        .map((n) => ({ id: n.id, message: n.message, read: n.read, createdAt: n.createdAt })),
    };
  },

  // —— shifts ——
  async addShift(user, { date, start, end, kids }) {
    if (isCloudMode()) {
      const sb = getSupabase();
      const { error } = await sb.from("shifts").insert({
        family_id: user.familyId, date, start_time: start, end_time: end, kids, created_by: user.id,
      });
      if (error) throw new Error("Could not post the shift (is there already one on that day?).");
      return;
    }
    const db = readDB();
    db.shifts[date] = { id: uid(), date, start, end, kids, coveredById: null, coveredByName: null };
    writeDB(db);
  },

  async updateShiftDetails(user, date, { start, end, kids }) {
    if (isCloudMode()) {
      const sb = getSupabase();
      await sb.from("shifts").update({ start_time: start, end_time: end, kids }).eq("family_id", user.familyId).eq("date", date);
      return;
    }
    const db = readDB();
    if (db.shifts[date]) {
      db.shifts[date] = { ...db.shifts[date], start, end, kids };
      writeDB(db);
    }
  },

  async assignShift(user, date, member /* member object or null to clear */) {
    if (isCloudMode()) {
      const sb = getSupabase();
      await sb.from("shifts").update({
        covered_by_id: member ? member.id : null,
        covered_by_name: member ? member.name : null,
      }).eq("family_id", user.familyId).eq("date", date);
      return;
    }
    const db = readDB();
    if (db.shifts[date]) {
      db.shifts[date] = { ...db.shifts[date], coveredById: member ? member.id : null, coveredByName: member ? member.name : null };
      writeDB(db);
    }
  },

  async deleteShift(user, date) {
    if (isCloudMode()) {
      const sb = getSupabase();
      await sb.from("shifts").delete().eq("family_id", user.familyId).eq("date", date);
      return;
    }
    const db = readDB();
    delete db.shifts[date];
    writeDB(db);
  },

  // —— children ——
  async addChild(user, name) {
    name = name.trim();
    if (!name) return;
    if (isCloudMode()) {
      const sb = getSupabase();
      await sb.from("children").insert({ family_id: user.familyId, name });
      return;
    }
    const db = readDB();
    db.children.push({ id: uid(), name });
    writeDB(db);
  },

  async removeChild(user, childId) {
    if (isCloudMode()) {
      const sb = getSupabase();
      await sb.from("children").delete().eq("id", childId);
      return;
    }
    const db = readDB();
    db.children = db.children.filter((c) => c.id !== childId);
    writeDB(db);
  },

  // —— members ——
  async removeMember(user, memberId) {
    if (memberId === user.id) return;
    if (isCloudMode()) {
      const sb = getSupabase();
      // free any future shifts they were covering
      await sb.from("shifts").update({ covered_by_id: null, covered_by_name: null }).eq("covered_by_id", memberId);
      await sb.from("members").delete().eq("id", memberId);
      return;
    }
    const db = readDB();
    db.members = db.members.filter((m) => m.id !== memberId);
    Object.keys(db.shifts).forEach((d) => {
      if (db.shifts[d].coveredById === memberId) {
        db.shifts[d] = { ...db.shifts[d], coveredById: null, coveredByName: null };
      }
    });
    writeDB(db);
  },

  // —— notifications ——
  async notify(user, recipients, message) {
    if (!recipients.length) return;
    if (isCloudMode()) {
      const sb = getSupabase();
      await sb.from("notifications").insert(
        recipients.map((r) => ({ family_id: user.familyId, recipient_id: r.id, message }))
      );
      // Email via Edge Function (no-op until RESEND_API_KEY is configured)
      try {
        await sb.functions.invoke("send-email", {
          body: {
            to: recipients.map((r) => r.email).filter(Boolean),
            subject: "BabyWatch update",
            text: message,
          },
        });
      } catch (e) { /* email is best-effort */ }
      return;
    }
    const db = readDB();
    recipients.forEach((r) => {
      db.notifications.push({ id: uid(), recipientId: r.id, message, read: false, createdAt: new Date().toISOString() });
    });
    writeDB(db);
  },

  async markNotificationsRead(user) {
    if (isCloudMode()) {
      const sb = getSupabase();
      await sb.from("notifications").update({ read: true }).eq("recipient_id", user.id).eq("read", false);
      return;
    }
    const db = readDB();
    db.notifications.forEach((n) => {
      if (n.recipientId === user.id) n.read = true;
    });
    writeDB(db);
  },

  // —— realtime sync (cloud) / cross-tab sync (device) ——
  subscribe(user, onChange) {
    if (isCloudMode()) {
      const sb = getSupabase();
      const channel = sb
        .channel("babywatch-sync")
        .on("postgres_changes", { event: "*", schema: "public" }, () => onChange())
        .subscribe();
      return () => sb.removeChannel(channel);
    }
    const handler = (e) => { if (e.key === LS_DB) onChange(); };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  },
};

// ── notification message builders ───────────────────────────────────────────

export function shiftPostedMessage(poster, date, start, end, kids) {
  const kidStr = kids?.length ? ` for ${kids.join(" and ")}` : "";
  return `${poster.name} posted a new shift${kidStr} on ${prettyDate(date)}, ${fmt12(start)} to ${fmt12(end)}. Open the calendar to claim it.`;
}

export function shiftClaimedMessage(claimer, date) {
  return `${claimer.name} (${claimer.tag || "family"}) claimed the shift on ${prettyDate(date)}.`;
}
