// ============================================================
//  App shell — nav, login gate, role-based routing
// ============================================================
const { useState, useEffect } = React;

function Sigil({ size = 34 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <circle cx="24" cy="24" r="21" fill="none" stroke="url(#sg)" strokeWidth="1.4" />
      <circle cx="24" cy="24" r="15" fill="none" stroke="url(#sg)" strokeWidth="0.8" strokeDasharray="1.5 3" />
      <path d="M24 5 L29 19 L43 24 L29 29 L24 43 L19 29 L5 24 L19 19 Z" fill="url(#sg)" opacity="0.95" />
      <circle cx="24" cy="24" r="3.4" fill="#0b0a14" stroke="url(#sg)" strokeWidth="1" />
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6dd9b" />
          <stop offset="1" stopColor="#a9853a" />
        </linearGradient>
      </defs>
    </svg>);
}

function LoginGate() {
  const state = useStore();
  const [mode, setMode] = useState("student"); // 'student' | 'teacher'
  const [sid, setSid] = useState("");
  const [firstName, setFirstName] = useState("");
  const [pw, setPw] = useState("");
  const [url, setUrl] = useState(state.appsScriptUrl || "");
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = React.useRef(null);
  useEffect(() => { inputRef.current && inputRef.current.focus(); }, [mode]);
  const [showUrlField, setShowUrlField] = useState(false);
  const needsUrl = !state.appsScriptUrl || showUrlField;

  function fail(msg) {
    setErr(msg);
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }

  async function submit(e) {
    e && e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      if (needsUrl) {
        const u = url.trim();
        if (!u) throw new Error("กรอก Apps Script URL ก่อน");
        window.Kru4Store.setAppsScriptUrl(u);
      }
      if (mode === "student") {
        if (!sid.trim() || !firstName.trim()) throw new Error("กรอกรหัสและชื่อจริง");
        await window.Kru4Store.loginStudent(sid, firstName);
      } else {
        if (!pw) throw new Error("กรอกรหัสผ่าน");
        await window.Kru4Store.loginTeacher(pw);
      }
    } catch (ex) {
      fail(ex.message || "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  const tabStyle = (active) => ({
    flex: 1, padding: "10px 0", borderRadius: 9,
    background: active ? "linear-gradient(180deg, rgba(224,191,110,.3), rgba(224,191,110,.08))" : "transparent",
    color: active ? "var(--gold-bright)" : "var(--ink-dim)",
    border: `1px solid ${active ? "rgba(224,191,110,.55)" : "var(--line-soft)"}`,
    fontFamily: "var(--serif)", fontWeight: 600, fontSize: 14, cursor: "pointer",
  });
  const inputBase = {
    width: "100%", padding: "13px 14px", borderRadius: 11, fontSize: 15,
    border: `1px solid ${err ? "#e8889a" : "var(--line)"}`,
    background: "rgba(0,0,0,.4)", color: "var(--ink)", outline: "none",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(5,4,10,0.92)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <form onSubmit={submit} style={{
        width: "min(440px, 100%)", borderRadius: 22, padding: "34px 30px",
        background: "linear-gradient(180deg, #1a1530, #100c1f)",
        border: "1px solid var(--line)",
        boxShadow: "0 0 80px -10px rgba(125,68,196,.55), var(--shadow-lg)",
        textAlign: "center",
        animation: shake ? "shake .5s" : "floatUp .35s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, animation: "spinSlow 26s linear infinite" }}>
          <Sigil size={50} />
        </div>
        <h3 style={{ margin: "0 0 16px", fontFamily: "var(--serif)", fontWeight: 700, fontSize: 22 }}>
          <span className="gold-text">ACADEMIA · หอเกียรติยศ</span>
        </h3>

        {needsUrl && (
          <div style={{ marginBottom: 14, textAlign: "left" }}>
            <div style={{ fontSize: 10.5, letterSpacing: 2, color: "var(--ink-faint)", marginBottom: 5 }}>
              SETUP: APPS SCRIPT URL
            </div>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              style={{ ...inputBase, padding: "10px 12px", fontSize: 13 }} />
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button type="button" onClick={() => { setMode("student"); setErr(""); }} style={tabStyle(mode === "student")}>นักเรียน</button>
          <button type="button" onClick={() => { setMode("teacher"); setErr(""); }} style={tabStyle(mode === "teacher")}>คุณครู</button>
        </div>

        {mode === "student" ? (
          <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
            <input ref={inputRef} type="text" inputMode="numeric" autoComplete="username"
              value={sid} onChange={(e) => setSid(e.target.value)}
              placeholder="รหัสประจำตัว" style={{ ...inputBase, textAlign: "center", letterSpacing: 2 }} />
            <input type="text" autoComplete="given-name"
              value={firstName} onChange={(e) => setFirstName(e.target.value)}
              placeholder="ชื่อจริง (ไม่ต้องมีคำนำหน้า/นามสกุล)" style={{ ...inputBase, textAlign: "center" }} />
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <input ref={inputRef} type="password" autoComplete="current-password"
              value={pw} onChange={(e) => setPw(e.target.value)}
              placeholder="รหัสผ่านคุณครู" style={{ ...inputBase, textAlign: "center", letterSpacing: 2 }} />
          </div>
        )}

        {err && <div style={{ color: "#e8889a", fontSize: 13, marginBottom: 10 }}>{err}</div>}

        <button type="submit" disabled={busy} style={{
          width: "100%", padding: "13px", borderRadius: 11, border: "1px solid rgba(224,191,110,.55)",
          background: "linear-gradient(180deg, rgba(224,191,110,.35), rgba(224,191,110,.14))",
          color: "var(--gold-bright)", fontWeight: 700, fontSize: 15, letterSpacing: 1,
          opacity: busy ? 0.6 : 1,
        }}>{busy ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}</button>

        <div style={{ marginTop: 12, fontSize: 11, color: "var(--ink-faint)", letterSpacing: 1 }}>
          {mode === "student" ? "ชื่อจริง = field ที่ 2 ในชื่อเต็ม (เช่น \"นาย พงศกร แสงสุวรรณ\" → \"พงศกร\")" : ""}
        </div>

        {state.appsScriptUrl && (
          <div style={{ marginTop: 8, fontSize: 10.5, color: "var(--ink-faint)" }}>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowUrlField((v) => !v); }}
              style={{ color: "var(--gold)", textDecoration: "none" }}>
              {showUrlField ? "ซ่อน URL" : ""}
            </a>
          </div>
        )}

        <div style={{
          marginTop: 16, padding: "10px 12px", borderRadius: 9,
          background: "rgba(0,0,0,.25)", border: "1px solid var(--line-soft)",
          fontSize: 10.5, color: "var(--ink-faint)", textAlign: "left", lineHeight: 1.55,
        }}>
          <b style={{ color: "var(--ink-dim)" }}>ประกาศความเป็นส่วนตัว (PDPA):</b> ระบบเก็บข้อมูลรหัสประจำตัว, ชื่อ-สกุล, ชั้น, บ้าน
          เพื่อใช้บริหารคะแนนบ้านในกิจกรรมการเรียน <br /> · ข้อมูลเข้าถึงได้เฉพาะคุณครูที่มีรหัสผ่าน <br />
          · นักเรียนเข้าดูเฉพาะข้อมูลของตนเอง · มีบันทึก access log <br />
          · ขอสำเนาข้อมูลของตนได้ที่หน้า "บัญชีของฉัน" หลัง login <br />
          · การ login = ยอมรับการประมวลผลข้อมูลเพื่อวัตถุประสงค์ดังกล่าว
        </div>
      </form>
    </div>);
}

function NavTab({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      position: "relative",
      padding: "8px 16px", borderRadius: 10, border: "none", background: "none",
      fontFamily: "var(--serif)", fontWeight: active ? 700 : 500, fontSize: 15,
      color: active ? "var(--gold-bright)" : "var(--ink-dim)",
      transition: "color .2s",
      display: "flex", alignItems: "center", gap: 6,
    }}>
      {children}
      {active && <span style={{
        position: "absolute", left: 12, right: 12, bottom: 1, height: 2, borderRadius: 2,
        background: "linear-gradient(90deg, transparent, var(--gold), transparent)",
      }} />}
    </button>);
}

function LoadingOverlay() {
  const loading = useLoading();
  if (!loading) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(5,4,10,0.55)", backdropFilter: "blur(3px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      pointerEvents: "auto",
    }}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
        padding: "26px 36px", borderRadius: 18,
        background: "linear-gradient(180deg, #1a1530, #100c1f)",
        border: "1px solid rgba(224,191,110,.35)",
        boxShadow: "0 0 60px -10px rgba(224,191,110,.5), var(--shadow-lg)",
      }}>
        <div style={{ animation: "spinSlow 2.2s linear infinite", filter: "drop-shadow(0 0 12px rgba(246,221,155,.6))" }}>
          <Sigil size={56} />
        </div>
        <div style={{
          fontFamily: "var(--display)", letterSpacing: 4, fontSize: 12,
          color: "var(--gold)", textTransform: "uppercase",
          animation: "glowPulse 1.4s ease-in-out infinite",
        }}>กำลังเชื่อมต่อระบบ</div>
      </div>
    </div>
  );
}

function App() {
  const session = useSession();
  const [tab, setTab] = useState("board");
  const w = useWindowWidth();
  const narrow = w < 760;

  if (!session) return (<><LoginGate /><LoadingOverlay /></>);

  const role = session.role;
  const tabs = role === "teacher"
    ? [
      { id: "board", label: "กระดานคะแนน" },
      { id: "teacher", label: "แผงคุณครู" },
      { id: "canva", label: "คลังสไลด์" },
      { id: "admin", label: "การจัดการ" },
    ]
    : [
      { id: "board", label: "กระดานคะแนน" },
      { id: "canva", label: "คลังสไลด์" },
      { id: "account", label: "บัญชีของฉัน" },
    ];

  // guard: invalid tab for current role → reset
  if (!tabs.find((t) => t.id === tab)) {
    setTimeout(() => setTab("board"), 0);
  }

  function logout() {
    window.Kru4Store.logout();
    setTab("board");
  }

  const roleLabel = role === "teacher" ? "คุณครู" : "นักเรียน";

  return (
    <div>
      <header style={{
        position: "sticky", top: 0, zIndex: 30,
        backdropFilter: "blur(10px)",
        background: "linear-gradient(180deg, rgba(11,10,20,.92), rgba(11,10,20,.6))",
        borderBottom: "1px solid var(--line-soft)",
      }}>
        <div style={{
          maxWidth: 1180, margin: "0 auto", padding: narrow ? "10px 16px" : "12px 24px",
          display: "flex", alignItems: "center",
          gap: narrow ? 10 : 18, flexWrap: narrow ? "wrap" : "nowrap",
          rowGap: narrow ? 8 : 12,
        }}>
          <div
            onClick={() => setTab("board")}
            title="กลับสู่กระดานคะแนน"
            style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer", flexShrink: 0 }}>
            <Sigil />
            <div>
              <div style={{ fontFamily: "var(--serif)", fontWeight: 700, fontSize: narrow ? 15 : 17, lineHeight: 1, whiteSpace: "nowrap" }}>
                <span className="gold-text">ACADEMIA · หอเกียรติยศ</span>
              </div>
              <div style={{ fontFamily: "var(--display)", fontSize: 9.5, letterSpacing: 3, color: "var(--ink-faint)", marginTop: 3, whiteSpace: "nowrap" }}>
                BY KRU FOUR · {roleLabel.toUpperCase()}
              </div>
            </div>
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            marginLeft: narrow ? "auto" : 0, order: narrow ? 2 : 3
          }}>
            <button onClick={logout} style={pillBtn}>ออกจากระบบ</button>
          </div>

          <nav style={{
            display: "flex", gap: 4,
            marginLeft: narrow ? 0 : "auto",
            order: narrow ? 3 : 2,
            width: narrow ? "100%" : "auto",
            justifyContent: narrow ? "center" : "flex-start",
            borderTop: narrow ? "1px solid var(--line-soft)" : "none",
            paddingTop: narrow ? 6 : 0,
          }}>
            {tabs.map((t) => (
              <NavTab key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
                {t.label}
              </NavTab>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ paddingTop: 26 }}>
        <div key={tab} style={{ animation: "pageRise .4s cubic-bezier(.2,.8,.2,1) both" }}>
          {tab === "board" && <Scoreboard />}
          {tab === "teacher" && role === "teacher" && <TeacherPanel />}
          {tab === "canva" && <CanvaLibrary isTeacher={role === "teacher"} />}
          {tab === "account" && role === "student" && <AccountPage />}
          {tab === "admin" && role === "teacher" && <AdminPanel />}
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: "20px", color: "var(--ink-faint)", fontSize: 12, borderTop: "1px solid var(--line-soft)" }}>
        Renovia · Barocca · Impressa · Novara — ✦ ขอแสงนำทางสู่บ้านที่ดีที่สุด ✦
      </footer>
      <LoadingOverlay />
    </div>);
}

const pillBtn = {
  padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
  border: "1px solid var(--line)", background: "rgba(224,191,110,.08)", color: "var(--gold-bright)",
};

// shake keyframe (used by login)
const sk = document.createElement("style");
sk.textContent = "@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}";
document.head.appendChild(sk);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
