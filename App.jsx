import { useState } from "react";
import "./index.css";

const C = {
  cream: "#F7F2EC",
  sand: "#E8DDD0",
  clay: "#C4956A",
  earth: "#8B6347",
  sage: "#8FA68C",
  sageMuted: "#B5C9B2",
  dustyRose: "#C4867A",
  warm: "#6B4F3A",
  text: "#3D2B1F",
  textMuted: "#8B7355",
  white: "#FEFCF8",
  softBorder: "#D9CFC4",
};

const font = "'Crimson Pro', Georgia, serif";
const fontSans = "'Nunito', system-ui, sans-serif";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfMonth(y, m) { return new Date(y, m, 1).getDay(); }
function dateKey(y, m, d) {
  return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

function generateICal(shifts) {
  const lines = [
    "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//BabyWatch//EN",
    "CALSCALE:GREGORIAN","X-WR-CALNAME:BabyWatch Shifts",
  ];
  Object.entries(shifts).forEach(([dateStr, shift]) => {
    if (!shift) return;
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = `${y}${String(m).padStart(2,"0")}${String(d).padStart(2,"0")}`;
    const kids = shift.kids?.join(", ") || "children";
    const coveredBy = shift.coveredBy ? `Covered by: ${shift.coveredBy}` : "Open shift";
    lines.push(
      "BEGIN:VEVENT",
      `DTSTART;VALUE=DATE:${dt}`,`DTEND;VALUE=DATE:${dt}`,
      `SUMMARY:BabyWatch ${shift.startTime}-${shift.endTime}`,
      `DESCRIPTION:${coveredBy} | Kids: ${kids}`,
      `UID:babywatch-${dateStr}@babywatch`,"END:VEVENT"
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

const FAMILY_CODE = "WATCH1";
const INITIAL_USERS = [
  { id:"p1", name:"Alex", role:"parent", tag:"Parent", email:"alex@family.com", password:"pass", familyCode:FAMILY_CODE },
  { id:"p2", name:"Jordan", role:"parent", tag:"Parent", email:"jordan@family.com", password:"pass", familyCode:FAMILY_CODE },
  { id:"f1", name:"Grandma Sue", role:"family", tag:"Grandma", email:"sue@family.com", password:"pass", familyCode:FAMILY_CODE },
  { id:"f2", name:"Aunt Lisa", role:"family", tag:"Aunt", email:"lisa@family.com", password:"pass", familyCode:FAMILY_CODE },
];
const INITIAL_CHILDREN = ["Lily","Max"];
const today = new Date();
const INITIAL_SHIFTS = {
  [dateKey(today.getFullYear(), today.getMonth(), today.getDate()+2)]: { startTime:"7:00 AM", endTime:"7:00 PM", kids:["Lily","Max"], coveredBy:null, coveredById:null },
  [dateKey(today.getFullYear(), today.getMonth(), today.getDate()+5)]: { startTime:"11:00 AM", endTime:"6:00 PM", kids:["Lily"], coveredBy:null, coveredById:null },
  [dateKey(today.getFullYear(), today.getMonth(), today.getDate()+9)]: { startTime:"7:00 AM", endTime:"7:00 PM", kids:["Lily","Max"], coveredBy:"Grandma Sue", coveredById:"f1" },
};

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Badge({ children, color = C.clay }) {
  return (
    <span style={{
      background:color+"22", color, border:`1px solid ${color}55`,
      borderRadius:20, padding:"2px 10px", fontSize:11,
      fontFamily:fontSans, fontWeight:700, letterSpacing:"0.04em"
    }}>{children}</span>
  );
}

function Btn({ children, onClick, variant="primary", small, style={} }) {
  const base = {
    border:"none", borderRadius:30, cursor:"pointer", fontFamily:fontSans,
    fontWeight:700, letterSpacing:"0.02em", transition:"all .18s",
    padding: small ? "6px 16px" : "11px 26px",
    fontSize: small ? 13 : 15,
  };
  const variants = {
    primary:   { background:C.clay,      color:C.white },
    secondary: { background:C.sand,      color:C.warm  },
    sage:      { background:C.sage,      color:C.white },
    ghost:     { background:"transparent", color:C.clay, border:`1.5px solid ${C.clay}` },
    danger:    { background:C.dustyRose, color:C.white },
  };
  return <button onClick={onClick} style={{...base, ...variants[variant], ...style}}>{children}</button>;
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <div style={{ fontFamily:fontSans, fontSize:12, color:C.textMuted, marginBottom:4, fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase" }}>{label}</div>}
      <input {...props} style={{ width:"100%", boxSizing:"border-box", background:C.white, border:`1.5px solid ${C.softBorder}`, borderRadius:10, padding:"10px 14px", fontFamily:fontSans, fontSize:14, color:C.text, outline:"none", ...props.style }} />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <div style={{ fontFamily:fontSans, fontSize:12, color:C.textMuted, marginBottom:4, fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase" }}>{label}</div>}
      <select {...props} style={{ width:"100%", boxSizing:"border-box", background:C.white, border:`1.5px solid ${C.softBorder}`, borderRadius:10, padding:"10px 14px", fontFamily:fontSans, fontSize:14, color:C.text, outline:"none" }}>{children}</select>
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(61,43,31,0.38)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }} onClick={onClose}>
      <div style={{ background:C.cream, borderRadius:20, padding:28, maxWidth:420, width:"100%", boxShadow:"0 8px 40px rgba(61,43,31,0.18)", maxHeight:"90vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <div style={{ fontFamily:font, fontSize:22, color:C.warm, fontWeight:600 }}>{title}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:C.textMuted }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Decorative leaf (CSS only, no emoji) ──────────────────────────────────────
function LeafMark({ style }) {
  return (
    <svg viewBox="0 0 60 80" style={{ position:"absolute", opacity:0.07, pointerEvents:"none", ...style }} fill={C.earth}>
      <path d="M30 75 C30 75 5 55 5 30 C5 10 20 2 30 2 C40 2 55 10 55 30 C55 55 30 75 30 75Z" />
      <line x1="30" y1="75" x2="30" y2="10" stroke={C.earth} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Baby face logo — simple cream line work ───────────────────────────────────
function BabyLogo({ size = 40, dark = false }) {
  const bg = dark ? C.clay : C.sand;
  const stroke = dark ? C.cream : C.earth;
  const sw = 1.5;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill={bg} />
      {/* Head outline */}
      <circle cx="20" cy="22" r="10" stroke={stroke} strokeWidth={sw} fill="none" />
      {/* Left ear */}
      <path d="M10.3 19.5 Q7.5 19.5 7.5 22.5 Q7.5 25.5 10.3 25.5" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" />
      {/* Right ear */}
      <path d="M29.7 19.5 Q32.5 19.5 32.5 22.5 Q32.5 25.5 29.7 25.5" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" />
      {/* Hair tuft */}
      <path d="M16 12.5 Q17.5 9 20 10.5 Q22.5 9 24 12.5" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Left eye */}
      <circle cx="16.5" cy="21" r="1" fill={stroke} />
      {/* Right eye */}
      <circle cx="23.5" cy="21" r="1" fill={stroke} />
      {/* Smile */}
      <path d="M16.5 25.5 Q20 29 23.5 25.5" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ── Auth ──────────────────────────────────────────────────────────────────────

function AuthScreen({ onLogin, users, setUsers, familyCode }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("family");
  const [tag, setTag] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  function handleLogin() {
    const u = users.find(u => u.email===email && u.password===password);
    if (!u) { setErr("Invalid email or password."); return; }
    onLogin(u);
  }

  function handleRegister() {
    if (!name||!email||!password) { setErr("Please fill in all fields."); return; }
    if (role==="family" && code!==familyCode) { setErr("Invalid family code. Ask a parent for yours."); return; }
    if (users.find(u=>u.email===email)) { setErr("Email already registered."); return; }
    const newUser = { id:"u"+Date.now(), name, email, password, role, tag:tag||role, familyCode };
    setUsers(prev=>[...prev, newUser]);
    onLogin(newUser);
  }

  return (
    <div style={{ minHeight:"100vh", background:C.cream, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, position:"relative", overflow:"hidden" }}>
      <LeafMark style={{ width:160, height:200, top:-40, left:-30, transform:"rotate(-15deg)" }} />
      <LeafMark style={{ width:120, height:160, bottom:20, right:-20, transform:"rotate(20deg)" }} />

      <div style={{ textAlign:"center", marginBottom:32, position:"relative" }}>
        <div style={{ margin:"0 auto 12px", width:56, display:"flex", justifyContent:"center" }}>
          <BabyLogo size={56} dark />
        </div>
        <div style={{ fontFamily:font, fontSize:36, color:C.warm, fontWeight:700 }}>BabyWatch</div>
        <div style={{ fontFamily:fontSans, fontSize:14, color:C.textMuted, marginTop:4 }}>Family care, beautifully coordinated</div>
      </div>

      <div style={{ background:C.white, borderRadius:24, padding:28, width:"100%", maxWidth:380, boxShadow:"0 4px 30px rgba(139,99,71,0.1)" }}>
        <div style={{ display:"flex", gap:8, marginBottom:24 }}>
          {[["login","Sign In"],["register","Create Account"]].map(([m,label])=>(
            <button key={m} onClick={()=>{ setMode(m); setErr(""); }} style={{
              flex:1, padding:"9px 0", borderRadius:20, border:"none", cursor:"pointer",
              fontFamily:fontSans, fontWeight:700, fontSize:13, letterSpacing:"0.04em",
              background: mode===m ? C.clay : C.sand,
              color: mode===m ? C.white : C.textMuted,
              transition:"all .2s"
            }}>{label}</button>
          ))}
        </div>

        {mode==="login" ? (
          <>
            <Input label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" />
            <Input label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••" />
          </>
        ) : (
          <>
            <Input label="Your Name" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Grandma Sue" />
            <Input label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" />
            <Input label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••" />
            <Select label="I am a" value={role} onChange={e=>setRole(e.target.value)}>
              <option value="family">Family Member / Nanny</option>
              <option value="parent">Parent</option>
            </Select>
            <Input label="How should we tag you? (e.g. Grandma, Nanny, Mom, Dad)" value={tag} onChange={e=>setTag(e.target.value)} placeholder="Optional" />
            {role==="family" && (
              <Input label="Family Code (ask a parent for this)" value={code} onChange={e=>setCode(e.target.value)} placeholder="e.g. WATCH1" />
            )}
          </>
        )}

        {err && <div style={{ color:C.dustyRose, fontFamily:fontSans, fontSize:13, marginBottom:12 }}>{err}</div>}

        <Btn onClick={mode==="login"?handleLogin:handleRegister} style={{ width:"100%", marginTop:4 }}>
          {mode==="login" ? "Sign In" : "Join Family"}
        </Btn>

        {mode==="register" && role==="family" && (
          <div style={{ fontFamily:fontSans, fontSize:12, color:C.textMuted, textAlign:"center", marginTop:12 }}>
            Demo family code: <strong>WATCH1</strong>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shift detail modal ────────────────────────────────────────────────────────

function ShiftModal({ open, onClose, dateStr, shift, currentUser, users, onClaim, onAssign, onDelete }) {
  const [assignId, setAssignId] = useState("");
  const isParent = currentUser?.role==="parent";
  const familyMembers = users.filter(u=>u.familyCode===currentUser?.familyCode);
  if (!shift) return null;
  const [y,m,d] = dateStr.split("-").map(Number);
  const display = `${MONTHS[m-1]} ${d}, ${y}`;

  return (
    <Modal open={open} onClose={onClose} title={display}>
      <div style={{ fontFamily:fontSans }}>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:20 }}>
          <div style={{ background:C.sand, borderRadius:12, padding:"10px 16px", flex:1, minWidth:100 }}>
            <div style={{ fontSize:11, color:C.textMuted, marginBottom:2, textTransform:"uppercase", fontWeight:700 }}>Hours</div>
            <div style={{ fontSize:16, fontWeight:700, color:C.warm }}>{shift.startTime} – {shift.endTime}</div>
          </div>
          <div style={{ background:C.sand, borderRadius:12, padding:"10px 16px", flex:1, minWidth:100 }}>
            <div style={{ fontSize:11, color:C.textMuted, marginBottom:2, textTransform:"uppercase", fontWeight:700 }}>Kids</div>
            <div style={{ fontSize:15, fontWeight:600, color:C.warm }}>{shift.kids?.join(", ")||"All"}</div>
          </div>
        </div>

        <div style={{ background:shift.coveredBy ? C.sageMuted+"33" : C.dustyRose+"22", borderRadius:12, padding:"12px 16px", marginBottom:20 }}>
          <div style={{ fontWeight:700, color:shift.coveredBy ? C.sage : C.dustyRose }}>
            {shift.coveredBy ? `Covered by ${shift.coveredBy}` : "Open — needs coverage"}
          </div>
        </div>

        {!shift.coveredBy && !isParent && (
          <Btn onClick={()=>{ onClaim(dateStr); onClose(); }} variant="sage" style={{ width:"100%", marginBottom:10 }}>
            Claim this shift
          </Btn>
        )}

        {isParent && (
          <div style={{ borderTop:`1px solid ${C.softBorder}`, paddingTop:16 }}>
            <div style={{ fontSize:11, color:C.textMuted, marginBottom:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>
              Parent Controls
            </div>
            <Select label="Manually assign to" value={assignId} onChange={e=>setAssignId(e.target.value)}>
              <option value="">— Select person —</option>
              {familyMembers.map(u=>(
                <option key={u.id} value={u.id}>{u.name} ({u.tag||u.role})</option>
              ))}
            </Select>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <Btn small onClick={()=>{ if(assignId){ onAssign(dateStr, assignId); onClose(); } }} variant="sage">Assign</Btn>
              {shift.coveredBy && (
                <Btn small onClick={()=>{ onAssign(dateStr, null); onClose(); }} variant="secondary">Clear</Btn>
              )}
              <Btn small onClick={()=>{ onDelete(dateStr); onClose(); }} variant="danger">Delete Shift</Btn>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Add shift modal ───────────────────────────────────────────────────────────

function AddShiftModal({ open, onClose, selectedDate, onAdd, children: childrenList }) {
  const [startTime, setStartTime] = useState("7:00 AM");
  const [endTime, setEndTime] = useState("7:00 PM");
  const [kids, setKids] = useState([...childrenList]);
  const toggleKid = k => setKids(prev=>prev.includes(k)?prev.filter(x=>x!==k):[...prev,k]);

  function handleAdd() {
    onAdd(selectedDate, { startTime, endTime, kids, coveredBy:null, coveredById:null });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Post New Shift">
      <div style={{ fontFamily:fontSans }}>
        {selectedDate && (
          <div style={{ background:C.sand, borderRadius:10, padding:"8px 14px", marginBottom:16, color:C.warm, fontWeight:600, fontSize:14 }}>
            {selectedDate}
          </div>
        )}
        <Input label="Start Time" value={startTime} onChange={e=>setStartTime(e.target.value)} placeholder="e.g. 7:00 AM" />
        <Input label="End Time" value={endTime} onChange={e=>setEndTime(e.target.value)} placeholder="e.g. 7:00 PM" />
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12, color:C.textMuted, marginBottom:8, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}>Which kids need care?</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {childrenList.map(k=>(
              <button key={k} onClick={()=>toggleKid(k)} style={{
                padding:"7px 16px", borderRadius:20, cursor:"pointer", fontFamily:fontSans, fontWeight:600, fontSize:13,
                border:`1.5px solid ${kids.includes(k)?C.clay:C.softBorder}`,
                background:kids.includes(k)?C.clay+"22":C.white,
                color:kids.includes(k)?C.clay:C.textMuted, transition:"all .15s"
              }}>{k}</button>
            ))}
          </div>
        </div>
        <Btn onClick={handleAdd} style={{ width:"100%" }}>Post Shift</Btn>
      </div>
    </Modal>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────────

function CalendarView({ shifts, currentUser, onDayClick, year, month, setYear, setMonth }) {
  const todayObj = new Date();
  const fd = firstDayOfMonth(year, month);
  const dim = daysInMonth(year, month);
  const cells = Array(fd).fill(null).concat(Array.from({length:dim},(_,i)=>i+1));
  while (cells.length%7!==0) cells.push(null);

  function prev() { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }
  function next() { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }

  return (
    <div style={{ background:C.white, borderRadius:20, padding:20, boxShadow:"0 2px 20px rgba(139,99,71,0.08)" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <button onClick={prev} style={{ background:C.sand, border:"none", borderRadius:20, width:34, height:34, cursor:"pointer", fontSize:16, color:C.warm }}>‹</button>
        <div style={{ fontFamily:font, fontSize:22, color:C.clay, fontWeight:600 }}>{MONTHS[month]} {year}</div>
        <button onClick={next} style={{ background:C.sand, border:"none", borderRadius:20, width:34, height:34, cursor:"pointer", fontSize:16, color:C.warm }}>›</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:8 }}>
        {DAYS.map(d=>(
          <div key={d} style={{ textAlign:"center", fontSize:11, fontFamily:fontSans, fontWeight:700, color:C.textMuted, letterSpacing:"0.06em", textTransform:"uppercase", padding:"4px 0" }}>{d}</div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
        {cells.map((day,i)=>{
          if (!day) return <div key={i}/>;
          const key = dateKey(year, month, day);
          const shift = shifts[key];
          const isToday = todayObj.getFullYear()===year && todayObj.getMonth()===month && todayObj.getDate()===day;
          const covered = shift?.coveredBy;
          const open = shift && !covered;

          return (
            <div key={i} onClick={()=>onDayClick(key, day)}
              style={{
                borderRadius:12, padding:"6px 4px", minHeight:64,
                cursor:(shift||currentUser?.role==="parent")?"pointer":"default",
                background:isToday?C.clay+"22":C.cream,
                border:isToday?`2px solid ${C.clay}`:`1.5px solid ${C.softBorder}`,
                transition:"box-shadow .15s, transform .15s",
              }}
              onMouseEnter={e=>{ if(shift||currentUser?.role==="parent"){ e.currentTarget.style.boxShadow=`0 4px 14px rgba(196,149,106,0.25)`; e.currentTarget.style.transform="translateY(-1px)"; }}}
              onMouseLeave={e=>{ e.currentTarget.style.boxShadow=""; e.currentTarget.style.transform=""; }}
            >
              <div style={{ fontFamily:fontSans, fontSize:13, fontWeight:isToday?800:500, color:isToday?C.clay:C.text, textAlign:"right", paddingRight:2 }}>{day}</div>
              {shift && (
                <div style={{ marginTop:4 }}>
                  <div style={{
                    borderRadius:8, padding:"2px 5px", fontSize:9, fontFamily:fontSans, fontWeight:700,
                    background:covered?C.sage+"33":C.dustyRose+"33",
                    color:covered?C.sage:C.dustyRose,
                    letterSpacing:"0.03em", lineHeight:1.3, marginBottom:2
                  }}>
                    {shift.startTime}–{shift.endTime}
                  </div>
                  {covered && (
                    <div style={{ fontSize:9, fontFamily:fontSans, color:C.sage, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {shift.coveredBy?.split(" ")[0]}
                    </div>
                  )}
                  {open && <div style={{ fontSize:9, fontFamily:fontSans, color:C.dustyRose, fontWeight:600 }}>Open</div>}
                  {shift.kids?.length>0 && (
                    <div style={{ display:"flex", gap:2, flexWrap:"wrap", marginTop:2 }}>
                      {shift.kids.map(k=>(
                        <span key={k} style={{ fontSize:8, background:C.clay+"22", color:C.clay, borderRadius:6, padding:"1px 4px", fontFamily:fontSans, fontWeight:700 }}>{k[0]}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display:"flex", gap:16, marginTop:14, paddingTop:14, borderTop:`1px solid ${C.softBorder}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontFamily:fontSans, fontSize:12, color:C.textMuted }}>
          <div style={{ width:10, height:10, borderRadius:4, background:C.dustyRose+"66" }}/> Open shift
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontFamily:fontSans, fontSize:12, color:C.textMuted }}>
          <div style={{ width:10, height:10, borderRadius:4, background:C.sage+"66" }}/> Covered
        </div>
      </div>
    </div>
  );
}

// ── Upcoming shifts ───────────────────────────────────────────────────────────

function UpcomingShifts({ shifts, onShiftClick }) {
  const now = new Date();
  const upcoming = Object.entries(shifts)
    .filter(([k])=>new Date(k)>=now)
    .sort(([a],[b])=>a.localeCompare(b))
    .slice(0,6);

  return (
    <div style={{ marginTop:24 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div style={{ fontFamily:font, fontSize:20, color:C.warm }}>Upcoming Shifts</div>
        <button onClick={()=>{
          const ical = generateICal(shifts);
          const blob = new Blob([ical],{type:"text/calendar"});
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href=url; a.download="babywatch.ics"; a.click();
        }} style={{
          background:C.sand, border:`1.5px solid ${C.softBorder}`, borderRadius:20, padding:"6px 14px",
          fontFamily:fontSans, fontSize:12, fontWeight:700, color:C.warm, cursor:"pointer"
        }}>
          Export iCal
        </button>
      </div>

      {upcoming.length===0 && (
        <div style={{ fontFamily:fontSans, fontSize:14, color:C.textMuted, padding:20, textAlign:"center", background:C.white, borderRadius:14, border:`1.5px solid ${C.softBorder}` }}>
          No upcoming shifts posted yet.
        </div>
      )}

      {upcoming.map(([key, shift])=>{
        const [y,m,d] = key.split("-").map(Number);
        const weekday = DAYS[new Date(y,m-1,d).getDay()];
        return (
          <div key={key} onClick={()=>onShiftClick(key)}
            style={{ background:C.white, borderRadius:14, padding:"12px 16px", marginBottom:10, display:"flex", alignItems:"center", gap:14, cursor:"pointer", border:`1.5px solid ${C.softBorder}`, transition:"box-shadow .15s" }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 4px 14px rgba(139,99,71,0.1)`}
            onMouseLeave={e=>e.currentTarget.style.boxShadow=""}
          >
            <div style={{ textAlign:"center", minWidth:46, background:C.sand, borderRadius:10, padding:"6px 8px" }}>
              <div style={{ fontFamily:fontSans, fontSize:10, color:C.textMuted, fontWeight:700, textTransform:"uppercase" }}>{weekday}</div>
              <div style={{ fontFamily:font, fontSize:20, color:C.warm, fontWeight:700 }}>{d}</div>
              <div style={{ fontFamily:fontSans, fontSize:10, color:C.textMuted }}>{MONTHS[m-1].slice(0,3)}</div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:fontSans, fontSize:14, fontWeight:700, color:C.text }}>{shift.startTime} – {shift.endTime}</div>
              <div style={{ fontFamily:fontSans, fontSize:12, color:C.textMuted, marginTop:2 }}>
                {shift.kids?.join(", ")||"All kids"}
              </div>
            </div>
            <div>
              {shift.coveredBy
                ? <Badge color={C.sage}>{shift.coveredBy.split(" ")[0]}</Badge>
                : <Badge color={C.dustyRose}>Open</Badge>
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Admin Panel ───────────────────────────────────────────────────────────────

function AdminPanel({ users, setUsers, children: childrenList, setChildren, familyCode, currentUser, shifts }) {
  const [newChild, setNewChild] = useState("");
  const [tab, setTab] = useState("members");
  const familyMembers = users.filter(u=>u.familyCode===currentUser?.familyCode);
  const openShifts = Object.values(shifts).filter(s=>!s?.coveredBy).length;
  const coveredShifts = Object.values(shifts).filter(s=>s?.coveredBy).length;

  function removeUser(id) { if(id!==currentUser.id) setUsers(prev=>prev.filter(u=>u.id!==id)); }
  function addChild() { if(newChild.trim()){ setChildren(prev=>[...prev,newChild.trim()]); setNewChild(""); } }
  function removeChild(c) { setChildren(prev=>prev.filter(x=>x!==c)); }

  return (
    <div>
      {/* Header — matches rest of app */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:font, fontSize:26, color:C.warm, fontWeight:600, marginBottom:6 }}>Family Settings</div>
        <div style={{ background:C.sand, borderRadius:12, padding:"10px 16px", display:"inline-flex", alignItems:"center", gap:10 }}>
          <div style={{ fontFamily:fontSans, fontSize:11, color:C.textMuted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Family Code</div>
          <div style={{ fontFamily:fontSans, fontSize:15, fontWeight:800, color:C.clay, letterSpacing:"0.14em" }}>{familyCode}</div>
          <div style={{ fontFamily:fontSans, fontSize:11, color:C.textMuted }}>— share to invite family members</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:24 }}>
        {[
          { label:"Members", value:familyMembers.length },
          { label:"Open Shifts", value:openShifts },
          { label:"Covered", value:coveredShifts },
        ].map(s=>(
          <div key={s.label} style={{ background:C.white, borderRadius:14, padding:"16px 12px", textAlign:"center", border:`1.5px solid ${C.softBorder}` }}>
            <div style={{ fontFamily:font, fontSize:32, color:C.clay, fontWeight:700, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontFamily:fontSans, fontSize:11, color:C.textMuted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", gap:8, marginBottom:18, borderBottom:`1.5px solid ${C.softBorder}`, paddingBottom:0 }}>
        {["members","children"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:"8px 20px", borderRadius:"10px 10px 0 0", border:"none", cursor:"pointer",
            fontFamily:fontSans, fontWeight:700, fontSize:13, textTransform:"capitalize",
            background:tab===t?C.white:C.sand,
            color:tab===t?C.clay:C.textMuted,
            borderBottom:tab===t?`2px solid ${C.clay}`:"none",
            marginBottom: tab===t?"-1.5px":"0"
          }}>{t}</button>
        ))}
      </div>

      {tab==="members" && (
        <div>
          {familyMembers.map(u=>(
            <div key={u.id} style={{ background:C.white, borderRadius:12, padding:"12px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:12, border:`1.5px solid ${C.softBorder}` }}>
              <div style={{ width:38, height:38, borderRadius:"50%", background:C.clay+"33", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:fontSans, fontWeight:800, color:C.clay, fontSize:15, flexShrink:0 }}>
                {u.name[0].toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:fontSans, fontSize:14, fontWeight:700, color:C.text }}>{u.name}</div>
                <div style={{ fontFamily:fontSans, fontSize:12, color:C.textMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email}</div>
              </div>
              <Badge color={u.role==="parent"?C.clay:C.sage}>{u.tag||u.role}</Badge>
              {u.id!==currentUser.id && (
                <button onClick={()=>removeUser(u.id)} style={{ background:"none", border:"none", color:C.dustyRose, cursor:"pointer", fontSize:14, fontWeight:700, padding:"2px 6px", borderRadius:6 }}>Remove</button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab==="children" && (
        <div>
          {childrenList.map(c=>(
            <div key={c} style={{ background:C.white, borderRadius:12, padding:"11px 16px", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"space-between", border:`1.5px solid ${C.softBorder}` }}>
              <div style={{ fontFamily:fontSans, fontSize:14, fontWeight:600, color:C.text }}>{c}</div>
              <button onClick={()=>removeChild(c)} style={{ background:"none", border:"none", color:C.dustyRose, cursor:"pointer", fontSize:13, fontWeight:700, padding:"2px 8px", borderRadius:6 }}>Remove</button>
            </div>
          ))}
          <div style={{ display:"flex", gap:8, marginTop:12 }}>
            <input value={newChild} onChange={e=>setNewChild(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addChild()}
              placeholder="Add child's name"
              style={{ flex:1, background:C.white, border:`1.5px solid ${C.softBorder}`, borderRadius:10, padding:"10px 14px", fontFamily:fontSans, fontSize:14, color:C.text, outline:"none" }}
            />
            <Btn onClick={addChild} small>Add</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────

export default function App() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [children, setChildren] = useState(INITIAL_CHILDREN);
  const [shifts, setShifts] = useState(INITIAL_SHIFTS);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("calendar");
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [shiftModalKey, setShiftModalKey] = useState(null);
  const [addModalKey, setAddModalKey] = useState(null);

  function handleDayClick(key) {
    if (shifts[key]) setShiftModalKey(key);
    else if (currentUser?.role==="parent") setAddModalKey(key);
  }
  function handleClaim(key) {
    setShifts(prev=>({...prev,[key]:{...prev[key],coveredBy:currentUser.name,coveredById:currentUser.id}}));
  }
  function handleAssign(key, userId) {
    if (!userId) { setShifts(prev=>({...prev,[key]:{...prev[key],coveredBy:null,coveredById:null}})); return; }
    const u = users.find(u=>u.id===userId);
    if (u) setShifts(prev=>({...prev,[key]:{...prev[key],coveredBy:u.name,coveredById:u.id}}));
  }
  function handleDelete(key) { setShifts(prev=>{ const n={...prev}; delete n[key]; return n; }); }
  function handleAddShift(key, shift) { setShifts(prev=>({...prev,[key]:shift})); }

  if (!currentUser) {
    return <AuthScreen onLogin={setCurrentUser} users={users} setUsers={setUsers} familyCode={FAMILY_CODE} />;
  }

  return (
    <div style={{ minHeight:"100vh", background:C.cream, fontFamily:fontSans }}>
      {/* Nav */}
      <div style={{ background:C.white, borderBottom:`1px solid ${C.softBorder}`, padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <BabyLogo size={34} />
          <span style={{ fontFamily:font, fontSize:22, color:C.warm, fontWeight:700 }}>BabyWatch</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {currentUser.role==="parent" && (
            <Btn small variant={view==="admin"?"primary":"ghost"} onClick={()=>setView(v=>v==="admin"?"calendar":"admin")}>
              {view==="admin" ? "Calendar" : "Settings"}
            </Btn>
          )}
          <div style={{ background:C.clay+"22", borderRadius:20, padding:"5px 12px", fontFamily:fontSans, fontSize:13, fontWeight:700, color:C.clay, display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:24, height:24, borderRadius:"50%", background:C.clay, display:"flex", alignItems:"center", justifyContent:"center", color:C.white, fontSize:11, fontWeight:800 }}>
              {currentUser.name[0]}
            </div>
            {currentUser.name.split(" ")[0]}
          </div>
          <button onClick={()=>setCurrentUser(null)} style={{ background:C.sand, border:"none", borderRadius:20, padding:"5px 12px", fontFamily:fontSans, fontSize:12, color:C.textMuted, cursor:"pointer", fontWeight:600 }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:600, margin:"0 auto", padding:"20px 16px 60px" }}>

        {/* Welcome bar */}
        <div style={{ background:`linear-gradient(135deg, ${C.clay}15 0%, ${C.sage}15 100%)`, border:`1.5px solid ${C.clay}33`, borderRadius:16, padding:"14px 18px", marginBottom:22, display:"flex", alignItems:"center", gap:14, position:"relative", overflow:"hidden" }}>
          <LeafMark style={{ width:80, height:100, top:-10, right:10, opacity:0.06 }} />
          <div style={{ width:42, height:42, borderRadius:"50%", background:C.earth, display:"flex", alignItems:"center", justifyContent:"center", color:C.white, fontFamily:fontSans, fontWeight:800, fontSize:18, flexShrink:0 }}>
            {currentUser.name[0]}
          </div>
          <div>
            <div style={{ fontFamily:font, fontSize:18, color:C.clay, fontWeight:600 }}>
              Hi, {currentUser.name.split(" ")[0]}
            </div>
            <div style={{ fontFamily:fontSans, fontSize:13, color:C.textMuted }}>
              {currentUser.role==="parent"
                ? "Tap any open day to post a shift, or tap a shift to manage it."
                : "Tap an open shift to claim it for the family."}
            </div>
          </div>
        </div>

        {view==="admin" && currentUser.role==="parent" ? (
          <AdminPanel users={users} setUsers={setUsers} children={children} setChildren={setChildren} familyCode={FAMILY_CODE} currentUser={currentUser} shifts={shifts} />
        ) : (
          <>
            <CalendarView shifts={shifts} currentUser={currentUser} onDayClick={handleDayClick} year={calYear} month={calMonth} setYear={setCalYear} setMonth={setCalMonth} />
            <UpcomingShifts shifts={shifts} onShiftClick={k=>setShiftModalKey(k)} />
          </>
        )}
      </div>

      <ShiftModal open={!!shiftModalKey} onClose={()=>setShiftModalKey(null)} dateStr={shiftModalKey} shift={shiftModalKey?shifts[shiftModalKey]:null} currentUser={currentUser} users={users} onClaim={handleClaim} onAssign={handleAssign} onDelete={handleDelete} />
      <AddShiftModal open={!!addModalKey} onClose={()=>setAddModalKey(null)} selectedDate={addModalKey} onAdd={handleAddShift} children={children} />
    </div>
  );
}
