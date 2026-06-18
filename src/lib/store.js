// BabyWatch data layer.
// Two modes, one API:
//   CLOUD  - Supabase (set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY): shared
//            family data, realtime sync, email notifications via Edge Function.
//   DEVICE - localStorage fallback: everything persists across refreshes on
//            this device. No data ever resets on refresh in either mode.
// The rest of the app only talks to this module, which keeps the codebase
// ready to wrap with Capacitor or Expo later without a rewrite.

import { getSupabase, isCloudMode } from "./supabaseClient";
import { fmt12, prettyDate } from "./time";

const LS_DB = "babywatch_db_v2";
const LS_SESSION = "babywatch_session_v2";

// -- helpers ------------------------------------------------------------------

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

// -- device-mode storage ------------------------------------------------------

function readDB() {
  let db;
  try {
    const raw = localStorage.getItem(LS_DB);
    db = raw ? JSON.parse(raw) : null;
  } catch (e) { /* corrupted - start fresh */ }
  if (!db) db = { members: [], children: [], shifts: {}, notifications: [] };
  if (!db.shifts) db.shifts = {};
  // Migrate old shape ({date: shift}) to new shape ({date: [shift, ...]})
  Object.keys(db.shifts).forEach((k) => {
    if (db.shifts[k] && !Array.isArray(db.shifts[k])) db.shifts[k] = [db.shifts[k]];
  });
  return db;
}

function writeDB(db) {
  localStorage.setItem(LS_DB, JSON.stringify(db));
}

// -- session ------------------------------------------------------------------

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

// -- shape mappers (cloud rows -> app objects) -------------------------------

function mapMember(r) {
  return {
    id: r.id, familyId: r.family_id, name: r.name, email: r.email, role: r.role, tag: r.tag || "",
    familyCode: r.families?.code || r.familyCode || "",
    familyName: r.families?.name || r.familyName || "",
    isPlaceholder: Boolean(r.is_placeholder),
    reminderOffsets: Array.isArray(r.reminder_offsets) ? r.reminder_offsets : (r.reminderOffsets || [1440, 60]),
  };
}

function mapShift(r) {
  return {
    id: r.id,
    date: r.date,
    start: r.start_time,
    end: r.end_time,
    kids: r.kids || [],
    label: r.label || "",
    coveredById: r.covered_by_id,
    coveredByName: r.covered_by_name,
    postedByName: r.created_by_name || "",
  };
}

// -- public API ---------------------------------------------------------------

export const store = {
  mode: isCloudMode() ? "cloud" : "device",

  // -- auth --
  async restoreSession() {
    const ref = readSessionRef();
    if (!ref) return null;
    if (isCloudMode()) {
      const sb = getSupabase();
      const { data } = await sb.from("members").select("*, families(code, name)").eq("id", ref.id).maybeSingle();
      return data ? mapMember(data) : null;
    }
    const db = readDB();
    const u = db.members.find((m) => m.id === ref.id);
    if (!u) return null;
    const pub = { ...u, familyCode: db.familyCode || "", familyName: db.familyName || "" };
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
      const user = mapMember({ ...data, families: { code: fam.code, name: fam.name } });
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
    const pub = { ...user, familyCode: db.familyCode, familyName: db.familyName || "" };
    delete pub.password_hash;
    saveSession(pub);
    return pub;
  },

  async signIn({ email, password }) {
    email = email.trim().toLowerCase();
    const password_hash = await hashPassword(password);
    if (isCloudMode()) {
      const sb = getSupabase();
      const { data } = await sb.from("members").select("*, families(code, name)").eq("email", email).eq("password_hash", password_hash).maybeSingle();
      if (!data) throw new Error("Invalid email or password.");
      const user = mapMember(data);
      saveSession(user);
      return user;
    }
    const db = readDB();
    const u = db.members.find((m) => m.email === email && m.password_hash === password_hash);
    if (!u) throw new Error("Invalid email or password.");
    const pub = { ...u, familyCode: db.familyCode || "", familyName: db.familyName || "" };
    delete pub.password_hash;
    saveSession(pub);
    return pub;
  },

  signOut() {
    clearSession();
  },

  // -- password recovery (cloud mode only) --
  async requestPasswordReset(email) {
    email = (email || "").trim().toLowerCase();
    if (!email) throw new Error("Please enter your email.");
    if (!isCloudMode()) {
      throw new Error("Password reset by email isn't available in offline mode. Ask a parent to help reset your password.");
    }
    const sb = getSupabase();
    const { data: member } = await sb.from("members").select("id, name").eq("email", email).maybeSingle();
    if (!member) throw new Error("No account found with that email.");
    const token = uid();
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await sb.from("members").update({ reset_token: token, reset_token_expires: expires }).eq("id", member.id);
    const link = `${window.location.origin}${window.location.pathname}?reset=${token}&email=${encodeURIComponent(email)}`;
    try {
      await sb.functions.invoke("send-email", {
        body: {
          to: [email],
          subject: "Reset your BabyWatch password",
          text: `Hi ${member.name}, click <a href="${link}">this link</a> to set a new BabyWatch password. The link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
        },
      });
    } catch (e) { /* email is best-effort */ }
    return true;
  },

  async resetPassword({ email, token, password }) {
    email = (email || "").trim().toLowerCase();
    if (!password || password.length < 4) throw new Error("Please choose a password with at least 4 characters.");
    if (!isCloudMode()) throw new Error("Password reset isn't available in offline mode.");
    const sb = getSupabase();
    const { data: member } = await sb.from("members").select("id, reset_token, reset_token_expires").eq("email", email).maybeSingle();
    if (!member || !member.reset_token || member.reset_token !== token) {
      throw new Error("This reset link is invalid. Please request a new one.");
    }
    if (!member.reset_token_expires || new Date(member.reset_token_expires) < new Date()) {
      throw new Error("This reset link has expired. Please request a new one.");
    }
    const password_hash = await hashPassword(password);
    await sb.from("members").update({ password_hash, reset_token: null, reset_token_expires: null }).eq("id", member.id);
    return true;
  },

  // -- linked family calendars (cloud mode only) --
  // A member's "home" family is where their account lives. They can also link
  // additional families (e.g. a sibling's) by entering that family's invite
  // code, then switch between calendars in the app.
  async listFamilies(user) {
    if (isCloudMode()) {
      const sb = getSupabase();
      const { data: links } = await sb
        .from("family_links")
        .select("family_id, relationship, role, families(code, name)")
        .eq("member_id", user.id);
      const list = [{ id: user.familyId, code: user.familyCode, name: user.familyName || "", isHome: true, role: user.role, relationship: "" }];
      (links || []).forEach((l) => {
        if (l.family_id !== user.familyId) {
          list.push({
            id: l.family_id, code: l.families?.code || "", name: l.families?.name || "", isHome: false,
            role: l.role || "family", relationship: l.relationship || "",
          });
        }
      });
      return list;
    }
    const db = readDB();
    return [{ id: "local-family", code: db.familyCode || "", name: db.familyName || "", isHome: true, role: user.role, relationship: "" }];
  },

  // Set a custom display name for a calendar (e.g. "Fox Family Calendar").
  async setFamilyName(user, familyId, name) {
    name = (name || "").trim();
    if (isCloudMode()) {
      const sb = getSupabase();
      await sb.from("families").update({ name: name || null }).eq("id", familyId);
      return;
    }
    const db = readDB();
    db.familyName = name;
    writeDB(db);
  },

  async joinFamily(user, code, relationship) {
    code = (code || "").trim().toUpperCase();
    if (!code) throw new Error("Please enter a family code.");
    if (!isCloudMode()) throw new Error("Linking a second family calendar requires cloud sync mode.");
    const sb = getSupabase();
    const { data: fam } = await sb.from("families").select("*").eq("code", code).maybeSingle();
    if (!fam) throw new Error("That family code wasn't found. Double-check the code or invite link.");
    if (fam.id === user.familyId) throw new Error("That's already your family's calendar.");
    const { error } = await sb.from("family_links").insert({
      member_id: user.id, family_id: fam.id, relationship: (relationship || "").trim() || null, role: "family",
    });
    if (error && error.code !== "23505") throw new Error("Could not link that calendar. Please try again.");
    return { id: fam.id, code: fam.code };
  },

  async leaveFamily(user, familyId) {
    if (!isCloudMode()) return;
    const sb = getSupabase();
    await sb.from("family_links").delete().eq("member_id", user.id).eq("family_id", familyId);
  },

  // Create a brand-new family calendar (e.g. for a family member who also
  // wants their own calendar for their own kids). The creator becomes the
  // "parent" of this new calendar via a family_links entry, without changing
  // their home account/role.
  async createFamily(user, { name, relationship }) {
    if (!isCloudMode()) throw new Error("Creating an additional calendar requires cloud sync mode.");
    const sb = getSupabase();
    let fam;
    for (let i = 0; i < 6 && !fam; i++) {
      const tryCode = genFamilyCode();
      const { data: created } = await sb.from("families").insert({ code: tryCode, name: (name || "").trim() || null }).select().maybeSingle();
      if (created) fam = created;
    }
    if (!fam) throw new Error("Could not create the calendar. Please try again.");
    const { error } = await sb.from("family_links").insert({
      member_id: user.id, family_id: fam.id, relationship: (relationship || "").trim() || "Parent", role: "parent",
    });
    if (error) throw new Error("Could not link the new calendar. Please try again.");
    return { id: fam.id, code: fam.code, name: fam.name };
  },

  // -- fetch everything the app needs (for a given calendar/family) --
  async fetchAll(user, familyId) {
    familyId = familyId || user.familyId;
    if (isCloudMode()) {
      const sb = getSupabase();
      const [mem, kids, sh, notes] = await Promise.all([
        sb.from("members").select("*").eq("family_id", familyId).order("created_at"),
        sb.from("children").select("*").eq("family_id", familyId).order("created_at"),
        sb.from("shifts").select("*").eq("family_id", familyId),
        sb.from("notifications").select("*").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(30),
      ]);
      const shifts = {};
      (sh.data || []).forEach((r) => {
        (shifts[r.date] = shifts[r.date] || []).push(mapShift(r));
      });
      Object.values(shifts).forEach((arr) => arr.sort((a, b) => (a.start || "").localeCompare(b.start || "")));
      return {
        members: (mem.data || []).map(mapMember),
        children: (kids.data || []).map((r) => ({ id: r.id, name: r.name })),
        shifts,
        notifications: (notes.data || []).map((n) => ({ id: n.id, message: n.message, read: n.read, createdAt: n.created_at })),
      };
    }
    const db = readDB();
    return {
      members: db.members.map((m) => ({ id: m.id, familyId: m.familyId, name: m.name, email: m.email, role: m.role, tag: m.tag, isPlaceholder: Boolean(m.isPlaceholder), reminderOffsets: m.reminderOffsets || [1440, 60] })),
      children: db.children,
      shifts: db.shifts,
      notifications: db.notifications
        .filter((n) => n.recipientId === user.id)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, 30)
        .map((n) => ({ id: n.id, message: n.message, read: n.read, createdAt: n.createdAt })),
    };
  },

  // -- shifts -- (a day can have multiple shifts; each is identified by id)
  async addShift(user, { date, start, end, kids, label }, familyId) {
    familyId = familyId || user.familyId;
    if (isCloudMode()) {
      const sb = getSupabase();
      const { error } = await sb.from("shifts").insert({
        family_id: familyId, date, start_time: start, end_time: end, kids,
        label: label?.trim() || null, created_by: user.id, created_by_name: user.name,
      });
      if (error) throw new Error("Could not post the shift. Please try again.");
      return;
    }
    const db = readDB();
    if (!db.shifts[date]) db.shifts[date] = [];
    db.shifts[date].push({ id: uid(), date, start, end, kids, label: label?.trim() || "", coveredById: null, coveredByName: null, postedByName: user.name });
    writeDB(db);
  },

  async updateShiftDetails(user, shiftId, { start, end, kids, label }, familyId) {
    familyId = familyId || user.familyId;
    if (isCloudMode()) {
      const sb = getSupabase();
      await sb.from("shifts").update({ start_time: start, end_time: end, kids, label: label?.trim() || null }).eq("id", shiftId);
      return;
    }
    const db = readDB();
    for (const date of Object.keys(db.shifts)) {
      const i = (db.shifts[date] || []).findIndex((s) => s.id === shiftId);
      if (i !== -1) {
        db.shifts[date][i] = { ...db.shifts[date][i], start, end, kids, label: label?.trim() || "" };
        writeDB(db);
        return;
      }
    }
  },

  async assignShift(user, shiftId, member /* member object or null to clear */, familyId) {
    familyId = familyId || user.familyId;
    if (isCloudMode()) {
      const sb = getSupabase();
      await sb.from("shifts").update({
        covered_by_id: member ? member.id : null,
        covered_by_name: member ? member.name : null,
      }).eq("id", shiftId);
      return;
    }
    const db = readDB();
    for (const date of Object.keys(db.shifts)) {
      const i = (db.shifts[date] || []).findIndex((s) => s.id === shiftId);
      if (i !== -1) {
        db.shifts[date][i] = { ...db.shifts[date][i], coveredById: member ? member.id : null, coveredByName: member ? member.name : null };
        writeDB(db);
        return;
      }
    }
  },

  async deleteShift(user, shiftId, familyId) {
    familyId = familyId || user.familyId;
    if (isCloudMode()) {
      const sb = getSupabase();
      await sb.from("shifts").delete().eq("id", shiftId);
      return;
    }
    const db = readDB();
    for (const date of Object.keys(db.shifts)) {
      db.shifts[date] = (db.shifts[date] || []).filter((s) => s.id !== shiftId);
      if (db.shifts[date].length === 0) delete db.shifts[date];
    }
    writeDB(db);
  },

  // -- children --
  async addChild(user, name, familyId) {
    familyId = familyId || user.familyId;
    name = name.trim();
    if (!name) return;
    if (isCloudMode()) {
      const sb = getSupabase();
      await sb.from("children").insert({ family_id: familyId, name });
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

  // -- members --
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
      db.shifts[d] = (db.shifts[d] || []).map((s) =>
        s.coveredById === memberId ? { ...s, coveredById: null, coveredByName: null } : s
      );
    });
    writeDB(db);
  },

  // Add a family member who doesn't need their own login (e.g. a
  // non-tech-savvy grandparent). They show up in the members list and can be
  // assigned shifts, but can't sign in.
  async addPlaceholderMember(user, { name, tag }, familyId) {
    familyId = familyId || user.familyId;
    name = (name || "").trim();
    if (!name) throw new Error("Please enter a name.");
    if (isCloudMode()) {
      const sb = getSupabase();
      const { error } = await sb.from("members").insert({
        family_id: familyId, name, email: null, password_hash: null,
        role: "family", tag: tag?.trim() || "Family", is_placeholder: true,
      });
      if (error) throw new Error("Could not add that family member. Please try again.");
      return;
    }
    const db = readDB();
    db.members.push({ id: uid(), familyId: "local-family", name, email: null, role: "family", tag: tag?.trim() || "Family", isPlaceholder: true });
    writeDB(db);
  },

  // -- iCal subscription URL --
  // Returns a stable URL that calendar apps (Skylite, Apple Calendar, Google
  // Calendar, Outlook) can subscribe to. The URL is authenticated by the
  // family's ical_token — anyone with the URL can read the shift calendar,
  // so treat it like a shared link (not a secret password).
  async getIcalUrl(user, familyId) {
    familyId = familyId || user.familyId;
    if (!isCloudMode()) return null;
    const sb = getSupabase();
    const { data: fam } = await sb.from("families").select("ical_token").eq("id", familyId).maybeSingle();
    if (!fam?.ical_token) return null;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
    return `${supabaseUrl}/functions/v1/get-ical?token=${fam.ical_token}`;
  },

  // -- reminder preferences --
  // `offsets` is an array of minutes-before-shift-start, e.g. [1440, 60] for
  // "1 day before" and "1 hour before". Used by the scheduled reminder job.
  async updateReminderOffsets(user, offsets) {
    offsets = (offsets || []).filter((n) => Number.isFinite(n) && n >= 0);
    if (isCloudMode()) {
      const sb = getSupabase();
      const { error } = await sb.from("members").update({ reminder_offsets: offsets }).eq("id", user.id);
      if (error) throw new Error("Could not save your reminder settings. Please try again.");
      return;
    }
    const db = readDB();
    const i = db.members.findIndex((m) => m.id === user.id);
    if (i !== -1) {
      db.members[i] = { ...db.members[i], reminderOffsets: offsets };
      writeDB(db);
    }
  },

  // -- chat --
  // Thread key convention:
  //   'all'     → everyone in the family
  //   'parents' → parents only
  //   'dm:A-B'  → private DM (A and B are sorted UUIDs)
  _dmThread(idA, idB) {
    return "dm:" + [idA, idB].sort().join("-");
  },

  async fetchMessages(user, familyId, thread) {
    if (!isCloudMode()) return [];
    const sb = getSupabase();
    familyId = familyId || user.familyId;
    const dbThread =
      thread === "all" || thread === "parents"
        ? thread
        : this._dmThread(user.id, thread);
    const { data } = await sb
      .from("messages")
      .select("*")
      .eq("family_id", familyId)
      .eq("thread", dbThread)
      .order("created_at", { ascending: true })
      .limit(100);
    return data || [];
  },

  async sendMessage(user, familyId, thread, body) {
    if (!isCloudMode()) return;
    const sb = getSupabase();
    familyId = familyId || user.familyId;
    const dbThread =
      thread === "all" || thread === "parents"
        ? thread
        : this._dmThread(user.id, thread);
    const { error } = await sb.from("messages").insert({
      family_id: familyId,
      sender_id: user.id,
      sender_name: user.name,
      thread: dbThread,
      body,
    });
    if (error) throw new Error(error.message);
  },

  subscribeToMessages(user, cb) {
    if (!isCloudMode()) return () => {};
    const sb = getSupabase();
    const familyId = user?.familyId;
    const chan = sb
      .channel("chat-" + (familyId || "anon"))
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          // Client-side family filter — only react to this family's messages
          if (payload?.new?.family_id && payload.new.family_id !== familyId) return;
          cb(payload);
        }
      )
      .subscribe();
    return () => sb.removeChannel(chan);
  },

  // -- notifications --
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

  // -- realtime sync (cloud) / cross-tab sync (device) --
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

// -- notification message builders -------------------------------------------

export function shiftPostedMessage(poster, date, start, end, kids) {
  const kidStr = kids?.length ? ` for ${kids.join(" and ")}` : "";
  return `${poster.name} posted a new shift${kidStr} on ${prettyDate(date)}, ${fmt12(start)} to ${fmt12(end)}. Open the calendar to claim it.`;
}

export function shiftClaimedMessage(claimer, date) {
  return `${claimer.name} (${claimer.tag || "family"}) claimed the shift on ${prettyDate(date)}.`;
}
