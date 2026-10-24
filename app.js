// Shared module: Firebase setup, auth guard, per-user data store, page shell and helpers.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail, collection, doc, getDocs, updateDoc, serverTimestamp };

/* ---------- small helpers ---------- */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const uid = p => `${p}_${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
export const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
const clean = o => JSON.parse(JSON.stringify(o)); // Firestore rejects undefined values
export const param = k => new URLSearchParams(location.search).get(k);

/* ---------- theme ---------- */
export function setTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem("theme", t);
}
setTheme(localStorage.getItem("theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

/* ---------- icons ---------- */
const ICONS = {
  home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
  assignments: '<path d="M9 4h6v3H9zM7 5H5v16h14V5h-2M9 14l2 2 4-4"/>',
  attendance: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M9 16l2 2 4-4"/>',
  classes: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 010 7M18 14.5c2.2.6 3.5 2.4 3.5 5.5"/>',
  admin: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/>',
  moon: '<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  logout: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>'
};
export const ic = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ""}</svg>`;

/* ---------- auth guard + profile ---------- */
export const ctx = { user: null, profile: null };
export const logoSrc = p => p?.logo || "logo.png";

function blocked(title, text) {
  document.body.innerHTML = `<main class="login"><div class="card login-card"><h1>${esc(title)}</h1><p class="sub">${esc(text)}</p><a class="btn primary" href="login.html">Back to sign in</a></div></main>`;
  document.body.classList.add("ready");
  signOut(auth);
}

/** Redirects to login if signed out. Resolves with { user, profile }. */
export function requireAuth({ admin = false } = {}) {
  return new Promise(resolve => {
    let done = false;
    onAuthStateChanged(auth, async user => {
      if (!user) { if (!done) location.replace("login.html"); else location.href = "login.html"; return; }
      if (done) return;
      let snap;
      try { snap = await getDoc(doc(db, "users", user.uid)); }
      catch (e) { console.error(e); return blocked("Can't load your account", "Check your connection and try again. If this keeps happening, contact the developer."); }
      if (!snap.exists()) return blocked("Account not set up yet", "This sign-in has no school profile. Ask the developer to finish setting up your account.");
      const profile = { schoolName: "My School", role: "user", logo: "", ...snap.data() };
      if (admin && profile.role !== "admin") { location.replace("index.html"); return; }
      done = true;
      ctx.user = user; ctx.profile = profile;
      resolve({ user, profile });
    });
  });
}

/* ---------- page shell (sidebar + top bar) ---------- */
export function mountShell(active, title) {
  const { profile, user } = ctx;
  document.title = `${title} · ${profile.schoolName}`;
  const items = [["home", "index.html", "Home"], ["assignments", "view.html", "Assignments"], ["attendance", "viewAttendance.html", "Attendance"], ["classes", "classes.html", "Classes"]];
  if (profile.role === "admin") items.push(["admin", "admin.html", "School settings"]);
  $("#side").innerHTML = `
    <div class="brand"><img class="logo" src="${esc(logoSrc(profile))}" alt=""><b>${esc(profile.schoolName)}</b></div>
    <nav class="nav">${items.map(([k, h, l]) => `<a href="${h}" class="${k === active ? "on" : ""}">${ic(k)}<span>${l}</span></a>`).join("")}</nav>
    <div class="side-foot"><div class="who">${esc(user.email)}</div><button class="btn ghost sm" id="signout">${ic("logout")} Sign out</button></div>`;
  const dark = () => document.documentElement.dataset.theme === "dark";
  $("#top").innerHTML = `
    <button class="icon-btn menu" id="menuBtn" aria-label="Open menu">${ic("menu")}</button>
    <h1>${esc(title)}</h1>
    <button class="icon-btn" id="themeBtn" aria-label="Toggle dark mode">${ic(dark() ? "sun" : "moon")}</button>`;
  const scrim = document.createElement("div"); scrim.className = "scrim"; document.body.append(scrim);
  const toggleMenu = open => { $("#side").classList.toggle("open", open); scrim.classList.toggle("show", open); };
  $("#menuBtn").onclick = () => toggleMenu(true);
  scrim.onclick = () => toggleMenu(false);
  $("#themeBtn").onclick = () => { setTheme(dark() ? "light" : "dark"); $("#themeBtn").innerHTML = ic(dark() ? "sun" : "moon"); };
  $("#signout").onclick = () => signOut(auth).then(() => location.href = "login.html");
  document.body.classList.add("ready");
}

/* ---------- toasts + confirm ---------- */
export function toast(msg, type = "ok") {
  let box = $("#toasts");
  if (!box) { box = document.createElement("div"); box.id = "toasts"; box.setAttribute("aria-live", "polite"); document.body.append(box); }
  const el = document.createElement("div"); el.className = `toast ${type}`; el.textContent = msg; box.append(el);
  setTimeout(() => el.remove(), 3400);
}
export function confirmBox({ title, text = "", ok = "Confirm", danger = false }) {
  return new Promise(res => {
    const d = document.createElement("dialog");
    d.innerHTML = `<form method="dialog"><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="dlg-actions"><button class="btn ghost" value="no">Cancel</button><button class="btn ${danger ? "danger solid" : "primary"}" value="yes">${esc(ok)}</button></div></form>`;
    document.body.append(d); d.showModal();
    d.addEventListener("close", () => { res(d.returnValue === "yes"); d.remove(); });
  });
}
/** Toast + redirect, and never resolves so the rest of the page script doesn't run. */
export function notFound(msg, to) { toast(msg, "err"); setTimeout(() => location.replace(to), 900); return new Promise(() => {}); }

/* ---------- per-user data store (users/{uid}/{collection}/{id}) ---------- */
const colRef = n => collection(db, "users", ctx.user.uid, n);
const docRef = (n, id) => doc(db, "users", ctx.user.uid, n, id);
export const store = {
  async list(n) { return (await getDocs(colRef(n))).docs.map(d => ({ ...d.data(), id: d.id })); },
  async get(n, id) { const s = await getDoc(docRef(n, id)); return s.exists() ? { ...s.data(), id: s.id } : null; },
  save(n, o) { return setDoc(docRef(n, o.id), clean(o)); },
  remove(n, id) { return deleteDoc(docRef(n, id)); },
  async clear(n) {
    const ids = (await getDocs(colRef(n))).docs.map(d => d.id);
    for (let i = 0; i < ids.length; i += 400) {
      const b = writeBatch(db); ids.slice(i, i + 400).forEach(id => b.delete(docRef(n, id))); await b.commit();
    }
  },
  async settings() { const s = await getDoc(doc(db, "users", ctx.user.uid, "settings", "prefs")); return s.exists() ? s.data() : {}; },
  setSettings(p) { return setDoc(doc(db, "users", ctx.user.uid, "settings", "prefs"), p, { merge: true }); }
};

/* ---------- logos ---------- */
export async function logoForPdf() {
  try {
    let data = ctx.profile.logo;
    if (!data) {
      const blob = await (await fetch("logo.png")).blob();
      data = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
    }
    const size = await new Promise((r, j) => { const i = new Image(); i.onload = () => r([i.width, i.height]); i.onerror = j; i.src = data; });
    return { data, w: size[0], h: size[1], fmt: data.startsWith("data:image/jpeg") ? "JPEG" : "PNG" };
  } catch { return null; }
}
/** Resize an uploaded image file to a small PNG data URL (keeps the Firestore document small). */
export function resizeImage(file, max = 256) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const w0 = img.width || max, h0 = img.height || max, s = Math.min(1, max / Math.max(w0, h0));
      const c = document.createElement("canvas"); c.width = Math.round(w0 * s); c.height = Math.round(h0 * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL("image/png"));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("That file isn't a readable image.")); };
    img.src = url;
  });
}

/* ---------- one-time import of data saved in this browser by the old version ---------- */
const LS = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
export function hasLocalData() {
  if (localStorage.getItem("imported_" + ctx.user.uid)) return false;
  return ["classes", "assignments", "attendance"].some(k => (LS(k) || []).length);
}
export function dismissLocalData() { localStorage.setItem("imported_" + ctx.user.uid, "1"); }
export async function importLocalData() {
  const items = [];
  for (const n of ["classes", "assignments", "attendance"]) for (const o of LS(n) || []) if (o && o.id) items.push([n, o]);
  for (let i = 0; i < items.length; i += 400) {
    const b = writeBatch(db);
    items.slice(i, i + 400).forEach(([n, o]) => b.set(docRef(n, o.id), clean(o)));
    await b.commit();
  }
  const head = localStorage.getItem("headClassId");
  if (head) await store.setSettings({ headClassId: head });
  dismissLocalData();
  return items.length;
}
