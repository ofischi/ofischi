/* -------------------- STORAGE -------------------- */
/*
  KALICI KAYIT SİSTEMİ (yerel)
  - localStorage + yedek anahtar + IndexedDB: üç katmanlı yerel kayıt
  - Uzak sunucu bağlantısı yok. Cihazlar arası taşıma için JSON Dışa/İçe Aktar kullanılır.
*/
/* Safe image loader: keep the real URL immediately visible. Browser HTTP cache + lazy loading handle repeat downloads. */
function getCachedImageObjectUrl(src) {
    return Promise.resolve(src);
}
function CachedImage({ src, ...props }) {
    const raw = safeAssetSource(src);
    /* Beyaz zeminli ürün fotoğrafları ("...w.webp") kırpılmaz; ürün tamamen görünür. */
    const white = typeof raw === "string" && /w\.webp$/i.test(raw);
    return React.createElement("img", { ...props, className: (props.className || "") + (white ? " img-white" : ""), src: raw || undefined, referrerPolicy: "no-referrer" });
}
function isDataImageSource(src) {
    return typeof src === 'string' && /^data:image\//i.test(src);
}
const IDB_NAME = "ofischi_premium_storage_v2";
const IDB_STORE = "catalog";
const IDB_KEY = "catalog";
function openCatalogDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error("IndexedDB desteklenmiyor"));
            return;
        }
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(IDB_STORE))
                db.createObjectStore(IDB_STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error("IndexedDB açılamadı"));
    });
}
function makeStorageRecord(data) {
    return { savedAt: Date.now(), data: normalizeData(data) };
}
function parseStorageRecord(value) {
    if (!value || typeof value !== "object")
        return null;
    /* Yeni format */
    if (value.data && typeof value.data === "object")
        return { savedAt: Number(value.savedAt) || 0, data: sanitizeCatalogData(value.data), rawPin: value.data.pin };
    /* Eski v4 formatıyla geriye dönük uyumluluk */
    return { savedAt: 1, data: sanitizeCatalogData(value), rawPin: value.pin };
}
function readLocalRecord(key) {
    try {
        const raw = lsGet(key);
        if (!raw)
            return null;
        return parseStorageRecord(JSON.parse(raw));
    }
    catch (e) {
        console.warn("localStorage okunamadı:", e);
        return null;
    }
}
async function idbGetRecord() {
    const db = await openCatalogDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readonly");
        const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
        req.onsuccess = () => resolve(parseStorageRecord(req.result));
        req.onerror = () => reject(req.error || new Error("IndexedDB okuma hatası"));
        tx.oncomplete = () => db.close();
        tx.onerror = () => reject(tx.error || new Error("IndexedDB işlem hatası"));
    });
}
async function idbSetRecord(record) {
    const db = await openCatalogDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(record, IDB_KEY);
        tx.oncomplete = () => { db.close(); resolve(true); };
        tx.onerror = () => { db.close(); reject(tx.error || new Error("IndexedDB yazma hatası")); };
        tx.onabort = () => { db.close(); reject(tx.error || new Error("IndexedDB yazma iptal edildi")); };
    });
}
async function loadLocal() {
    const local = readLocalRecord(DB_KEY);
    const backup = readLocalRecord(BACKUP_KEY);
    let idb = null;
    try {
        idb = await idbGetRecord();
    }
    catch (e) {
        console.warn("IndexedDB okunamadı:", e);
    }
    const candidates = [local, backup, idb].filter(Boolean);
    if (!candidates.length)
        return null;
    candidates.sort((a, b) => (Number(b.savedAt) || 0) - (Number(a.savedAt) || 0));
    const newest = candidates[0];
    /* En güncel kopyayı diğer katmanlara da senkronla (PIN olmadan). */
    const syncRecord = { savedAt: newest.savedAt, data: newest.data };
    {
        const json = JSON.stringify(syncRecord);
        if (lsSet(DB_KEY, json)) {
            if (json.length < 2 * 1024 * 1024)
                lsSet(BACKUP_KEY, json);
            else
                lsRemove(BACKUP_KEY);
        }
        else {
            lsRemove(DB_KEY);
            lsRemove(BACKUP_KEY);
        }
    }
    try {
        await idbSetRecord(syncRecord);
    }
    catch (e) { }
    return { savedAt: Number(newest.savedAt) || 0, data: normalizeData(applyPreloadUpgrade(newest.data)), rawPin: newest.rawPin };
}
async function saveLocal(data) {
    const clean = sanitizeCatalogData(data);
    const record = { savedAt: Date.now(), data: clean };
    /* Ana kayıt IndexedDB (büyük kataloglar ve fotoğraflar için yeterli alan). Kayıt bitmeden "Kaydedildi" denmez. */
    let idbOk = false;
    try {
        await idbSetRecord(record);
        idbOk = true;
    }
    catch (e) {
        console.warn("IndexedDB yazılamadı:", e);
    }
    /* localStorage hızlı açılış kopyasıdır (~5 MB sınırı). Sığmazsa eski kopya silinir; böylece eski veri geri gelmez. */
    const json = JSON.stringify(record);
    let lsOk = lsSet(DB_KEY, json);
    if (lsOk && json.length < 2 * 1024 * 1024)
        lsSet(BACKUP_KEY, json);
    else
        lsRemove(BACKUP_KEY);
    if (!lsOk) {
        lsRemove(DB_KEY);
        lsRemove(BACKUP_KEY);
    }
    if (!idbOk && !lsOk)
        throw new Error("Tarayıcı depolama alanına yazılamadı. Depolama dolu veya kapalı olabilir; lütfen JSON yedeği alın.");
    return { savedAt: record.savedAt, data: clean, storage: idbOk ? "idb" : "local" };
}
async function requestPersistentStorage() {
    try {
        if (navigator.storage && navigator.storage.persist) {
            const already = await navigator.storage.persisted();
            if (!already)
                await navigator.storage.persist();
        }
    }
    catch (e) { }
}
function downloadJSON(data) {
    const blob = new Blob([JSON.stringify(normalizeData(data), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ofischi-premium-katalog-yedek.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function readJSONFile(file) {
    return new Promise((resolve, reject) => {
        try {
            const okType = file && (file.type === "application/json" || ((file.type === "" || file.type === "text/plain") && /\.json$/i.test(file.name || "")));
            if (!okType)
                throw new Error("Yalnızca JSON dosyası kabul edilir.");
            if (!Number.isFinite(file.size) || file.size <= 0 || file.size > SECURITY_LIMITS.jsonFileBytes)
                throw new Error("JSON dosyası boyutu izin verilen sınırın dışında.");
            const r = new FileReader();
            r.onload = () => {
                try {
                    const raw = String(r.result || "");
                    if (raw.length > SECURITY_LIMITS.jsonFileBytes)
                        throw new Error("JSON içeriği çok büyük.");
                    const parsed = JSON.parse(raw);
                    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
                        throw new Error("Geçersiz katalog yapısı.");
                    resolve(sanitizeCatalogData(parsed));
                }
                catch (e) {
                    reject(e);
                }
            };
            r.onerror = () => reject(r.error || new Error("Dosya okunamadı."));
            r.readAsText(file);
        }
        catch (e) {
            reject(e);
        }
    });
}
