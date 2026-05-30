// ============================================================
//  Teacher panel — award / deduct points, history log
// ============================================================

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "เมื่อครู่นี้";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} นาทีก่อน`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงก่อน`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} วันก่อน`;
  const dt = new Date(ts);
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const yr = (dt.getFullYear() + 543) % 100;
  const sameYear = dt.getFullYear() === new Date().getFullYear();
  return `${dt.getDate()} ${months[dt.getMonth()]}${sameYear ? "" : " " + yr}`;
}

function HouseAwardCard({ house }) {
  const c = house.colors;
  const [reason, setReason] = React.useState("");
  const [custom, setCustom] = React.useState("");
  const [pulse, setPulse] = React.useState(0);
  const { hexA, shade } = window.kru4Helpers;

  function give(delta) {
    if (!delta) return;
    window.Kru4Store.addScore(house.id, delta, reason.trim() || "ปรับแต้มโดยครู");
    setReason("");
    setCustom("");
    setPulse((p) => p + 1);
  }

  const chip = (val) => (
    <button
      key={val}
      onClick={() => give(val)}
      style={{
        flex: 1,
        padding: "10px 0",
        borderRadius: 10,
        border: `1px solid ${hexA(c.accent, 0.4)}`,
        background: `linear-gradient(180deg, ${hexA(c.glow, 0.22)}, ${hexA(c.main, 0.3)})`,
        color: "var(--ink)",
        fontFamily: "var(--display)",
        fontWeight: 700,
        fontSize: 15,
        transition: "all .15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `linear-gradient(180deg, ${hexA(c.glow, 0.5)}, ${hexA(c.main, 0.55)})`;
        e.currentTarget.style.boxShadow = `0 0 18px ${hexA(c.glow, 0.6)}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = `linear-gradient(180deg, ${hexA(c.glow, 0.22)}, ${hexA(c.main, 0.3)})`;
        e.currentTarget.style.boxShadow = "none";
      }}
    >+{val}</button>
  );

  return (
    <div style={{
      borderRadius: 16,
      padding: 16,
      background: "var(--panel)",
      backdropFilter: "blur(6px)",
      border: `1px solid ${hexA(c.glow, 0.35)}`,
      boxShadow: `0 0 30px -16px ${hexA(c.glow, 0.9)}`,
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 10, overflow: "hidden", flexShrink: 0,
          background: "radial-gradient(circle at 50% 30%, #fbf3df, #e6d6b0)",
          border: `1px solid ${hexA(c.accent, 0.6)}`,
        }}>
          <img src={house.crest} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 30%", mixBlendMode: "multiply" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--serif)", fontWeight: 700, fontSize: 17 }}>{house.th}</div>
          <div style={{ fontFamily: "var(--display)", fontSize: 10, letterSpacing: 2, color: "var(--ink-faint)" }}>{house.name}</div>
        </div>
        <div key={pulse} style={{
          fontFamily: "var(--display)", fontWeight: 800, fontSize: 26,
          color: c.accent, animation: "floatUp .4s ease",
        }}>{house.score}</div>
      </div>

      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="เหตุผล (ไม่บังคับ)"
        style={inputStyle}
      />

      <div style={{ display: "flex", gap: 8 }}>
        {[5, 10, 20].map(chip)}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="number"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="จำนวน"
          style={{ ...inputStyle, flex: 1, textAlign: "center" }}
        />
        <button
          onClick={() => give(Math.abs(parseInt(custom, 10) || 0))}
          style={miniBtn("rgba(86,168,119,.25)", "rgba(86,168,119,.6)")}
          title="เพิ่มแต้ม"
        >＋ เพิ่ม</button>
        <button
          onClick={() => give(-Math.abs(parseInt(custom, 10) || 0))}
          style={miniBtn("rgba(192,40,63,.22)", "rgba(192,40,63,.55)")}
          title="หักแต้ม"
        >－ หัก</button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 9,
  border: "1px solid var(--line)",
  background: "rgba(0,0,0,0.28)",
  color: "var(--ink)",
  fontSize: 14,
  outline: "none",
};

function miniBtn(bg, border) {
  return {
    padding: "9px 12px",
    borderRadius: 9,
    border: `1px solid ${border}`,
    background: bg,
    color: "var(--ink)",
    fontWeight: 600,
    fontSize: 13,
    whiteSpace: "nowrap",
  };
}

function dayStart(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function dayEnd(ts) {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
function isoDate(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function HistoryLog() {
  const state = useStore();
  const houseById = Object.fromEntries(state.houses.map((h) => [h.id, h]));
  const [houseFilter, setHouseFilter] = React.useState("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [signFilter, setSignFilter] = React.useState("all"); // all|pos|neg

  let list = state.history;
  if (houseFilter !== "all") list = list.filter((e) => e.houseId === houseFilter);
  if (signFilter === "pos") list = list.filter((e) => e.delta > 0);
  if (signFilter === "neg") list = list.filter((e) => e.delta < 0);
  if (from) {
    const fromTs = dayStart(from);
    list = list.filter((e) => e.ts >= fromTs);
  }
  if (to) {
    const toTs = dayEnd(to);
    list = list.filter((e) => e.ts <= toTs);
  }

  const total = state.history.length;
  const showing = list.length;
  const sumDelta = list.reduce((s, e) => s + e.delta, 0);
  const hasFilter = houseFilter !== "all" || signFilter !== "all" || from || to;

  function reset() {
    setHouseFilter("all");
    setFrom(""); setTo("");
    setSignFilter("all");
  }

  return (
    <div style={{
      borderRadius: 16, background: "var(--panel)", backdropFilter: "blur(6px)",
      border: "1px solid var(--line)", overflow: "hidden",
    }}>
      <div style={{
        padding: "14px 18px", borderBottom: "1px solid var(--line-soft)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: 16 }}>ประวัติการให้คะแนน</span>
          <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>
            {hasFilter ? `${showing} / ${total}` : `${total} รายการ`}
            {hasFilter && <> · รวม <b style={{ color: sumDelta >= 0 ? "#7fd6a0" : "#e8889a" }}>{sumDelta >= 0 ? "+" : ""}{sumDelta}</b></>}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <select value={houseFilter} onChange={(e) => setHouseFilter(e.target.value)} style={{ ...inputStyle, width: 130, padding: "7px 10px", fontSize: 13 }}>
            <option value="all">ทุกบ้าน</option>
            {state.houses.map((h) => <option key={h.id} value={h.id}>{h.th}</option>)}
          </select>
          <select value={signFilter} onChange={(e) => setSignFilter(e.target.value)} style={{ ...inputStyle, width: 110, padding: "7px 10px", fontSize: 13 }}>
            <option value="all">+ และ -</option>
            <option value="pos">+ เพิ่ม</option>
            <option value="neg">- หัก</option>
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} max={to || undefined}
            style={{ ...inputStyle, width: 150, padding: "7px 10px", fontSize: 13 }} title="จากวันที่" />
          <span style={{ alignSelf: "center", color: "var(--ink-faint)", fontSize: 13 }}>→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} min={from || undefined}
            style={{ ...inputStyle, width: 150, padding: "7px 10px", fontSize: 13 }} title="ถึงวันที่" />
          {hasFilter && (
            <button onClick={reset} type="button"
              style={miniBtn("rgba(255,255,255,.04)", "var(--line)")}>ล้างตัวกรอง</button>
          )}
        </div>
      </div>
      <div style={{ maxHeight: 420, overflowY: "auto" }}>
        {list.length === 0 && (
          <div style={{ padding: 28, textAlign: "center", color: "var(--ink-faint)" }}>
            {total === 0 ? "ยังไม่มีรายการ" : "ไม่ตรงกับตัวกรอง"}
          </div>
        )}
        {list.map((e) => {
          const h = houseById[e.houseId];
          if (!h) return null;
          const pos = e.delta >= 0;
          return (
            <div key={e.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "11px 18px", borderBottom: "1px solid var(--line-soft)",
            }}>
              <span style={{
                width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
                background: h.colors.glow, boxShadow: `0 0 8px ${h.colors.glow}`,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14 }}>
                  <b style={{ color: h.colors.ink }}>{h.th}</b>
                  <span style={{ color: "var(--ink-dim)" }}> · {e.reason}</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
                  {timeAgo(e.ts)} · {isoDate(e.ts)}
                </div>
              </div>
              <span style={{
                fontFamily: "var(--display)", fontWeight: 800, fontSize: 16,
                color: pos ? "#7fd6a0" : "#e8889a",
              }}>{pos ? "+" : ""}{e.delta}</span>
              <button
                onClick={() => window.Kru4Store.undoEntry(e.id)}
                title="ยกเลิกรายการนี้"
                style={{
                  border: "1px solid var(--line)", background: "transparent",
                  color: "var(--ink-faint)", borderRadius: 7, padding: "4px 8px", fontSize: 12,
                }}
              >ยกเลิก</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RosterSyncCard() {
  const state = useStore();
  const [url, setUrl] = React.useState(state.appsScriptUrl || "");
  const [status, setStatus] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { setUrl(state.appsScriptUrl || ""); }, [state.appsScriptUrl]);

  function saveUrl() {
    window.Kru4Store.setAppsScriptUrl(url);
    setStatus({ ok: true, msg: "บันทึก URL แล้ว" });
  }
  async function doSync() {
    setBusy(true);
    setStatus(null);
    try {
      window.Kru4Store.setAppsScriptUrl(url);
      const r = await window.Kru4Store.syncRoster();
      setStatus({ ok: true, msg: `Sync สำเร็จ · ${r.count} คน · ${r.classes} ห้อง` });
    } catch (e) {
      setStatus({ ok: false, msg: "Sync ไม่สำเร็จ: " + (e.message || e) });
    } finally {
      setBusy(false);
    }
  }
  const last = state.lastSync ? new Date(state.lastSync).toLocaleString("th-TH") : "ยังไม่เคย";

  return (
    <div style={{
      borderRadius: 16, padding: 18, marginBottom: 22,
      background: "var(--panel)", backdropFilter: "blur(6px)",
      border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: 17 }}>
          <span className="gold-text">รายชื่อนักเรียนจาก Google Sheet</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>Sync ล่าสุด: {last}</div>
      </div>
      <p style={{ margin: "0 0 12px", color: "var(--ink-dim)", fontSize: 13 }}>
        วาง URL ของ Apps Script web app (Deploy → New deployment → Web app) ที่ดึงข้อมูล Tab ขึ้นต้นด้วย "ม.6"
      </p>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://script.google.com/macros/s/.../exec"
        style={{ ...inputStyle, marginBottom: 10 }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={saveUrl} disabled={busy}
          style={miniBtn("rgba(86,168,119,.18)", "rgba(86,168,119,.5)")}>บันทึก URL</button>
        <button onClick={doSync} disabled={busy || !url}
          style={miniBtn("rgba(224,191,110,.22)", "rgba(224,191,110,.55)")}>
          {busy ? "กำลัง Sync..." : "Sync รายชื่อ"}
        </button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: "var(--ink-dim)", alignSelf: "center" }}>
          ปัจจุบัน: {Object.keys(state.students).length} คน
        </span>
      </div>
      {status && (
        <div style={{
          marginTop: 12, padding: "8px 12px", borderRadius: 8, fontSize: 13,
          color: status.ok ? "#7fd6a0" : "#e8889a",
          background: status.ok ? "rgba(86,168,119,.1)" : "rgba(192,40,63,.1)",
          border: `1px solid ${status.ok ? "rgba(86,168,119,.4)" : "rgba(192,40,63,.4)"}`,
        }}>{status.msg}</div>
      )}
    </div>
  );
}

function StudentRosterTable() {
  const state = useStore();
  const houses = state.houses;
  const list = Object.values(state.students);
  const [filter, setFilter] = React.useState("");
  const [houseFilter, setHouseFilter] = React.useState("all");

  if (list.length === 0) {
    return (
      <div style={{
        borderRadius: 16, padding: 26, textAlign: "center",
        background: "var(--panel)", border: "1px solid var(--line)",
        color: "var(--ink-faint)", fontSize: 14,
      }}>
        ยังไม่มีรายชื่อนักเรียน — กรุณา Sync จาก Google Sheet
      </div>
    );
  }
  const q = filter.trim().toLowerCase();
  let filtered = list;
  if (q) {
    filtered = filtered.filter((s) =>
      String(s.studentId).toLowerCase().includes(q) ||
      String(s.name).toLowerCase().includes(q) ||
      String(s.className).toLowerCase().includes(q)
    );
  }
  if (houseFilter !== "all") filtered = filtered.filter((s) => s.houseId === houseFilter);
  filtered.sort((a, b) => {
    if (a.className !== b.className) return a.className.localeCompare(b.className);
    return (parseInt(a.seq, 10) || 0) - (parseInt(b.seq, 10) || 0);
  });

  return (
    <div style={{
      borderRadius: 16, background: "var(--panel)", backdropFilter: "blur(6px)",
      border: "1px solid var(--line)", overflow: "hidden",
    }}>
      <div style={{
        padding: "14px 18px", borderBottom: "1px solid var(--line-soft)",
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        <span style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: 16 }}>จัดกลุ่มบ้านของนักเรียน</span>
        <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{filtered.length} / {list.length}</span>
        <span style={{ flex: 1 }} />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="ค้นหา ชื่อ/รหัส/ชั้น"
          style={{ ...inputStyle, width: 220 }}
        />
        <select value={houseFilter} onChange={(e) => setHouseFilter(e.target.value)} style={{ ...inputStyle, width: 140 }}>
          <option value="all">ทุกบ้าน</option>
          {houses.map((h) => <option key={h.id} value={h.id}>{h.th}</option>)}
        </select>
      </div>
      <div style={{ maxHeight: 480, overflowY: "auto" }}>
        {filtered.map((s) => {
          const h = houses.find((x) => x.id === s.houseId) || houses[0];
          return (
            <div key={s.studentId} style={{
              display: "grid",
              gridTemplateColumns: "minmax(60px,auto) minmax(110px,auto) 1fr minmax(140px,auto) minmax(150px,auto)",
              gap: 10, alignItems: "center",
              padding: "10px 18px", borderBottom: "1px solid var(--line-soft)",
              fontSize: 13.5,
            }}>
              <span style={{ color: "var(--ink-dim)" }}>{s.className}</span>
              <span style={{ color: "var(--ink-faint)", fontFamily: "var(--display)" }}>{s.studentId}</span>
              <span style={{ color: "var(--ink)" }}>{s.name}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{
                  width: 9, height: 9, borderRadius: "50%",
                  background: h.colors.glow, boxShadow: `0 0 6px ${h.colors.glow}`,
                }} />
                <span style={{ color: h.colors.ink }}>{h.th}</span>
              </span>
              <select
                value={s.houseId || ""}
                onChange={(e) => {
                  window.Kru4Store.setStudentHouse(s.studentId, e.target.value)
                    .catch((err) => alert("เปลี่ยนบ้านไม่สำเร็จ: " + (err.message || err)));
                }}
                style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}
              >
                {houses.map((hh) => <option key={hh.id} value={hh.id}>{hh.th}</option>)}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PasswordChangeCard() {
  const [oldPw, setOldPw] = React.useState("");
  const [newPw, setNewPw] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [status, setStatus] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setStatus(null);
    if (newPw !== confirm) {
      setStatus({ ok: false, msg: "รหัสใหม่กับยืนยันไม่ตรงกัน" });
      return;
    }
    setBusy(true);
    try {
      await window.Kru4Store.changeTeacherPassword(oldPw, newPw);
      setStatus({ ok: true, msg: "เปลี่ยนรหัสสำเร็จ" });
      setOldPw(""); setNewPw(""); setConfirm("");
    } catch (ex) {
      setStatus({ ok: false, msg: ex.message || "ผิดพลาด" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      borderRadius: 16, padding: 18, marginBottom: 22,
      background: "var(--panel)", backdropFilter: "blur(6px)",
      border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: 17 }}>
          <span className="gold-text">เปลี่ยนรหัสผ่านคุณครู</span>
        </div>
        <button onClick={() => setOpen((v) => !v)} type="button"
          style={miniBtn("rgba(255,255,255,.05)", "var(--line)")}>
          {open ? "ปิด" : "แสดงฟอร์ม"}
        </button>
      </div>
      {open && (
        <form onSubmit={submit} style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <input type="password" autoComplete="current-password"
            value={oldPw} onChange={(e) => setOldPw(e.target.value)}
            placeholder="รหัสผ่านปัจจุบัน" style={inputStyle} required />
          <input type="password" autoComplete="new-password"
            value={newPw} onChange={(e) => setNewPw(e.target.value)}
            placeholder="รหัสผ่านใหม่ (อย่างน้อย 4 ตัว)" style={inputStyle} required minLength={4} />
          <input type="password" autoComplete="new-password"
            value={confirm} onChange={(e) => setConfirm(e.target.value)}
            placeholder="ยืนยันรหัสผ่านใหม่" style={inputStyle} required minLength={4} />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={busy}
              style={miniBtn("rgba(86,168,119,.22)", "rgba(86,168,119,.55)")}>
              {busy ? "กำลังบันทึก..." : "บันทึกรหัสใหม่"}
            </button>
            <span style={{ flex: 1 }} />
          </div>
          {status && (
            <div style={{
              padding: "8px 12px", borderRadius: 8, fontSize: 13,
              color: status.ok ? "#7fd6a0" : "#e8889a",
              background: status.ok ? "rgba(86,168,119,.1)" : "rgba(192,40,63,.1)",
              border: `1px solid ${status.ok ? "rgba(86,168,119,.4)" : "rgba(192,40,63,.4)"}`,
            }}>{status.msg}</div>
          )}
          <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
            รหัสจะถูกเก็บใน Apps Script Properties (server-side) ไม่หลุดมาที่ client
          </div>
        </form>
      )}
    </div>
  );
}

function TeacherPanel() {
  const state = useStore();
  const [confirmReset, setConfirmReset] = React.useState(false);
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "8px 24px 64px" }}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontFamily: "var(--serif)", fontWeight: 700, fontSize: 26 }}>
          <span className="gold-text">แผงควบคุมของคุณครู</span>
        </h2>
        <p style={{ margin: "6px 0 0", color: "var(--ink-dim)", fontSize: 14 }}>
          มอบหรือหักแต้มให้แต่ละบ้าน — ทุกการเปลี่ยนแปลงจะปรากฏบนกระดานคะแนนทันที
        </p>
      </div>

      <div style={{
        display: "grid", gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        marginBottom: 26,
      }}>
        {state.houses.map((h) => <HouseAwardCard key={h.id} house={h} />)}
      </div>

      <HistoryLog />

      <div style={{ marginTop: 28, textAlign: "center" }}>
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            style={{
              border: "1px solid var(--line)", background: "transparent",
              color: "var(--ink-faint)", borderRadius: 9, padding: "9px 18px", fontSize: 13,
            }}
          >รีเซ็ตคะแนนและประวัติทั้งหมด</button>
        ) : (
          <div style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
            <span style={{ color: "#e8889a", fontSize: 13 }}>ยืนยันการล้างข้อมูลทั้งหมด?</span>
            <button onClick={async () => {
              try { await window.Kru4Store.resetAll(); } catch (_) {}
              setConfirmReset(false);
            }}
              style={{ ...miniBtn("rgba(192,40,63,.3)", "rgba(192,40,63,.6)") }}>ยืนยัน</button>
            <button onClick={() => setConfirmReset(false)}
              style={{ ...miniBtn("rgba(255,255,255,.05)", "var(--line)") }}>ยกเลิก</button>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminPanel() {
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "8px 24px 64px" }}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontFamily: "var(--serif)", fontWeight: 700, fontSize: 26 }}>
          <span className="gold-text">การจัดการระบบ</span>
        </h2>
        <p style={{ margin: "6px 0 0", color: "var(--ink-dim)", fontSize: 14 }}>
          Sync รายชื่อ · เปลี่ยนรหัสผ่าน · จัดกลุ่มบ้านของนักเรียน
        </p>
      </div>

      <RosterSyncCard />
      <PasswordChangeCard />
      <StudentRosterTable />
    </div>
  );
}

window.TeacherPanel = TeacherPanel;
window.AdminPanel = AdminPanel;
window.kru4TimeAgo = timeAgo;
