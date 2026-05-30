// ============================================================
//  Canva slide library — link cards, teacher add / remove
// ============================================================

function CanvaIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15 9.2c-.6-.9-1.6-1.4-2.7-1.4-2.3 0-3.9 2-3.9 4.4 0 2.2 1.4 3.8 3.4 3.8 1.6 0 2.7-.9 3.2-2.2"
      fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>);

}

function canvaEmbedUrl(url) {
  const m = /canva\.com\/design\/([^\/?#]+)\/([^\/?#]+)/.exec(url || "");
  return m ? `https://www.canva.com/design/${m[1]}/${m[2]}?embed` : null;
}

function CanvaThumb({ card, tagColor, hexA }) {
  if (card.cover) {
    return <img src={card.cover} alt={card.title}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />;
  }
  const embed = canvaEmbedUrl(card.url);
  if (embed) {
    return <iframe src={embed} title={card.title} loading="lazy"
      style={{ width: "100%", height: "100%", border: "none", display: "block" }} />;
  }
  // fallback: a faux "first slide" preview built from the card's own data
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: `linear-gradient(135deg, ${hexA(tagColor, 0.55)}, rgba(12,10,20,.94) 80%)`,
      display: "flex", flexDirection: "column", justifyContent: "center", gap: 8, padding: "0 18px"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ width: 20, height: 2, background: tagColor, borderRadius: 2 }} />
        <span style={{ fontFamily: "var(--display)", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: hexA(tagColor, 0.95) }}>{card.tag}</span>
      </div>
      <div style={{
        fontFamily: "var(--serif)", fontWeight: 700, fontSize: 18, lineHeight: 1.22, color: "#f3ecda",
        textShadow: "0 2px 12px rgba(0,0,0,.55)",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"
      }}>{card.title}</div>
      <span style={{
        position: "absolute", bottom: 8, right: 10, fontFamily: "var(--display)",
        fontSize: 8.5, letterSpacing: 2, color: hexA(tagColor, 0.8), textTransform: "uppercase"
      }}>Canva · พรีวิว</span>
    </div>);

}

function CanvaCard({ card, isTeacher, houseTags }) {
  const { hexA } = window.kru4Helpers;
  const tagColor = houseTags[card.tag] || "#e0bf6e";
  const [hover, setHover] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        borderRadius: 16,
        overflow: "hidden",
        background: "var(--panel)",
        backdropFilter: "blur(6px)",
        border: "1px solid var(--line)",
        boxShadow: hover ? "0 18px 50px -22px rgba(0,0,0,.8), 0 0 24px -10px rgba(224,191,110,.5)" : "var(--shadow-lg)",
        transform: hover ? "translateY(-4px)" : "none",
        transition: "all .25s cubic-bezier(.2,.8,.2,1)",
        display: "flex", flexDirection: "column"
      }}>
      
      {/* thumbnail / preview */}
      <div style={{
        height: 132, position: "relative", overflow: "hidden",
        background: `radial-gradient(120% 120% at 30% 0%, ${hexA(tagColor, 0.35)}, rgba(12,10,20,.6) 70%)`,
        borderBottom: "1px solid var(--line-soft)",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <CanvaThumb card={card} tagColor={tagColor} hexA={hexA} />

        {isTeacher && (
        confirm ?
        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6, zIndex: 2 }}>
              <button onClick={() => window.Kru4Store.removeCanva(card.id)}
          style={{ background: "rgba(192,40,63,.85)", color: "#fff", border: "none", borderRadius: 7, padding: "5px 9px", fontSize: 12 }}>ลบ</button>
              <button onClick={() => setConfirm(false)}
          style={{ background: "rgba(0,0,0,.5)", color: "#fff", border: "1px solid var(--line)", borderRadius: 7, padding: "5px 9px", fontSize: 12 }}>×</button>
            </div> :

        <button onClick={() => setConfirm(true)} title="ลบการ์ดนี้"
        style={{
          position: "absolute", top: 8, right: 8, zIndex: 2,
          width: 28, height: 28, borderRadius: 8, border: "1px solid var(--line)",
          background: "rgba(12,10,20,.6)", color: "var(--ink-dim)", fontSize: 15
        }}>🗑</button>)

        }
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <div style={{
          alignSelf: "flex-start", fontSize: 11, fontFamily: "var(--display)", letterSpacing: 1.5,
          textTransform: "uppercase", color: tagColor, whiteSpace: "nowrap",
          border: `1px solid ${hexA(tagColor, 0.5)}`, borderRadius: 20, padding: "2px 10px"
        }}>{card.tag}</div>
        <div style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: 17, lineHeight: 1.3 }}>{card.title}</div>
        <div style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.5, flex: 1 }}>{card.desc}</div>
        <a href={card.url} target="_blank" rel="noopener noreferrer"
        style={{
          marginTop: 6, display: "inline-flex", alignItems: "center", gap: 8,
          justifyContent: "center", textDecoration: "none",
          padding: "10px 14px", borderRadius: 10,
          border: "1px solid var(--line)", color: "var(--gold-bright)",
          background: "linear-gradient(180deg, rgba(224,191,110,.14), rgba(224,191,110,.05))",
          fontWeight: 600, fontSize: 14
        }}>
          <CanvaIcon /> เปิดสไลด์ Canva
        </a>
      </div>
    </div>);

}

function AddCanvaForm({ houseTags, tagLabels }) {
  const [open, setOpen] = React.useState(false);
  const [f, setF] = React.useState({ title: "", desc: "", url: "", cover: "", tag: "ส่วนกลาง" });
  const tags = Object.keys(houseTags);

  function submit() {
    if (!f.title.trim() || !f.url.trim()) return;
    let url = f.url.trim();
    if (!/^https?:\/\//.test(url)) url = "https://" + url;
    window.Kru4Store.addCanva({ ...f, url });
    setF({ title: "", desc: "", url: "", cover: "", tag: "ส่วนกลาง" });
    setOpen(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        borderRadius: 16, border: "1.5px dashed var(--line)", background: "rgba(255,255,255,.02)",
        color: "var(--ink-dim)", minHeight: 320, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 10, fontSize: 15
      }}>
        <span style={{ fontSize: 32, color: "var(--gold)" }}>＋</span>
        เพิ่มสไลด์ Canva ใหม่
      </button>);

  }

  return (
    <div style={{
      borderRadius: 16, border: "1px solid var(--line)", background: "var(--panel)",
      backdropFilter: "blur(6px)", padding: 16, display: "flex", flexDirection: "column", gap: 10
    }}>
      <div style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: 16, marginBottom: 2 }}>เพิ่มสไลด์ใหม่</div>
      <input style={inputStyle} placeholder="ชื่อสไลด์ *" value={f.title}
      onChange={(e) => setF({ ...f, title: e.target.value })} />
      <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} placeholder="คำอธิบายสั้น ๆ" value={f.desc}
      onChange={(e) => setF({ ...f, desc: e.target.value })} />
      <input style={inputStyle} placeholder="ลิงก์ Canva (https://...) *" value={f.url}
      onChange={(e) => setF({ ...f, url: e.target.value })} />
      <input style={inputStyle} placeholder="ลิงก์รูปหน้าปก (ไม่บังคับ)" value={f.cover}
      onChange={(e) => setF({ ...f, cover: e.target.value })} />
      <label style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 2 }}>หมวดหมู่</label>
      <select style={inputStyle} value={f.tag} onChange={(e) => setF({ ...f, tag: e.target.value })}>
        {tags.map((t) => <option key={t} value={t}>{tagLabels[t] || t}</option>)}
      </select>
      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <button onClick={submit} style={{
          flex: 1, padding: "10px", borderRadius: 9, border: "1px solid rgba(224,191,110,.5)",
          background: "linear-gradient(180deg, rgba(224,191,110,.3), rgba(224,191,110,.12))",
          color: "var(--gold-bright)", fontWeight: 700, fontSize: 14
        }}>บันทึก</button>
        <button onClick={() => setOpen(false)} style={{
          padding: "10px 16px", borderRadius: 9, border: "1px solid var(--line)",
          background: "transparent", color: "var(--ink-dim)", fontSize: 14
        }}>ยกเลิก</button>
      </div>
    </div>);

}

function CanvaLibrary({ isTeacher }) {
  const state = useStore();
  const w = useWindowWidth();
  const narrow = w < 760;
  const houseTags = { "ส่วนกลาง": "#e0bf6e" };
  const tagLabels = { "ส่วนกลาง": "ส่วนกลาง · ทุกบ้าน" };
  state.houses.forEach((h) => { houseTags[h.name] = h.colors.glow; tagLabels[h.name] = `${h.name} · ${h.th}`; });

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: narrow ? "4px 16px 56px" : "8px 24px 64px" }}>
      <div style={{ marginBottom: narrow ? 16 : 22 }}>
        <h2 style={{ margin: 0, fontFamily: "var(--serif)", fontWeight: 700, fontSize: "clamp(20px, 5vw, 26px)" }}>
          <span className="gold-text">คลังคาถาแห่งสไลด์</span>
        </h2>
        <p style={{ margin: "6px 0 0", color: "var(--ink-dim)", fontSize: 14 }}>
          รวมสื่อการสอน Canva ทั้งหมด{isTeacher ? " — คุณครูสามารถเพิ่มหรือลบได้" : " · เปิดดูได้ทุกคน"}
        </p>
      </div>

      <div style={{
        display: "grid", gap: narrow ? 12 : 18,
        gridTemplateColumns: narrow ? "1fr" : "repeat(auto-fill, minmax(248px, 1fr))"
      }}>
        {isTeacher && <AddCanvaForm houseTags={houseTags} tagLabels={tagLabels} />}
        {state.canva.map((card) =>
        <CanvaCard key={card.id} card={card} isTeacher={isTeacher} houseTags={houseTags} />
        )}
        {state.canva.length === 0 && !isTeacher &&
        <div style={{ color: "var(--ink-faint)", padding: 30 }}>ยังไม่มีสไลด์</div>
        }
      </div>
    </div>);

}

window.CanvaLibrary = CanvaLibrary;