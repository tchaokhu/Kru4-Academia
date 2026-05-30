// ============================================================
//  KRU 4 — Shared store: state, persistence, cross-tab sync
// ============================================================
(function () {
  const STORAGE_KEY = "kru4_state_v8";
  const SESSION_KEY = "kru4_session";

  // Hardcoded Apps Script web app URL (ลงท้าย /exec)
  // teacher override ได้ผ่าน "การจัดการ" → RosterSyncCard
  const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxdAlm4LK_b99N_4bRlupzN2xCzLbmxkw2tm3vgpR5yaOYiAIMlTOMrhcUpLXo3WAQ0/exec";

  const HOUSE_ORDER = ["renovia", "barocca", "impressa", "novara"];

  const DEFAULT_HOUSES = [
    { id: "renovia",  name: "Renovia",  th: "เรโนเวีย",  motto: "RENAISSANCE",             mottoTh: "ยุคฟื้นฟูศิลปวิทยา",     animal: "สิงโต",  crest: "assets/crests/renovia.jpg",  score: 0, colors: { main: "#7d1424", glow: "#c0283f", accent: "#e0bf6e", ink: "#f3d9a0" } },
    { id: "barocca",  name: "Barocca",  th: "บารอกกา",   motto: "BAROQUE & ROMANTICISM",   mottoTh: "บาโรกและจินตนิยม",      animal: "อีกา",   crest: "assets/crests/barocca.jpg",  score: 0, colors: { main: "#3d1f63", glow: "#7d44c4", accent: "#e0bf6e", ink: "#d9c2f2" } },
    { id: "impressa", name: "Impressa", th: "อิมเพรสซา", motto: "IMPRESSIONISM",            mottoTh: "อิมเพรสชันนิสม์",       animal: "กวาง",   crest: "assets/crests/impressa.jpg", score: 0, colors: { main: "#2f5d43", glow: "#56a877", accent: "#bfe0c8", ink: "#cde9d6" } },
    { id: "novara",   name: "Novara",   th: "โนวารา",    motto: "MODERNISM & CONTEMPORARY ART", mottoTh: "โมเดิร์นและร่วมสมัย", animal: "นกฮูก",  crest: "assets/crests/novara.jpg",   score: 0, colors: { main: "#1f3a66", glow: "#4a7fcf", accent: "#cdd9ee", ink: "#dde7f6" } },
  ];

  function freshState() {
    return {
      houses: DEFAULT_HOUSES.map((h) => ({ ...h, colors: { ...h.colors } })),
      history: [],
      canva: [],
      students: {},        // teacher cache: { [studentId]: { studentId, name, className, seq, houseId } }
      appsScriptUrl: DEFAULT_APPS_SCRIPT_URL,
      lastSync: 0,
      meta: { rev: 0 },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return freshState();
      const parsed = JSON.parse(raw);
      const base = freshState();
      base.houses = base.houses.map((def) => {
        const saved = (parsed.houses || []).find((s) => s.id === def.id);
        return saved ? { ...def, score: saved.score } : def;
      });
      base.history = parsed.history || base.history;
      base.canva = parsed.canva || base.canva;
      base.students = parsed.students || {};
      base.appsScriptUrl = parsed.appsScriptUrl || DEFAULT_APPS_SCRIPT_URL;
      base.lastSync = parsed.lastSync || 0;
      base.meta = parsed.meta || base.meta;
      return base;
    } catch (e) {
      return freshState();
    }
  }

  let state = load();
  const subs = new Set();

  let channel = null;
  try {
    channel = new BroadcastChannel("kru4_sync");
    channel.onmessage = (ev) => {
      if (ev.data && ev.data.type === "state") {
        state = ev.data.state;
        emit(false);
      }
    };
  } catch (e) {}

  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        const base = freshState();
        base.houses = base.houses.map((def) => {
          const saved = (parsed.houses || []).find((s) => s.id === def.id);
          return saved ? { ...def, score: saved.score } : def;
        });
        base.history = parsed.history || base.history;
        base.canva = parsed.canva || base.canva;
        base.students = parsed.students || {};
        base.appsScriptUrl = parsed.appsScriptUrl || DEFAULT_APPS_SCRIPT_URL;
        base.lastSync = parsed.lastSync || 0;
        base.meta = parsed.meta || base.meta;
        state = base;
        emit(false);
      } catch (err) {}
    }
  });

  function persist(broadcast) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    if (broadcast && channel) {
      try { channel.postMessage({ type: "state", state }); } catch (e) {}
    }
  }
  function emit(save) {
    if (save) {
      state = { ...state, meta: { ...state.meta, rev: (state.meta.rev || 0) + 1 } };
      persist(true);
    }
    subs.forEach((fn) => fn(state));
  }

  // ---- session (per-tab) ----
  function loadSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  let session = loadSession();
  const sessionSubs = new Set();
  function setSession(s) {
    session = s;
    try {
      if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    sessionSubs.forEach((fn) => fn(session));
  }

  function normalizeId(v) { return String(v == null ? "" : v).trim(); }

  // ---- API helper ----
  async function apiPost(payload) {
    const url = state.appsScriptUrl;
    if (!url) throw new Error("ยังไม่ได้ตั้ง Apps Script URL");
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        redirect: "follow",
      });
    } catch (e) {
      throw new Error("เชื่อมต่อ Apps Script ไม่ได้");
    }
    if (!res.ok) throw new Error("HTTP " + res.status);
    let data;
    try { data = await res.json(); } catch (_) { throw new Error("รูปแบบ response ไม่ถูกต้อง"); }
    return data;
  }

  function errMsg(err) {
    if (err === "rate-limited") return "ลองพยายามมากเกินไป — รอ 15 นาที";
    if (err === "invalid")      return "ข้อมูลไม่ถูกต้อง";
    if (err === "not-found")    return "ไม่พบรหัสในระบบ";
    if (err === "missing")      return "กรอกข้อมูลให้ครบ";
    if (err === "unauthorized") return "session หมดอายุ — กรุณา login ใหม่";
    if (err === "wrong-current") return "รหัสผ่านเดิมไม่ถูกต้อง";
    if (err === "too-short")    return "รหัสใหม่สั้นเกินไป (ขั้นต่ำ 4 ตัว)";
    if (err === "too-long")     return "รหัสใหม่ยาวเกิน 64 ตัว";
    if (err === "bad-house")    return "บ้านไม่ถูกต้อง";
    return err || "เกิดข้อผิดพลาด";
  }

  function getToken() { return session && session.token; }
  function requireTeacher() {
    if (!session || session.role !== "teacher" || !session.token) {
      throw new Error("ต้อง login เป็นคุณครูก่อน");
    }
  }

  // ---- actions ----
  const Store = {
    get: () => state,
    getSession: () => session,
    subscribe(fn)  { subs.add(fn); return () => subs.delete(fn); },
    subscribeSession(fn) { sessionSubs.add(fn); return () => sessionSubs.delete(fn); },

    addScore(houseId, delta, reason) {
      state = {
        ...state,
        houses: state.houses.map((h) =>
          h.id === houseId ? { ...h, score: Math.max(0, h.score + delta) } : h
        ),
        history: [
          { id: "e" + Date.now() + Math.random().toString(36).slice(2, 6), houseId, delta, reason: reason || "", ts: Date.now() },
          ...state.history,
        ].slice(0, 200),
      };
      emit(true);
    },
    undoEntry(entryId) {
      const entry = state.history.find((e) => e.id === entryId);
      if (!entry) return;
      state = {
        ...state,
        houses: state.houses.map((h) =>
          h.id === entry.houseId ? { ...h, score: Math.max(0, h.score - entry.delta) } : h
        ),
        history: state.history.filter((e) => e.id !== entryId),
      };
      emit(true);
    },
    addCanva(card) {
      state = { ...state, canva: [{ ...card, id: "c" + Date.now(), ts: Date.now() }, ...state.canva] };
      emit(true);
    },
    removeCanva(id) {
      state = { ...state, canva: state.canva.filter((c) => c.id !== id) };
      emit(true);
    },
    async resetAll() {
      // also wipe server-side house assignments
      try {
        const token = getToken();
        if (token) await apiPost({ action: "resetAssignments", token });
      } catch (_) {}
      const keepUrl = state.appsScriptUrl;
      state = freshState();
      state.appsScriptUrl = keepUrl;
      emit(true);
    },

    // --- url ---
    setAppsScriptUrl(url) {
      state = { ...state, appsScriptUrl: String(url || "").trim() };
      emit(true);
    },

    // --- auth ---
    async loginTeacher(password) {
      const data = await apiPost({ action: "loginTeacher", password: String(password || "") });
      if (data && data.ok && data.token) {
        setSession({ role: "teacher", token: data.token });
        return "teacher";
      }
      throw new Error(errMsg(data && data.error));
    },
    async loginStudent(id, firstName) {
      const data = await apiPost({
        action: "loginStudent",
        id: normalizeId(id),
        firstName: String(firstName || "").trim(),
      });
      if (data && data.ok && data.token && data.student) {
        setSession({
          role: "student",
          studentId: data.student.id,
          token: data.token,
          studentProfile: data.student,
        });
        return "student";
      }
      throw new Error(errMsg(data && data.error));
    },
    async refreshMe() {
      if (!session || session.role !== "student" || !session.token) return null;
      const data = await apiPost({ action: "me", token: session.token });
      if (data && data.ok && data.student) {
        setSession({ ...session, studentProfile: data.student });
        return data.student;
      }
      if (data && data.error === "unauthorized") setSession(null);
      return null;
    },
    logout() {
      // Clear PII cache from local storage (shared-computer safety)
      const keepUrl = state.appsScriptUrl;
      state = freshState();
      state.appsScriptUrl = keepUrl;
      emit(true);
      setSession(null);
    },
    async downloadMyData() {
      if (!session || session.role !== "student" || !session.token) {
        throw new Error("ต้อง login เป็นนักเรียนก่อน");
      }
      const data = await apiPost({ action: "myData", token: session.token });
      if (!(data && data.ok)) throw new Error(errMsg(data && data.error));
      return data;
    },

    // --- roster (teacher only) ---
    async syncRoster() {
      requireTeacher();
      const data = await apiPost({ action: "sync", token: session.token });
      if (!(data && data.ok)) {
        if (data && data.error === "unauthorized") setSession(null);
        throw new Error(errMsg(data && data.error));
      }
      const classes = data.classes || [];
      const students = {};
      classes.forEach((cls) => {
        (cls.students || []).forEach((s) => {
          const sid = normalizeId(s.id);
          if (!sid) return;
          students[sid] = {
            studentId: sid,
            name: s.name || "",
            className: s.className || cls.name || "",
            seq: s.seq != null ? s.seq : "",
            houseId: s.houseId || null,
          };
        });
      });
      state = { ...state, students, lastSync: Date.now() };
      emit(true);
      return { count: Object.keys(students).length, classes: classes.length };
    },
    async setStudentHouse(studentId, houseId) {
      requireTeacher();
      const sid = normalizeId(studentId);
      if (!HOUSE_ORDER.includes(houseId)) throw new Error("บ้านไม่ถูกต้อง");
      const data = await apiPost({ action: "setHouse", token: session.token, id: sid, houseId });
      if (!(data && data.ok)) {
        if (data && data.error === "unauthorized") setSession(null);
        throw new Error(errMsg(data && data.error));
      }
      // local cache update on success
      if (state.students[sid]) {
        state = {
          ...state,
          students: { ...state.students, [sid]: { ...state.students[sid], houseId } },
        };
        emit(true);
      }
    },
    async changeTeacherPassword(oldPw, newPw) {
      const o = String(oldPw || ""), n = String(newPw || "");
      if (n.length < 4) throw new Error("รหัสใหม่ต้องอย่างน้อย 4 ตัว");
      if (n.length > 64) throw new Error("รหัสใหม่ยาวเกิน 64 ตัว");
      if (o === n) throw new Error("รหัสใหม่ต้องไม่เหมือนเดิม");
      const data = await apiPost({ action: "changePassword", oldPassword: o, newPassword: n });
      if (data && data.ok) return true;
      throw new Error(errMsg(data && data.error));
    },
  };

  function useStore() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => Store.subscribe(() => setTick((t) => t + 1)), []);
    return Store.get();
  }
  function useSession() {
    const [s, setS] = React.useState(Store.getSession());
    React.useEffect(() => Store.subscribeSession((next) => setS(next)), []);
    return s;
  }

  window.Kru4Store = Store;
  window.useStore = useStore;
  window.useSession = useSession;

  function useWindowWidth() {
    const [w, setW] = React.useState(typeof window !== "undefined" ? window.innerWidth : 1200);
    React.useEffect(() => {
      const f = () => setW(window.innerWidth);
      window.addEventListener("resize", f);
      return () => window.removeEventListener("resize", f);
    }, []);
    return w;
  }
  window.useWindowWidth = useWindowWidth;
  window.KRU4 = { HOUSE_ORDER };
})();
