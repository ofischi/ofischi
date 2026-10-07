/* -------------------- ADMIN PIN (hash) --------------------
   PIN düz metin olarak hiçbir yerde saklanmaz ve JSON yedeğine girmez.
   PBKDF2-SHA256 (150.000 tur) + rastgele salt ile ayrı bir anahtarda tutulur. */
const PIN_HASH_KEY = "ofischi_admin_pin_hash_v1";
const PIN_ITERATIONS = 150000;
function pinBytesToB64(bytes) { let s = ""; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s); }
function pinB64ToBytes(b64) { const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++)
    out[i] = bin.charCodeAt(i); return out; }
async function derivePinHash(pin, salt, iterations = PIN_ITERATIONS) {
    if (!window.crypto?.subtle)
        throw new Error("Bu tarayıcı güvenli PIN doğrulamasını desteklemiyor (HTTPS gerekli).");
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(pin)), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
    return new Uint8Array(bits);
}
function readPinRecord() {
    try {
        const r = JSON.parse(lsGet(PIN_HASH_KEY) || "null");
        return (r && r.salt && r.hash) ? r : null;
    }
    catch (_) {
        return null;
    }
}
function hasAdminPin() { return !!readPinRecord(); }
function isValidPin(pin) { return /^\d{4,8}$/.test(String(pin || "")); }
async function setAdminPin(pin) {
    if (!isValidPin(pin))
        throw new Error("PIN 4-8 haneli rakamlardan oluşmalıdır.");
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derivePinHash(pin, salt);
    if (!lsSet(PIN_HASH_KEY, JSON.stringify({ v: 1, iter: PIN_ITERATIONS, salt: pinBytesToB64(salt), hash: pinBytesToB64(hash) })))
        throw new Error("PIN bu tarayıcıda kaydedilemedi (tarayıcı depolaması kapalı olabilir).");
}
async function verifyAdminPin(pin) {
    const rec = readPinRecord();
    if (!rec || !isValidPin(pin))
        return false;
    const calc = await derivePinHash(pin, pinB64ToBytes(rec.salt), Number(rec.iter) || PIN_ITERATIONS);
    const stored = pinB64ToBytes(rec.hash);
    if (calc.length !== stored.length)
        return false;
    let diff = 0;
    for (let i = 0; i < calc.length; i++)
        diff |= calc[i] ^ stored[i];
    return diff === 0;
}
/* Eski sürümde veri içinde tutulan PIN'i (1234 hariç) hash'e taşır. */
async function migrateLegacyPin(rawPin) {
    if (hasAdminPin())
        return;
    const p = String(rawPin ?? "").replace(/\D/g, "");
    if (isValidPin(p) && p !== "1234")
        await setAdminPin(p);
}
const PIN_LOCK_STORAGE_KEY = "ofischi_pin_lock_v1";
/* Deneme sayacı modül düzeyinde tutulur (React yeniden çizimlerinde sıfırlanmaz)
   ve sayfa yenilemesine karşı localStorage'a yazılır. */
let pinFailureCount = 0, pinBlockedUntil = 0, pinCheckBusy = false;
try {
    const stored = JSON.parse(lsGet(PIN_LOCK_STORAGE_KEY) || "null");
    if (stored && Number.isFinite(stored.blockedUntil) && stored.blockedUntil > Date.now()) {
        pinBlockedUntil = stored.blockedUntil;
        pinFailureCount = SECURITY_LIMITS.pinAttempts;
    }
    else if (stored && Number.isFinite(stored.failures) && stored.failures > 0 && Date.now() - Number(stored.failedAt || 0) < 60 * 60 * 1000) {
        pinFailureCount = Math.min(stored.failures, SECURITY_LIMITS.pinAttempts - 1);
    }
    else if (stored) {
        lsRemove(PIN_LOCK_STORAGE_KEY);
    }
}
catch (_) { }
function persistPinLock() {
    try {
        localStorage.setItem(PIN_LOCK_STORAGE_KEY, JSON.stringify({ blockedUntil: pinBlockedUntil, failures: pinFailureCount, failedAt: Date.now() }));
    }
    catch (_) { }
}
function clearPinLock() {
    pinFailureCount = 0;
    pinBlockedUntil = 0;
    try {
        localStorage.removeItem(PIN_LOCK_STORAGE_KEY);
    }
    catch (_) { }
}
"use strict";
/* YENİ YÖNETİM PANELİ — çizgi ikonlar */
function AdmIcon({ name, size = 18 }) {
    const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false" };
    switch (name) {
        case "grid": return React.createElement("svg", { ...p },
            React.createElement("rect", { x: "3", y: "3", width: "7", height: "9", rx: "1.5" }),
            React.createElement("rect", { x: "14", y: "3", width: "7", height: "5", rx: "1.5" }),
            React.createElement("rect", { x: "14", y: "12", width: "7", height: "9", rx: "1.5" }),
            React.createElement("rect", { x: "3", y: "16", width: "7", height: "5", rx: "1.5" }));
        case "box": return React.createElement("svg", { ...p },
            React.createElement("path", { d: "M20 7 12 3 4 7v10l8 4 8-4z" }),
            React.createElement("path", { d: "M4 7l8 4 8-4M12 11v10" }));
        case "tag": return React.createElement("svg", { ...p },
            React.createElement("path", { d: "M3 12V4h8l10 10-8 8z" }),
            React.createElement("circle", { cx: "7.5", cy: "7.5", r: "1.5" }));
        case "list": return React.createElement("svg", { ...p },
            React.createElement("path", { d: "M4 6h16M4 12h16M4 18h10" }));
        case "file": return React.createElement("svg", { ...p },
            React.createElement("path", { d: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" }),
            React.createElement("path", { d: "M14 3v6h6M8 13h8M8 17h5" }));
        case "book": return React.createElement("svg", { ...p },
            React.createElement("path", { d: "M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" }),
            React.createElement("path", { d: "M9 7h6" }));
        case "palette": return React.createElement("svg", { ...p },
            React.createElement("circle", { cx: "12", cy: "12", r: "9" }),
            React.createElement("circle", { cx: "8", cy: "10", r: "1" }),
            React.createElement("circle", { cx: "12", cy: "7.5", r: "1" }),
            React.createElement("circle", { cx: "16", cy: "10", r: "1" }),
            React.createElement("path", { d: "M12 21c-1.5 0-2-1-2-2s1-1.5 1-2.5-1-1.5-2-1.5" }));
        case "table": return React.createElement("svg", { ...p },
            React.createElement("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }),
            React.createElement("path", { d: "M3 10h18M9 4v16" }));
        case "cards": return React.createElement("svg", { ...p },
            React.createElement("rect", { x: "3", y: "3", width: "8", height: "8", rx: "1.5" }),
            React.createElement("rect", { x: "13", y: "3", width: "8", height: "8", rx: "1.5" }),
            React.createElement("rect", { x: "3", y: "13", width: "8", height: "8", rx: "1.5" }),
            React.createElement("rect", { x: "13", y: "13", width: "8", height: "8", rx: "1.5" }));
        case "plus": return React.createElement("svg", { ...p },
            React.createElement("path", { d: "M12 5v14M5 12h14" }));
        case "percent": return React.createElement("svg", { ...p },
            React.createElement("path", { d: "M19 5 5 19" }),
            React.createElement("circle", { cx: "7", cy: "7", r: "2.5" }),
            React.createElement("circle", { cx: "17", cy: "17", r: "2.5" }));
        case "search": return React.createElement("svg", { ...p },
            React.createElement("circle", { cx: "11", cy: "11", r: "7" }),
            React.createElement("path", { d: "m20 20-3.5-3.5" }));
        case "x": return React.createElement("svg", { ...p },
            React.createElement("path", { d: "M6 6l12 12M18 6 6 18" }));
        case "alert": return React.createElement("svg", { ...p },
            React.createElement("path", { d: "M12 9v4M12 17h.01" }),
            React.createElement("path", { d: "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" }));
        case "check": return React.createElement("svg", { ...p },
            React.createElement("path", { d: "m5 12 5 5 9-10" }));
        case "image": return React.createElement("svg", { ...p },
            React.createElement("rect", { x: "3", y: "5", width: "18", height: "14", rx: "2" }),
            React.createElement("circle", { cx: "9", cy: "10", r: "2" }),
            React.createElement("path", { d: "m21 16-5-5-8 8" }));
        case "upload": return React.createElement("svg", { ...p },
            React.createElement("path", { d: "M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" }),
            React.createElement("path", { d: "M12 4v12M7 9l5-5 5 5" }));
        case "trash": return React.createElement("svg", { ...p },
            React.createElement("path", { d: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" }));
        case "eye": return React.createElement("svg", { ...p },
            React.createElement("path", { d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" }),
            React.createElement("circle", { cx: "12", cy: "12", r: "3" }));
        case "up": return React.createElement("svg", { ...p },
            React.createElement("path", { d: "m6 15 6-6 6 6" }));
        case "down": return React.createElement("svg", { ...p },
            React.createElement("path", { d: "m6 9 6 6 6-6" }));
        case "star": return React.createElement("svg", { ...p },
            React.createElement("path", { d: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" }));
        case "clock": return React.createElement("svg", { ...p },
            React.createElement("circle", { cx: "12", cy: "12", r: "9" }),
            React.createElement("path", { d: "M12 7v5l3 2" }));
        case "save": return React.createElement("svg", { ...p },
            React.createElement("path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }),
            React.createElement("path", { d: "M17 21v-8H7v8M7 3v5h8" }));
        case "grip": return React.createElement("svg", { ...p },
            React.createElement("circle", { cx: "9", cy: "6", r: "1.3" }),
            React.createElement("circle", { cx: "15", cy: "6", r: "1.3" }),
            React.createElement("circle", { cx: "9", cy: "12", r: "1.3" }),
            React.createElement("circle", { cx: "15", cy: "12", r: "1.3" }),
            React.createElement("circle", { cx: "9", cy: "18", r: "1.3" }),
            React.createElement("circle", { cx: "15", cy: "18", r: "1.3" }));
        case "logout": return React.createElement("svg", { ...p },
            React.createElement("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" }));
        default: return React.createElement("svg", { ...p },
            React.createElement("circle", { cx: "12", cy: "12", r: "9" }));
    }
}

