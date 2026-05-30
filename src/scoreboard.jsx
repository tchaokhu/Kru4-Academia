// ============================================================
//  Scoreboard — live ranking, count-up, rank-change FLIP
// ============================================================

function useCountUp(value, duration = 900, fromZero = false) {
  const [display, setDisplay] = React.useState(fromZero ? 0 : value);
  const fromRef = React.useRef(fromZero ? 0 : value);
  const rafRef = React.useRef(null);
  React.useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = Math.round(from + (to - from) * eased);
      setDisplay(cur);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);
  return display;
}

function useFlip(order) {
  const refs = React.useRef({});
  const prev = React.useRef({});
  const anims = React.useRef({});
  React.useLayoutEffect(() => {
    Object.keys(refs.current).forEach((id) => {
      const el = refs.current[id];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const p = prev.current[id];
      if (p) {
        const dx = p.left - rect.left;
        const dy = p.top - rect.top;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          // cancel previous animation if any
          if (anims.current[id]) { try { anims.current[id].cancel(); } catch (_) {} }
          const distance = Math.hypot(dx, dy);
          const duration = Math.min(1400, Math.max(700, 400 + distance * 1.4));
          // mid-flight scale bump for visual flourish
          const a = el.animate(
            [
              { transform: `translate(${dx}px, ${dy}px) scale(1)`, zIndex: 3, filter: "brightness(1)" },
              { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 6}px) scale(1.06)`, zIndex: 3, filter: "brightness(1.18)", offset: 0.55 },
              { transform: "translate(0,0) scale(1)", zIndex: 3, filter: "brightness(1)" },
            ],
            { duration, easing: "cubic-bezier(.22,.9,.25,1)", fill: "both" }
          );
          anims.current[id] = a;
          a.onfinish = () => { try { a.cancel(); } catch (_) {} delete anims.current[id]; };
        }
      }
      prev.current[id] = { left: rect.left, top: rect.top };
    });
  }, [order]);
  return refs;
}

const RANK_LABEL = ["", "ที่หนึ่ง", "ที่สอง", "ที่สาม", "ที่สี่"];

function Crown() {
  return (
    <svg viewBox="0 0 64 40" width="46" height="29" aria-hidden="true">
      <defs>
        <linearGradient id="cr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6dd9b" />
          <stop offset="1" stopColor="#a9853a" />
        </linearGradient>
      </defs>
      <path d="M6 34 L8 12 L20 24 L32 6 L44 24 L56 12 L58 34 Z" fill="url(#cr)" stroke="#7a5e26" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="8" cy="10" r="3.4" fill="#f6dd9b" />
      <circle cx="32" cy="4" r="3.8" fill="#f6dd9b" />
      <circle cx="56" cy="10" r="3.4" fill="#f6dd9b" />
      <rect x="6" y="33" width="52" height="4" rx="1.5" fill="#a9853a" />
    </svg>
  );
}

function HousePillar({ house, rank, total, leader, refCb, narrow }) {
  const score = useCountUp(house.score, 1300, true);
  const c = house.colors;
  const isLeader = rank === 1;
  const prevRank = React.useRef(rank);
  const [flash, setFlash] = React.useState(false);
  React.useEffect(() => {
    if (prevRank.current !== rank) {
      if (rank < prevRank.current) {
        setFlash(true);
        const t = setTimeout(() => setFlash(false), 1100);
        prevRank.current = rank;
        return () => clearTimeout(t);
      }
      prevRank.current = rank;
    }
  }, [rank]);

  const pct = total > 0 ? Math.round((house.score / total) * 100) : 0;
  const scoreSize = narrow ? (isLeader ? 40 : 34) : (isLeader ? 52 : 44);
  const RANK_SCALE = { 1: 1, 2: 0.9, 3: 0.82, 4: 0.75 };
  const scale = RANK_SCALE[rank] || 0.7;

  return (
    <div
      ref={refCb}
      style={{
        width: "auto",
        flex: narrow ? "0 0 auto" : `${scale} ${scale} 0`,
        maxWidth: narrow ? "none" : Math.round(252 * scale),
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        animation: flash ? "rankFlash 1.1s ease-out" : "none",
        borderRadius: 20,
      }}
    >
      {/* rank ribbon */}
      <div style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
        {isLeader ? (
          <div style={{ animation: "glowPulse 2.6s ease-in-out infinite", filter: "drop-shadow(0 0 10px rgba(246,221,155,.6))" }}>
            <Crown />
          </div>
        ) : (
          <div style={{
            fontFamily: "var(--display)", fontSize: 13, letterSpacing: 3,
            color: "var(--ink-faint)", textTransform: "uppercase",
          }}>อันดับ {rank}</div>
        )}
      </div>

      {/* crest in parchment niche */}
      <div
        style={{
          position: "relative",
          width: "100%",
          borderRadius: "18px 18px 14px 14px",
          padding: isLeader ? 10 : 8,
          background: `linear-gradient(180deg, ${c.main}, ${shade(c.main, -22)})`,
          border: `1px solid ${hexA(c.glow, 0.55)}`,
          boxShadow: isLeader
            ? `0 0 0 1px ${hexA(c.accent, 0.5)}, 0 0 55px -4px ${hexA(c.glow, 0.85)}, var(--shadow-lg)`
            : `0 0 28px -8px ${hexA(c.glow, 0.6)}, var(--shadow-lg)`,
          transform: "none",
          transition: "transform .4s, box-shadow .4s",
        }}
      >
        <div
          style={{
            position: "relative",
            borderRadius: "12px 12px 9px 9px",
            overflow: "hidden",
            aspectRatio: "0.4",
            background:
              "radial-gradient(120% 90% at 50% 18%, #fbf3df 0%, #f1e6cc 55%, #e6d6b0 100%)",
            boxShadow: `inset 0 0 0 2px ${hexA(c.accent, 0.7)}, inset 0 2px 12px rgba(0,0,0,.15)`,
          }}
        >
          <img
            src={house.crest}
            alt={house.name}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "contain",
              mixBlendMode: "multiply",
            }}
          />
          {/* gilded vignette */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            boxShadow: `inset 0 0 40px ${hexA(c.main, 0.18)}`,
          }} />
        </div>
      </div>

      {/* name + score plate */}
      <div style={{ textAlign: "center", marginTop: 16, width: "100%" }}>
        <div style={{
          fontFamily: "var(--display)", fontWeight: 700,
          fontSize: narrow ? 16 : 19, letterSpacing: 3,
          color: hexA(c.ink, 0.95), textTransform: "uppercase",
          textShadow: `0 0 18px ${hexA(c.glow, 0.35)}`,
        }}>{house.name}</div>
        <div style={{
          fontFamily: "var(--serif)", fontSize: 13, letterSpacing: 1,
          color: "var(--ink-dim)", marginTop: 3,
        }}>{house.th}</div>

        <div style={{
          margin: "12px auto 0",
          display: "flex", alignItems: "baseline", justifyContent: "center", gap: 7,
        }}>
          <span style={{
            fontFamily: "var(--display)", fontWeight: 800,
            fontSize: scoreSize, lineHeight: 1,
            background: `linear-gradient(180deg, var(--gold-bright), ${c.accent} 55%, var(--gold-deep))`,
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
            filter: `drop-shadow(0 2px 12px ${hexA(c.glow, 0.4)})`,
          }}>{score.toLocaleString("th-TH")}</span>
          <span style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink-faint)" }}>แต้ม</span>
        </div>

        {/* share bar */}
        <div style={{
          marginTop: 12, height: 6, borderRadius: 4, width: "82%", marginInline: "auto",
          background: "rgba(255,255,255,0.06)", overflow: "hidden",
          border: "1px solid var(--line-soft)",
        }}>
          <div style={{
            height: "100%", width: pct + "%",
            background: `linear-gradient(90deg, ${c.glow}, ${c.accent})`,
            borderRadius: 4, transition: "width .9s cubic-bezier(.22,.8,.2,1)",
            boxShadow: `0 0 12px ${hexA(c.glow, 0.7)}`,
          }} />
        </div>
      </div>
    </div>
  );
}

// small color helpers
function hexA(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function shade(hex, pct) {
  const h = hex.replace("#", "");
  let r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (v * pct) / 100)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

function Scoreboard() {
  const state = useStore();
  const w = useWindowWidth();
  const narrow = w < 760;
  const houses = state.houses;
  const sorted = [...houses].sort((a, b) => b.score - a.score);
  // dense ranking: same score = same rank, no skip
  let denseRank = 0;
  const resolvedRanks = sorted.map((h, i) => {
    if (i === 0 || sorted[i - 1].score !== h.score) denseRank++;
    return denseRank;
  });
  const total = houses.reduce((s, h) => s + h.score, 0);
  const order = sorted.map((h) => h.id).join(",");
  const refs = useFlip(order + (narrow ? "n" : "w"));

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: narrow ? "4px 16px 56px" : "8px 24px 64px", position: "relative" }}>
      <div style={{ textAlign: "center", marginBottom: narrow ? 22 : 30, position: "relative", zIndex: 1 }}>
        <div style={{
          fontFamily: "var(--display)", letterSpacing: 6, fontSize: 12,
          color: "var(--gold)", textTransform: "uppercase", marginBottom: 8,
        }}>· ถ้วยรางวัลประจำปี ·</div>
        <h1 style={{
          margin: 0, fontFamily: "var(--serif)", fontWeight: 700,
          fontSize: "clamp(26px, 7vw, 46px)", lineHeight: 1.1,
        }}>
          <span className="gold-text">หอเกียรติยศทั้งสี่</span>
        </h1>
        <p style={{ margin: "10px 0 0", color: "var(--ink-dim)", fontSize: 14 }}>
          คะแนนสะสมรวมทั้งสิ้น <b style={{ color: "var(--gold)" }}>{total.toLocaleString("th-TH")}</b> แต้ม · อัปเดตสด
        </p>
      </div>

      <div style={
        narrow
          ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }
          : { display: "flex", gap: 18, alignItems: "flex-end", justifyContent: "center", flexWrap: "nowrap" }
      }>
        {sorted.map((h, i) => (
          <HousePillar
            key={h.id}
            house={h}
            rank={resolvedRanks[i]}
            total={total}
            narrow={narrow}
            refCb={(el) => (refs.current[h.id] = el)}
          />
        ))}
        {!narrow && <TeacherPortrait narrow={false} />}
      </div>
      {narrow && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
          <TeacherPortrait narrow={true} />
        </div>
      )}
    </div>
  );
}

function TeacherPortrait({ narrow }) {
  const wrapperStyle = narrow
    ? { width: "min(220px, 65vw)" }
    : { flex: "1 1 0", maxWidth: 300, minWidth: 250, alignSelf: "flex-end" };
  return (
    <div style={{
      ...wrapperStyle,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <div style={{
        position: "relative",
        width: "100%",
        aspectRatio: "0.4",
        overflow: "hidden",
      }}>
        <img src="assets/teacher_no_bg.png" alt="คุณครู" style={{
          width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "50% 18%",
          display: "block",
        }} />
      </div>
    </div>
  );
}

window.Scoreboard = Scoreboard;
window.kru4Helpers = { hexA, shade };
