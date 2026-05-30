// ============================================================
//  Student account page — profile + house allegiance
// ============================================================

function AccountPage() {
  const state = useStore();
  const session = useSession();
  const w = useWindowWidth();
  const narrow = w < 760;
  const { hexA, shade } = window.kru4Helpers;

  // refresh own profile from server on mount (token verified server-side)
  React.useEffect(() => {
    if (session && session.role === "student") {
      window.Kru4Store.refreshMe().catch(() => {});
    }
  }, []);

  if (!session || session.role !== "student") return null;
  const student = session.studentProfile;
  if (!student) {
    return (
      <div style={{ maxWidth: 720, margin: "40px auto", padding: 24, textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--serif)", color: "var(--ink-dim)" }}>ไม่พบข้อมูลนักเรียน</h2>
        <p style={{ color: "var(--ink-faint)", fontSize: 14 }}>
          ข้อมูลของคุณอาจถูกลบจากระบบ กรุณาติดต่อคุณครู
        </p>
        <button onClick={() => window.Kru4Store.logout()} style={logoutBtn}>ออกจากระบบ</button>
      </div>
    );
  }

  const house = state.houses.find((h) => h.id === student.houseId) || state.houses[0];
  const c = house.colors;
  const sorted = [...state.houses].sort((a, b) => b.score - a.score);
  // dense ranking: same score = same rank, no skip
  let denseRank = 0;
  let rank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || sorted[i - 1].score !== sorted[i].score) denseRank++;
    if (sorted[i].id === house.id) { rank = denseRank; break; }
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: narrow ? "4px 16px 56px" : "8px 24px 64px" }}>
      {/* hero crest + house name */}
      <div style={{
        position: "relative",
        borderRadius: 24,
        padding: narrow ? "26px 18px" : "36px 28px",
        marginBottom: 22,
        background: `linear-gradient(180deg, ${c.main}, ${shade(c.main, -30)})`,
        border: `1px solid ${hexA(c.glow, 0.55)}`,
        boxShadow: `0 0 60px -10px ${hexA(c.glow, 0.6)}, var(--shadow-lg)`,
        overflow: "hidden",
      }}>
        <div style={{
          display: "flex",
          gap: narrow ? 18 : 28,
          alignItems: "center",
          flexDirection: narrow ? "column" : "row",
          textAlign: narrow ? "center" : "left",
        }}>
          <div style={{
            width: narrow ? 140 : 180,
            height: narrow ? 168 : 216,
            borderRadius: 14,
            overflow: "hidden",
            flexShrink: 0,
            background: "radial-gradient(120% 90% at 50% 18%, #fbf3df 0%, #f1e6cc 55%, #e6d6b0 100%)",
            boxShadow: `inset 0 0 0 2px ${hexA(c.accent, 0.7)}, 0 12px 28px rgba(0,0,0,.4)`,
          }}>
            <img src={house.crest} alt={house.name} style={{
              width: "100%", height: "100%", objectFit: "contain", mixBlendMode: "multiply",
            }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "var(--display)", letterSpacing: 5, fontSize: 11,
              color: hexA(c.accent, 0.9), textTransform: "uppercase", marginBottom: 6,
            }}>· บ้านของฉัน ·</div>
            <h1 style={{
              margin: 0,
              fontFamily: "var(--serif)", fontWeight: 700,
              fontSize: narrow ? 32 : 44, lineHeight: 1.1,
              color: hexA(c.ink, 0.98),
              textShadow: `0 0 24px ${hexA(c.glow, 0.5)}`,
            }}>{house.name}</h1>
            <div style={{
              fontFamily: "var(--serif)", fontSize: narrow ? 16 : 20,
              color: hexA(c.accent, 0.9), marginTop: 4,
            }}>{house.th} · {house.animal}</div>
            <div style={{
              marginTop: 14, display: "inline-flex", gap: 18, flexWrap: "wrap",
              justifyContent: narrow ? "center" : "flex-start",
            }}>
              <div>
                <div style={statLabel}>คะแนนบ้าน</div>
                <div style={{ ...statValue, color: hexA(c.ink, 0.98) }}>{house.score.toLocaleString("th-TH")}</div>
              </div>
              <div style={{ width: 1, background: hexA(c.accent, 0.3) }} />
              <div>
                <div style={statLabel}>อันดับ</div>
                <div style={{ ...statValue, color: hexA(c.ink, 0.98) }}>{rank}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* info card */}
      <div style={{
        borderRadius: 18,
        padding: narrow ? "20px 18px" : "24px 28px",
        background: "var(--panel)",
        backdropFilter: "blur(6px)",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-lg)",
        marginBottom: 18,
      }}>
        <div style={{
          fontFamily: "var(--display)", letterSpacing: 4, fontSize: 11,
          color: "var(--gold)", textTransform: "uppercase", marginBottom: 14,
        }}>· ข้อมูลนักเรียน ·</div>
        <div style={{
          display: "grid",
          gridTemplateColumns: narrow ? "1fr" : "1fr 1fr",
          gap: narrow ? 14 : 20,
        }}>
          <InfoRow label="ชื่อ-สกุล" value={student.name} />
          <InfoRow label="ชั้น" value={student.className} />
          <InfoRow label="เลขที่" value={student.seq} />
          <InfoRow label="รหัสประจำตัว" value={student.id} />
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 18, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={async () => {
          try {
            const data = await window.Kru4Store.downloadMyData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `my-data-${data.student.id}-${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          } catch (ex) {
            alert("ดาวน์โหลดไม่สำเร็จ: " + (ex.message || ex));
          }
        }} style={downloadBtn}>ดาวน์โหลดข้อมูลของฉัน (PDPA)</button>
        <button onClick={() => window.Kru4Store.logout()} style={logoutBtn}>
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--display)", fontSize: 10, letterSpacing: 2, color: "var(--ink-faint)", textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink)", fontWeight: 600 }}>
        {value || "—"}
      </div>
    </div>
  );
}

const statLabel = {
  fontFamily: "var(--display)", fontSize: 10, letterSpacing: 2,
  color: "var(--ink-dim)", textTransform: "uppercase", marginBottom: 2,
};
const statValue = {
  fontFamily: "var(--display)", fontWeight: 800, fontSize: 26, lineHeight: 1,
};
const logoutBtn = {
  padding: "10px 22px", borderRadius: 22, fontSize: 14, fontWeight: 600,
  border: "1px solid var(--line)", background: "rgba(192,40,63,.18)",
  color: "#e8889a",
};
const downloadBtn = {
  padding: "10px 22px", borderRadius: 22, fontSize: 14, fontWeight: 600,
  border: "1px solid rgba(224,191,110,.4)",
  background: "rgba(224,191,110,.12)", color: "var(--gold-bright)",
};

window.AccountPage = AccountPage;
