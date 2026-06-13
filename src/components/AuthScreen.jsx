import { useEffect, useState } from "react";
import { C, font, fontSans } from "../lib/theme";
import { store } from "../lib/store";
import { Btn, Input, Select, LeafMark } from "./UI";
import BabyLogo from "./Logo";

export default function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("family");
  const [tag, setTag] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [invited, setInvited] = useState(false);

  // If opened via an invite link (?code=ABC123), prefill the code and jump
  // straight to account creation.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get("code");
    if (inviteCode) {
      setCode(inviteCode.trim().toUpperCase());
      setMode("register");
      setInvited(true);
    }
  }, []);

  async function submit() {
    setErr("");
    setBusy(true);
    try {
      const user = mode === "login"
        ? await store.signIn({ email, password })
        : await store.signUp({ name, email, password, role, tag, code });
      onLogin(user);
    } catch (e) {
      setErr(e.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: C.cream, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden",
    }}>
      <LeafMark style={{ width: 160, height: 200, top: -40, left: -30, transform: "rotate(-15deg)" }} />
      <LeafMark style={{ width: 120, height: 160, bottom: 20, right: -20, transform: "rotate(20deg)" }} />

      <div style={{ textAlign: "center", marginBottom: 32, position: "relative" }}>
        <div style={{ margin: "0 auto 12px", width: 56, display: "flex", justifyContent: "center" }}>
          <BabyLogo size={56} dark />
        </div>
        <div style={{ fontFamily: font, fontSize: 36, color: C.warm, fontWeight: 700 }}>BabyWatch</div>
        <div style={{ fontFamily: fontSans, fontSize: 14, color: C.textMuted, marginTop: 4 }}>
          Family care, beautifully coordinated
        </div>
      </div>

      <div style={{ background: C.white, borderRadius: 24, padding: 28, width: "100%", maxWidth: 380, boxShadow: "0 4px 30px rgba(139,99,71,0.1)" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {[["login", "Sign In"], ["register", "Create Account"]].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setErr(""); }} style={{
              flex: 1, padding: "9px 0", borderRadius: 20, border: "none", cursor: "pointer",
              fontFamily: fontSans, fontWeight: 700, fontSize: 13, letterSpacing: "0.04em",
              background: mode === m ? C.clay : C.sand,
              color: mode === m ? C.white : C.textMuted,
              transition: "all .2s",
            }}>{label}</button>
          ))}
        </div>

        {mode === "login" ? (
          <>
            <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
            <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password"
              onKeyDown={(e) => e.key === "Enter" && submit()} />
          </>
        ) : (
          <>
            <Input label="Your Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grandma Sue" />
            <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
            <Input label="Password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Choose a password" />
            <Select label="I am a" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="family">Family Member / Nanny</option>
              <option value="parent">Parent</option>
            </Select>
            <Input label="Tag (e.g. Mom, Dad, Grandma, Nanny)" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Optional" />
            {role === "family" ? (
              <Input label="Family Code (ask a parent for this)" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 7K3MQ2"
                style={{ textTransform: "uppercase", letterSpacing: "0.1em" }} />
            ) : (
              <Input label="Family Invite Code (optional)" value={code} onChange={(e) => setCode(e.target.value)}
                placeholder="Leave blank to start a new family"
                style={{ textTransform: "uppercase", letterSpacing: "0.1em" }} />
            )}
            {invited && (
              <div style={{
                background: C.sage + "22", borderRadius: 10, padding: "8px 12px", marginBottom: 14,
                fontFamily: fontSans, fontSize: 12, color: C.warm, lineHeight: 1.5,
              }}>
                You're joining with invite code <strong>{code}</strong>.
              </div>
            )}
          </>
        )}

        {err && <div style={{ color: C.dustyRose, fontFamily: fontSans, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>{err}</div>}

        <Btn onClick={submit} disabled={busy} style={{ width: "100%", marginTop: 4 }}>
          {busy ? "One moment..." : mode === "login" ? "Sign In" : role === "parent" ? "Create Account" : "Join Family"}
        </Btn>

        {mode === "register" && (
          <div style={{ fontFamily: fontSans, fontSize: 12, color: C.textMuted, textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
            {role === "parent"
              ? "Parents get full access: post shifts, manage the family, and share the join code."
              : "Family members and nannies can view and claim shifts."}
          </div>
        )}
      </div>
    </div>
  );
}
