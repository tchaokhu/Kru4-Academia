/**
 * KRU 4 Academia — Roster + Auth proxy (hardened)
 *
 * Endpoints (POST only):
 *   {action:"loginTeacher", password}              → {ok, token}
 *   {action:"loginStudent", id, firstName}         → {ok, token, student}
 *   {action:"changePassword", oldPassword, newPassword} → {ok}
 *   {action:"sync",       token}                   → {ok, classes}
 *   {action:"me",         token}                   → {ok, student}
 *   {action:"setHouse",   token, id, houseId}      → {ok}
 *   {action:"resetAssignments", token}             → {ok}
 *   {action:"myData",     token}                   → {ok, student, exportedAt} (DSAR)
 *
 * Storage:
 *   Script Properties: TEACHER_PASSWORD, TOKEN_SECRET
 *   Sheet "_houses":   col A = studentId, col B = houseId  (auto-created, hidden)
 *   Sheet "_audit":    [ts, action, who, status, note]      (auto-created, hidden)
 */

const TAB_PREFIX = "ม.6";
const COL_SEQ = 0;
const COL_ID = 1;
const COL_NAME_PREFIX = 2;
const COL_NAME_FIRST = 3;
const COL_NAME_LAST = 4;

const HOUSE_IDS = ["renovia", "barocca", "impressa", "novara"];
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SEC = 15 * 60;
const LOCK_TIMEOUT_MS = 10000;
const ASSIGNMENTS_SHEET = "_houses";
const AUDIT_SHEET = "_audit";
const CANVA_SHEET = "_canva";
const CANVA_MAX = 200;

// ---------- properties / secret ----------
function getTeacherPassword() {
  return PropertiesService.getScriptProperties().getProperty("TEACHER_PASSWORD") || "alohomora";
}
function getSecret() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty("TOKEN_SECRET");
  if (!s) {
    s = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
    props.setProperty("TOKEN_SECRET", s);
  }
  return s;
}

// ---------- lock ----------
function withLock(fn) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    lock.waitLock(LOCK_TIMEOUT_MS);
    locked = true;
    return fn();
  } finally {
    if (locked) { try { lock.releaseLock(); } catch (_) {} }
  }
}

// ---------- sheets ----------
function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    try { sh.hideSheet(); } catch (_) {}
  }
  return sh;
}

function loadAssignments() {
  const sh = getOrCreateSheet(ASSIGNMENTS_SHEET);
  const last = sh.getLastRow();
  if (last < 1) return {};
  const rows = sh.getRange(1, 1, last, 2).getValues();
  const out = {};
  rows.forEach((r) => {
    const id = String(r[0] == null ? "" : r[0]).trim();
    const h = String(r[1] == null ? "" : r[1]).trim();
    if (id && HOUSE_IDS.indexOf(h) >= 0) out[id] = h;
  });
  return out;
}
function saveAssignments(map) {
  const sh = getOrCreateSheet(ASSIGNMENTS_SHEET);
  sh.clearContents();
  const entries = Object.keys(map).map((k) => [k, map[k]]);
  if (entries.length === 0) return;
  sh.getRange(1, 1, entries.length, 2).setValues(entries);
}

// ---------- canva slides ----------
function loadCanva() {
  const sh = getOrCreateSheet(CANVA_SHEET);
  const last = sh.getLastRow();
  if (last < 1) return [];
  const rows = sh.getRange(1, 1, last, 2).getValues();
  const out = [];
  rows.forEach((r) => {
    const id = String(r[0] == null ? "" : r[0]).trim();
    if (!id) return;
    try {
      const card = JSON.parse(r[1]);
      if (card && card.id) out.push(card);
    } catch (_) {}
  });
  out.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  return out;
}
function saveCanvaRows(cards) {
  const sh = getOrCreateSheet(CANVA_SHEET);
  sh.clearContents();
  if (!cards.length) return;
  const entries = cards.map((c) => [c.id, JSON.stringify(c)]);
  sh.getRange(1, 1, entries.length, 2).setValues(entries);
}
function sanitizeCard(src) {
  function s(v, max) { return String(v == null ? "" : v).trim().slice(0, max); }
  return {
    title: s(src.title, 200),
    desc:  s(src.desc, 1000),
    url:   s(src.url, 1000),
    cover: s(src.cover, 1000),
    tag:   s(src.tag, 100),
  };
}

// ---------- audit ----------
function audit(action, who, ok, note) {
  try {
    const sh = getOrCreateSheet(AUDIT_SHEET);
    if (sh.getLastRow() === 0) {
      sh.appendRow(["timestamp", "action", "who", "status", "note"]);
    }
    sh.appendRow([new Date(), action, who || "", ok ? "ok" : "fail", String(note || "").slice(0, 200)]);
  } catch (_) {}
}

// ---------- token (HMAC-SHA256) ----------
function ctEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function b64url(bytes) {
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, "");
}
function b64urlDecode(s) {
  return Utilities.newBlob(Utilities.base64DecodeWebSafe(s)).getDataAsString();
}
function makeToken(payload) {
  const body = b64url(Utilities.newBlob(JSON.stringify(payload)).getBytes());
  const sig = b64url(Utilities.computeHmacSha256Signature(body, getSecret()));
  return body + "." + sig;
}
function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const body = parts[0], sig = parts[1];
  const expected = b64url(Utilities.computeHmacSha256Signature(body, getSecret()));
  if (!ctEqual(sig, expected)) return null;
  let payload;
  try { payload = JSON.parse(b64urlDecode(body)); } catch (_) { return null; }
  if (!payload || !payload.exp || payload.exp < Date.now()) return null;
  return payload;
}

// ---------- rate limit ----------
function rlKey(k) { return "rl:" + k; }
function rateLimitCheck(k) {
  const cur = parseInt(CacheService.getScriptCache().get(rlKey(k)) || "0", 10);
  return cur < RATE_LIMIT_MAX;
}
function rateLimitBump(k) {
  const cache = CacheService.getScriptCache();
  const cur = parseInt(cache.get(rlKey(k)) || "0", 10);
  cache.put(rlKey(k), String(cur + 1), RATE_LIMIT_WINDOW_SEC);
}
function rateLimitClear(k) {
  CacheService.getScriptCache().remove(rlKey(k));
}

// ---------- helpers ----------
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function normalizeName(s) {
  return String(s == null ? "" : s).trim().replace(/\s+/g, "").toLowerCase();
}
function leastPopulatedHouse(assignments) {
  const counts = {};
  HOUSE_IDS.forEach((h) => counts[h] = 0);
  Object.keys(assignments).forEach((k) => {
    const h = assignments[k];
    if (counts[h] != null) counts[h]++;
  });
  let best = HOUSE_IDS[0], bestN = Infinity;
  for (let i = 0; i < HOUSE_IDS.length; i++) {
    const h = HOUSE_IDS[i];
    if (counts[h] < bestN) { bestN = counts[h]; best = h; }
  }
  return best;
}

// ---------- sheet parsing ----------
function getRoster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets().filter((s) => {
    const n = s.getName();
    return n.indexOf(TAB_PREFIX) === 0 && n !== ASSIGNMENTS_SHEET && n !== AUDIT_SHEET;
  });
  const result = [];
  sheets.forEach((sh) => {
    const lastRow = sh.getLastRow();
    if (lastRow < 1) return;
    const lastCol = Math.max(sh.getLastColumn(), COL_NAME_LAST + 1);
    const rows = sh.getRange(1, 1, lastRow, lastCol).getValues();
    let current = null;
    let mode = "scan";
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const joined = row.map((v) => String(v == null ? "" : v).trim()).join(" ");
      const cls = extractClassName(joined);
      if (cls) {
        if (current) result.push(current);
        current = { name: cls, students: [] };
        mode = "await-header";
        continue;
      }
      if (!current) continue;
      if (mode === "await-header") {
        const cells = row.map((v) => String(v == null ? "" : v).trim());
        if (cells.indexOf("เลขที่") >= 0 && cells.some((c) => c.indexOf("เลขประจำตัว") >= 0)) {
          mode = "data";
        }
        continue;
      }
      const seq = String(row[COL_SEQ] || "").trim();
      const id = String(row[COL_ID] || "").trim();
      if (!id) continue;
      const prefix = String(row[COL_NAME_PREFIX] || "").trim();
      const first = String(row[COL_NAME_FIRST] || "").trim();
      const last = String(row[COL_NAME_LAST] || "").trim();
      const name = [prefix, first, last].filter(Boolean).join(" ");
      current.students.push({ seq, id, name, firstName: first, lastName: last, prefix });
    }
    if (current) result.push(current);
  });
  return result;
}
function extractClassName(text) {
  const m = /ปีที่\s*(\d+)\s*\/\s*(\d+)/.exec(text)
    || /ม\.\s*(\d+)\s*\/\s*(\d+)/.exec(text);
  if (m) return "ม." + m[1] + "/" + m[2];
  return null;
}
function findStudent(id) {
  const target = String(id || "").trim();
  if (!target) return null;
  const roster = getRoster();
  for (let i = 0; i < roster.length; i++) {
    const cls = roster[i];
    for (let j = 0; j < cls.students.length; j++) {
      const s = cls.students[j];
      if (String(s.id) === target) return Object.assign({}, s, { className: cls.name });
    }
  }
  return null;
}
function redactedStudent(s, houseId) {
  return {
    id: s.id,
    seq: s.seq,
    name: s.name,
    className: s.className,
    houseId: houseId || null,
  };
}

// ---------- routes ----------
function doGet(e) {
  return json({ ok: true, hint: "POST only" });
}
function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || "{}"); }
  catch (_) { return json({ ok: false, error: "invalid-json" }); }
  const action = String(body.action || "");
  try {
    if (action === "loginTeacher")      return loginTeacher(body);
    if (action === "loginStudent")      return loginStudent(body);
    if (action === "changePassword")    return changePassword(body);
    if (action === "sync")              return syncAction(body);
    if (action === "me")                return meAction(body);
    if (action === "myData")            return myDataAction(body);
    if (action === "setHouse")          return setHouseAction(body);
    if (action === "resetAssignments")  return resetAssignmentsAction(body);
    if (action === "listCanva")         return listCanvaAction(body);
    if (action === "addCanva")          return addCanvaAction(body);
    if (action === "removeCanva")       return removeCanvaAction(body);
    return json({ ok: false, error: "unknown-action" });
  } catch (err) {
    audit(action, "", false, "server-error: " + (err && err.message ? err.message : err));
    return json({ ok: false, error: "server-error" });
  }
}

// ---------- auth actions ----------
function loginTeacher(body) {
  const pw = String(body.password || "");
  const k = "teacher";
  if (!rateLimitCheck(k)) { audit("loginTeacher", "teacher", false, "rate-limited"); return json({ ok: false, error: "rate-limited" }); }
  if (!pw || !ctEqual(pw, getTeacherPassword())) {
    rateLimitBump(k);
    audit("loginTeacher", "teacher", false, "bad-credential");
    return json({ ok: false, error: "invalid" });
  }
  rateLimitClear(k);
  const token = makeToken({ role: "teacher", exp: Date.now() + TOKEN_TTL_MS });
  audit("loginTeacher", "teacher", true, "");
  return json({ ok: true, token });
}

function loginStudent(body) {
  const id = String(body.id || "").trim();
  const firstName = String(body.firstName || "").trim();
  if (!id || !firstName) return json({ ok: false, error: "invalid" });
  const k = "st:" + id;
  if (!rateLimitCheck(k)) { audit("loginStudent", id, false, "rate-limited"); return json({ ok: false, error: "rate-limited" }); }
  const student = findStudent(id);
  // Unified failure: do not reveal which of id/firstName was wrong
  if (!student || normalizeName(firstName) !== normalizeName(student.firstName)) {
    rateLimitBump(k);
    audit("loginStudent", id, false, "bad-credential");
    return json({ ok: false, error: "invalid" });
  }
  rateLimitClear(k);
  let houseId;
  withLock(function () {
    const assignments = loadAssignments();
    if (!assignments[id]) {
      assignments[id] = leastPopulatedHouse(assignments);
      saveAssignments(assignments);
    }
    houseId = assignments[id];
  });
  const token = makeToken({ role: "student", id, exp: Date.now() + TOKEN_TTL_MS });
  audit("loginStudent", id, true, "");
  return json({ ok: true, token, student: redactedStudent(student, houseId) });
}

function changePassword(body) {
  const oldPw = String(body.oldPassword || "");
  const newPw = String(body.newPassword || "");
  const k = "teacher-chgpw";
  if (!rateLimitCheck(k)) { audit("changePassword", "teacher", false, "rate-limited"); return json({ ok: false, error: "rate-limited" }); }
  if (!ctEqual(oldPw, getTeacherPassword())) {
    rateLimitBump(k);
    audit("changePassword", "teacher", false, "wrong-current");
    return json({ ok: false, error: "wrong-current" });
  }
  if (newPw.length < 4)  return json({ ok: false, error: "too-short" });
  if (newPw.length > 64) return json({ ok: false, error: "too-long" });
  PropertiesService.getScriptProperties().setProperty("TEACHER_PASSWORD", newPw);
  rateLimitClear(k);
  audit("changePassword", "teacher", true, "");
  return json({ ok: true });
}

// ---------- data actions ----------
function syncAction(body) {
  const payload = verifyToken(body.token);
  if (!payload || payload.role !== "teacher") { audit("sync", "?", false, "unauthorized"); return json({ ok: false, error: "unauthorized" }); }
  let out;
  withLock(function () {
    const roster = getRoster();
    const assignments = loadAssignments();
    const incoming = {};
    roster.forEach(function (c) {
      c.students.forEach(function (s) {
        incoming[s.id] = true;
        if (!assignments[s.id]) assignments[s.id] = leastPopulatedHouse(assignments);
      });
    });
    Object.keys(assignments).forEach(function (id) { if (!incoming[id]) delete assignments[id]; });
    saveAssignments(assignments);
    out = roster.map(function (c) {
      return {
        name: c.name,
        students: c.students.map(function (s) { return redactedStudent(Object.assign({}, s, { className: c.name }), assignments[s.id]); }),
      };
    });
  });
  audit("sync", "teacher", true, "classes=" + out.length);
  return json({ ok: true, classes: out, generatedAt: new Date().toISOString() });
}

function meAction(body) {
  const payload = verifyToken(body.token);
  if (!payload || payload.role !== "student") return json({ ok: false, error: "unauthorized" });
  const s = findStudent(payload.id);
  if (!s) return json({ ok: false, error: "not-found" });
  const assignments = loadAssignments();
  return json({ ok: true, student: redactedStudent(s, assignments[s.id]) });
}

function myDataAction(body) {
  const payload = verifyToken(body.token);
  if (!payload || payload.role !== "student") return json({ ok: false, error: "unauthorized" });
  const s = findStudent(payload.id);
  if (!s) return json({ ok: false, error: "not-found" });
  const assignments = loadAssignments();
  audit("myData", payload.id, true, "DSAR export");
  return json({
    ok: true,
    exportedAt: new Date().toISOString(),
    student: redactedStudent(s, assignments[s.id]),
    note: "ข้อมูลทั้งหมดที่ระบบเก็บเกี่ยวกับคุณ — เก็บไว้เพื่อบริหารคะแนนบ้านในกิจกรรมการเรียน",
  });
}

function setHouseAction(body) {
  const payload = verifyToken(body.token);
  if (!payload || payload.role !== "teacher") return json({ ok: false, error: "unauthorized" });
  const id = String(body.id || "").trim();
  const houseId = String(body.houseId || "").trim();
  if (!id) return json({ ok: false, error: "missing-id" });
  if (HOUSE_IDS.indexOf(houseId) < 0) return json({ ok: false, error: "bad-house" });
  withLock(function () {
    const assignments = loadAssignments();
    assignments[id] = houseId;
    saveAssignments(assignments);
  });
  audit("setHouse", "teacher", true, id + "→" + houseId);
  return json({ ok: true });
}

function resetAssignmentsAction(body) {
  const payload = verifyToken(body.token);
  if (!payload || payload.role !== "teacher") return json({ ok: false, error: "unauthorized" });
  withLock(function () { saveAssignments({}); });
  audit("resetAssignments", "teacher", true, "");
  return json({ ok: true });
}

// ---------- canva actions ----------
function listCanvaAction(body) {
  // any logged-in user (teacher or student) may view slides
  const payload = verifyToken(body.token);
  if (!payload) return json({ ok: false, error: "unauthorized" });
  return json({ ok: true, canva: loadCanva() });
}

function addCanvaAction(body) {
  const payload = verifyToken(body.token);
  if (!payload || payload.role !== "teacher") return json({ ok: false, error: "unauthorized" });
  const card = sanitizeCard(body.card || {});
  if (!card.title || !card.url) return json({ ok: false, error: "missing" });
  card.id = "c" + Date.now() + Math.floor(Math.random() * 1000);
  card.ts = Date.now();
  let all;
  withLock(function () {
    all = loadCanva();
    all.unshift(card);
    if (all.length > CANVA_MAX) all = all.slice(0, CANVA_MAX);
    saveCanvaRows(all);
  });
  audit("addCanva", "teacher", true, card.id);
  return json({ ok: true, card: card, canva: all });
}

function removeCanvaAction(body) {
  const payload = verifyToken(body.token);
  if (!payload || payload.role !== "teacher") return json({ ok: false, error: "unauthorized" });
  const id = String(body.id || "").trim();
  if (!id) return json({ ok: false, error: "missing" });
  let all;
  withLock(function () {
    all = loadCanva().filter(function (c) { return c.id !== id; });
    saveCanvaRows(all);
  });
  audit("removeCanva", "teacher", true, id);
  return json({ ok: true, canva: all });
}

// ---------- dev helpers ----------
function testRun() {
  const r = getRoster();
  Logger.log("classes: " + r.length);
  r.forEach((c) => Logger.log(c.name + " → " + c.students.length + " คน"));
  if (r[0] && r[0].students[0]) Logger.log("ตัวอย่าง: " + JSON.stringify(r[0].students[0]));
  Logger.log("assignments: " + Object.keys(loadAssignments()).length);
}
function dumpSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName("ม.6");
  if (!sh) { Logger.log("ไม่เจอ sheet ม.6"); return; }
  Logger.log("lastRow=" + sh.getLastRow() + " lastCol=" + sh.getLastColumn());
  const rows = sh.getRange(1, 1, Math.min(10, sh.getLastRow()), sh.getLastColumn()).getValues();
  rows.forEach((r, i) => Logger.log("row " + (i + 1) + ": " + JSON.stringify(r)));
}
function resetServerData() {
  const p = PropertiesService.getScriptProperties();
  p.deleteProperty("TOKEN_SECRET");
  withLock(function () { saveAssignments({}); });
  Logger.log("server data reset");
}
