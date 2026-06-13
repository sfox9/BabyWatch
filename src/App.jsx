import { useCallback, useEffect, useRef, useState } from "react";
import "./index.css";
import { C, font, fontSans } from "./lib/theme";
import { store, shiftPostedMessage, shiftClaimedMessage } from "./lib/store";
import AuthScreen from "./components/AuthScreen";
import CalendarView from "./components/CalendarView";
import ShiftModal from "./components/ShiftModal";
import AddShiftModal from "./components/AddShiftModal";
import UpcomingShifts from "./components/UpcomingShifts";
import SettingsPanel from "./components/SettingsPanel";
import NotificationsBell from "./components/NotificationsBell";
import BabyLogo from "./components/Logo";
import { Btn, LeafMark } from "./components/UI";

const today = new Date();

export default function App() {
  const [booted, setBooted] = useState(false);
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [children, setChildren] = useState([]);
  const [shifts, setShifts] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [view, setView] = useState("calendar");
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [shiftModalKey, setShiftModalKey] = useState(null);
  const [addModalKey, setAddModalKey] = useState(null);
  const [families, setFamilies] = useState([]);
  const [activeFamilyId, setActiveFamilyId] = useState(null);
  const refreshTimer = useRef(null);

  const refresh = useCallback(async (u, famId) => {
    const who = u || user;
    if (!who) return;
    const fid = famId || activeFamilyId || who.familyId;
    try {
      const data = await store.fetchAll(who, fid);
      setMembers(data.members);
      setChildren(data.children);
      setShifts(data.shifts);
      setNotifications(data.notifications);
    } catch (e) { /* transient network issue — keep current data */ }
  }, [user, activeFamilyId]);

  async function refreshFamilies(u) {
    try {
      const list = await store.listFamilies(u);
      setFamilies(list);
    } catch (e) { /* ignore */ }
  }

  // restore session on load
  useEffect(() => {
    store.restoreSession().then((u) => {
      if (u) {
        setUser(u);
        setActiveFamilyId(u.familyId);
      }
      setBooted(true);
    });
  }, []);

  // fetch + live sync while signed in
  useEffect(() => {
    if (!user) return;
    refresh(user, activeFamilyId);
    refreshFamilies(user);
    const unsub = store.subscribe(user, () => {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => refresh(user, activeFamilyId), 250);
    });
    return () => { unsub(); clearTimeout(refreshTimer.current); };
  }, [user, activeFamilyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── derived ──────────────────────────────────────────────────────────────

  const viewingHome = !activeFamilyId || activeFamilyId === user?.familyId;
  const isParent = Boolean(user && user.role === "parent" && viewingHome);

  // ── actions ────────────────────────────────────────────────────────────────

  function handleDayClick(key) {
    if (shifts[key]?.length) setShiftModalKey(key);
    else if (isParent) setAddModalKey(key);
  }

  function handleAddAnother(date) {
    setShiftModalKey(null);
    setAddModalKey(date);
  }

  async function handleAddShift(date, { start, end, kids, label }) {
    try {
      await store.addShift(user, { date, start, end, kids, label }, activeFamilyId);
      await refresh();
      const recipients = members.filter((m) => m.role === "family" && m.id !== user.id);
      store.notify(user, recipients, shiftPostedMessage(user, date, start, end, kids));
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleClaim(shift) {
    await store.assignShift(user, shift.id, user, activeFamilyId);
    await refresh();
    const parents = members.filter((m) => m.role === "parent" && m.id !== user.id);
    store.notify(user, parents, shiftClaimedMessage(user, shift.date));
  }

  async function handleUnclaim(shift) {
    await store.assignShift(user, shift.id, null, activeFamilyId);
    await refresh();
    const parents = members.filter((m) => m.role === "parent" && m.id !== user.id);
    store.notify(user, parents, `${user.name} can no longer cover the shift on ${shift.date}. It is open again.`);
  }

  async function handleAssign(shift, member) {
    await store.assignShift(user, shift.id, member, activeFamilyId);
    await refresh();
  }

  async function handleDelete(shift) {
    await store.deleteShift(user, shift.id, activeFamilyId);
    await refresh();
  }

  async function handleUpdateDetails(shift, details) {
    await store.updateShiftDetails(user, shift.id, details, activeFamilyId);
    await refresh();
  }

  async function handleNotificationsOpened() {
    setNotifications((p) => p.map((n) => ({ ...n, read: true })));
    await store.markNotificationsRead(user);
  }

  async function handleJoinFamily(code) {
    await store.joinFamily(user, code);
    await refreshFamilies(user);
  }

  async function handleLeaveFamily(familyId) {
    await store.leaveFamily(user, familyId);
    if (activeFamilyId === familyId) setActiveFamilyId(user.familyId);
    await refreshFamilies(user);
  }

  function switchFamily(familyId) {
    setActiveFamilyId(familyId);
    setView("calendar");
    setShiftModalKey(null);
    setAddModalKey(null);
  }

  function signOut() {
    store.signOut();
    setUser(null);
    setView("calendar");
    setActiveFamilyId(null);
    setFamilies([]);
    setMembers([]); setChildren([]); setShifts({}); setNotifications([]);
  }

  // ── render ─────────────────────────────────────────────────────────────────

  if (!booted) {
    return (
      <div style={{ minHeight: "100vh", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <BabyLogo size={56} dark />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onLogin={(u) => { setUser(u); setActiveFamilyId(u.familyId); }} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: fontSans }}>
      {/* Nav */}
      <div style={{
        background: C.white, borderBottom: `1px solid ${C.softBorder}`, padding: "10px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        position: "sticky", top: 0, zIndex: 100, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BabyLogo size={34} />
          <span style={{ fontFamily: font, fontSize: 21, color: C.warm, fontWeight: 700 }}>BabyWatch</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NotificationsBell notifications={notifications} onOpen={handleNotificationsOpened} />
          {isParent && (
            <Btn small variant={view === "settings" ? "primary" : "ghost"} onClick={() => setView((v) => (v === "settings" ? "calendar" : "settings"))}>
              {view === "settings" ? "Calendar" : "Settings"}
            </Btn>
          )}
          <div style={{
            background: C.clay + "22", borderRadius: 20, padding: "5px 12px 5px 5px",
            fontFamily: fontSans, fontSize: 13, fontWeight: 700, color: C.clay,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%", background: C.clay,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: C.white, fontSize: 11, fontWeight: 800,
            }}>{user.name[0]?.toUpperCase()}</div>
            {user.name.split(" ")[0]}
          </div>
          <button onClick={signOut} style={{
            background: C.sand, border: "none", borderRadius: 20, padding: "6px 12px",
            fontFamily: fontSans, fontSize: 12, color: C.textMuted, cursor: "pointer", fontWeight: 600,
          }}>Sign out</button>
        </div>
      </div>

      {/* Family switcher */}
      {families.length > 1 && (
        <div style={{
          background: C.sand, borderBottom: `1px solid ${C.softBorder}`, padding: "8px 14px",
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
        }}>
          <div style={{ fontFamily: fontSans, fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Calendar
          </div>
          {families.map((f) => (
            <button key={f.id} onClick={() => switchFamily(f.id)} style={{
              padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              fontFamily: fontSans, fontWeight: 700, fontSize: 12,
              background: (activeFamilyId || user.familyId) === f.id ? C.clay : C.white,
              color: (activeFamilyId || user.familyId) === f.id ? C.white : C.warm,
            }}>{f.name || (f.isHome ? "My Family" : f.code)}</button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "20px 14px 60px" }}>

        {store.mode === "device" && (
          <div style={{
            background: C.sand + "66", border: `1.5px dashed ${C.softBorder}`, borderRadius: 12,
            padding: "9px 14px", marginBottom: 16, fontFamily: fontSans, fontSize: 12, color: C.textMuted, lineHeight: 1.5,
          }}>
            Saved on this device only. To sync with the whole family and turn on email alerts, follow the free 10-minute setup in the README.
          </div>
        )}

        {/* Welcome bar */}
        <div style={{
          background: `linear-gradient(135deg, ${C.clay}15 0%, ${C.sage}15 100%)`,
          border: `1.5px solid ${C.clay}33`, borderRadius: 16, padding: "14px 18px", marginBottom: 22,
          display: "flex", alignItems: "center", gap: 14, position: "relative", overflow: "hidden",
        }}>
          <LeafMark style={{ width: 80, height: 100, top: -10, right: 10, opacity: 0.06 }} />
          <div style={{
            width: 42, height: 42, borderRadius: "50%", background: C.earth,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.white, fontFamily: fontSans, fontWeight: 800, fontSize: 18, flexShrink: 0,
          }}>{user.name[0]?.toUpperCase()}</div>
          <div>
            <div style={{ fontFamily: font, fontSize: 18, color: C.clay, fontWeight: 600 }}>
              Hi, {user.name.split(" ")[0]}
              {!viewingHome && (
                <span style={{ fontFamily: fontSans, fontSize: 12, color: C.textMuted, fontWeight: 600 }}>
                  {" "}— viewing {(() => { const f = families.find((f) => f.id === activeFamilyId); return f?.name || f?.code || "linked"; })()} calendar
                </span>
              )}
            </div>
            <div style={{ fontFamily: fontSans, fontSize: 13, color: C.textMuted }}>
              {isParent
                ? "Tap any open day to post a shift, or tap a shift to manage it."
                : "Tap an open shift to claim it for the family."}
            </div>
          </div>
        </div>

        {view === "settings" && isParent ? (
          <SettingsPanel
            members={members}
            childrenList={children}
            shifts={shifts}
            familyCode={user.familyCode}
            currentUser={user}
            families={families}
            onRemoveMember={async (id) => { await store.removeMember(user, id); refresh(); }}
            onAddChild={async (name) => { await store.addChild(user, name, activeFamilyId); refresh(); }}
            onRemoveChild={async (id) => { await store.removeChild(user, id); refresh(); }}
            onAddPlaceholderMember={async (info) => { await store.addPlaceholderMember(user, info, activeFamilyId); await refresh(); }}
            onJoinFamily={handleJoinFamily}
            onLeaveFamily={handleLeaveFamily}
            onRenameFamily={async (familyId, name) => { await store.setFamilyName(user, familyId, name); await refreshFamilies(user); if (familyId === user.familyId) setUser((u) => ({ ...u, familyName: name })); }}
          />
        ) : (
          <>
            <CalendarView
              shifts={shifts} currentUser={{ ...user, role: isParent ? "parent" : "family" }} onDayClick={handleDayClick}
              year={calYear} month={calMonth} setYear={setCalYear} setMonth={setCalMonth}
            />
            <UpcomingShifts shifts={shifts} onShiftClick={(k) => setShiftModalKey(k)} />
          </>
        )}
      </div>

      <ShiftModal
        open={Boolean(shiftModalKey)} onClose={() => setShiftModalKey(null)}
        dateStr={shiftModalKey} shiftList={shiftModalKey ? shifts[shiftModalKey] || [] : []}
        currentUser={{ ...user, role: isParent ? "parent" : "family" }} members={members} childrenList={children}
        onClaim={handleClaim} onUnclaim={handleUnclaim} onAssign={handleAssign}
        onDelete={handleDelete} onUpdateDetails={handleUpdateDetails}
        onAddAnother={isParent ? handleAddAnother : undefined}
      />
      <AddShiftModal
        open={Boolean(addModalKey)} onClose={() => setAddModalKey(null)}
        selectedDate={addModalKey} onAdd={handleAddShift} childrenList={children}
      />
    </div>
  );
}
