/* -------------------- SECURITY: INPUT DEFENSE / THROTTLING -------------------- */
const SECURITY_LIMITS = Object.freeze({
    text: 4000, shortText: 500, search: 120, id: 160, jsonFileBytes: 200 * 1024 * 1024,
    imageBytes: 15 * 1024 * 1024, imageCount: 20, apiWindowMs: 60 * 1000,
    apiCallsPerWindow: 30, pinAttempts: 3, assetUrl: 2048
});
function safeText(value, max = SECURITY_LIMITS.text) {
    return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/[\u2028\u2029]/g, " ").slice(0, max);
}
function safeShortText(value, max = SECURITY_LIMITS.shortText) { return safeText(value, max).trim(); }
function safeSearchText(value) { return safeText(value, SECURITY_LIMITS.search).trim(); }
function safeId(value) {
    const s = safeShortText(value, SECURITY_LIMITS.id);
    return /^[A-Za-z0-9._~-]+$/.test(s) ? s : "";
}
function safeAssetSource(value) {
    const s = String(value ?? "").trim();
    if (!s)
        return ""; /* boş değer sayfanın kendi adresine çözülmesin */
    if (/^data:image\/(?:png|jpe?g|webp|gif|svg\+xml);/i.test(s))
        return s;
    if (/^blob:/i.test(s))
        return s;
    if (s.length > SECURITY_LIMITS.assetUrl && !/^data:/i.test(s))
        return "";
    /* Site klasöründeki göreli görsel yolu (ör. "x.webp") olduğu gibi saklanır; alan adı değişse de çalışır. */
    if (/^(?:\.\/)?[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)*\.(?:webp|png|jpe?g|gif|svg)$/i.test(s) && !s.includes(".."))
        return s;
    try {
        const u = new URL(s, document.baseURI);
        if (u.username || u.password)
            return "";
        if (u.protocol === "https:")
            return u.href;
        /* Aynı kaynaktan (site klasöründen) gelen dosyalar her protokolde kabul edilir. */
        if (u.origin === window.location.origin && u.origin !== "null")
            return u.href;
        return "";
    }
    catch (_) {
        return "";
    }
}
/* CSS url() içine güvenli yerleştirme: tırnak/parantez/ters bölü kaçışlanır. */
function cssUrl(value) {
    const src = safeAssetSource(value);
    if (!src)
        return "";
    return 'url("' + src.replace(/["\\\n\r\f]/g, ch => "\\" + ch.charCodeAt(0).toString(16) + " ") + '")';
}
function safeHexColor(value, fallback) {
    const v = String(value ?? "").trim();
    return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : fallback;
}
/* Vurgu rengi üzerindeki yazı için okunaklı renk (açık altın üzerinde beyaz yazı yetersiz kontrast veriyordu). */
function inkOn(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
    if (!m)
        return "#fff";
    const ch = [0, 2, 4].map(i => { let v = parseInt(m[1].slice(i, i + 2), 16) / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    const L = .2126 * ch[0] + .7152 * ch[1] + .0722 * ch[2];
    return (1.05 / (L + .05)) >= ((L + .05) / (0.0081 + .05)) ? "#fff" : "#141416";
}
function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
function validateUploadFile(file, { maxBytes = SECURITY_LIMITS.imageBytes, types = ["image/jpeg", "image/png", "image/webp", "image/gif"] } = {}) {
    if (!file || typeof file !== "object")
        throw new Error("Geçersiz dosya.");
    const mime = String(file.type || "").toLowerCase();
    if (!types.includes(mime))
        throw new Error("Desteklenmeyen dosya türü.");
    if (!Number.isFinite(file.size) || file.size <= 0 || file.size > maxBytes)
        throw new Error("Dosya boyutu izin verilen sınırın dışında.");
    const name = safeShortText(file.name || "", 180);
    if (!name || /[\/\\\u0000-\u001F]/.test(name))
        throw new Error("Geçersiz dosya adı.");
    return true;
}
const rateState = new Map();
function consumeClientRateLimit(bucket, limit = SECURITY_LIMITS.apiCallsPerWindow, windowMs = SECURITY_LIMITS.apiWindowMs) {
    const key = safeShortText(bucket, 120) || "default", now = Date.now(), state = rateState.get(key);
    if (!state || now - state.startedAt >= windowMs) {
        rateState.set(key, { startedAt: now, count: 1 });
        return true;
    }
    if (state.count >= limit)
        return false;
    state.count++;
    return true;
}
async function enforceClientRateLimit(bucket, limit, windowMs) {
    if (!consumeClientRateLimit(bucket, limit, windowMs))
        throw new Error("Çok fazla istek. Lütfen kısa süre sonra tekrar deneyin.");
}
function sanitizeCatalogData(data) {
    const clean = normalizeData(data);
    for (const k of ["siteName", "siteName_en", "subtitle", "subtitle_en", "eyebrow", "eyebrow_en"])
        clean[k] = safeText(clean[k]);
    clean.phone = safeShortText(clean.phone, 80);
    delete clean.pin;
    const base = defaultData();
    clean.logo = {
        src: safeAssetSource(clean.logo?.src) || null,
        size: clampNumber(clean.logo?.size, 20, 600, 110),
        width: clampNumber(clean.logo?.width, 20, 600, 110),
        height: clampNumber(clean.logo?.height, 20, 600, 110),
        position: ["left", "center", "right"].includes(clean.logo?.position) ? clean.logo.position : "center"
    };
    const th = clean.theme || {}, bt = base.theme;
    clean.theme = {
        id: safeId(th.id) || bt.id, name: safeShortText(th.name, 60) || bt.name,
        bg: safeHexColor(th.bg, bt.bg), card: safeHexColor(th.card, bt.card), accent: safeHexColor(th.accent, bt.accent), text: safeHexColor(th.text, bt.text),
        bgImage: safeAssetSource(th.bgImage) || null
    };
    clean.cardImgSize = clampNumber(clean.cardImgSize, 80, 600, 180);
    clean.currency = {
        selected: ["TRY", "USD", "EUR"].includes(clean.currency?.selected) ? clean.currency.selected : "TRY",
        usdRate: (n => Number.isFinite(n) && n > 0 && n < 1000000 ? n : base.currency.usdRate)(Number(clean.currency?.usdRate)),
        eurRate: (n => Number.isFinite(n) && n > 0 && n < 1000000 ? n : base.currency.eurRate)(Number(clean.currency?.eurRate))
    };
    if (clean.pdf) {
        for (const k of ["title", "footer", "website", "catalogTitle"])
            clean.pdf[k] = safeShortText(clean.pdf[k], 200);
        clean.pdf.catalogTemplate = ["klasik", "vitrin", "izgara", "dergi"].includes(clean.pdf.catalogTemplate) ? clean.pdf.catalogTemplate : "vitrin";
        const lay = {}, srcLay = (clean.pdf.categoryLayouts && typeof clean.pdf.categoryLayouts === "object") ? clean.pdf.categoryLayouts : {};
        for (const fc of (clean.categories || [])) {
            const v = srcLay[fc.id];
            if (["table", "sizes", "models"].includes(v))
                lay[fc.id] = v;
        }
        clean.pdf.categoryLayouts = lay;
        clean.pdf.showPageNumbers = !!clean.pdf.showPageNumbers;
        clean.pdf.useCategoryCovers = !!clean.pdf.useCategoryCovers;
    }
    if (clean.pdf?.coverLogo)
        clean.pdf.coverLogo.src = safeAssetSource(clean.pdf.coverLogo.src) || DEFAULT_PDF_COVER_LOGO;
    for (const c of clean.categories || []) {
        c.name = safeShortText(c.name, 120);
        c.name_en = safeShortText(c.name_en, 120);
        c.coverImage = safeAssetSource(c.coverImage) || null;
        for (const item of c.items || []) {
            item.id = safeId(item.id) || uid();
            for (const k of ["name", "name_en", "desc", "desc_en", "name_src", "desc_src"])
                item[k] = safeText(item[k]);
            item.dims = safeText(item.dims, 500);
            item.dims_en = safeText(item.dims_en, 500);
            item.image = safeAssetSource(item.image) || null;
            item.images = (Array.isArray(item.images) ? item.images : []).map(safeAssetSource).filter(Boolean).slice(0, SECURITY_LIMITS.imageCount);
            if (item.price) {
                const pr = normalizePrice(item.price);
                item.price = { ...pr,
                    amount: priceNumber(pr.amount), manualTotal: priceNumber(pr.manualTotal),
                    contactOnly: !!pr.contactOnly, autoCollect: pr.autoCollect !== false,
                    parts: pr.parts.slice(0, 100).map(part => ({
                        id: safeId(part.id) || uid(),
                        name: safeShortText(part.name, 300), name_en: safeShortText(part.name_en, 300), name_src: safeShortText(part.name_src, 300),
                        dims: safeShortText(part.dims, 200), dims_en: safeShortText(part.dims_en, 200),
                        amount: priceNumber(part.amount), contactOnly: !!part.contactOnly,
                        image: safeAssetSource(part.image) || null
                    })) };
            }
        }
    }
    return clean;
}
const BACKUP_KEY = "ofischi_premium_catalog_backup_v4";
const LANG_KEY = "ofischi_premium_lang_v1";
const VIEW_CURRENCY_KEY = "ofischi_view_currency_v1";
/* SABİT KATEGORİLER — sitede, yönetim panelinde, fiyat listesinde ve katalogda tek kaynak.
   Ad, sıra ve İngilizce karşılık buradan gelir; panelden eklenemez, silinemez, yeniden adlandırılamaz.
   "aliases": eski sürümlerdeki kategori adları → ürünler doğru kategoriye otomatik taşınır. */
const FIXED_CATEGORIES = Object.freeze([
    { id: "vip-makam-takimlari", name: "VIP MAKAM TAKIMLARI", name_en: "VIP EXECUTIVE SETS", aliases: ["VIP Makam Takımları"] },
    { id: "makam-takimlari", name: "MAKAM TAKIMLARI", name_en: "EXECUTIVE SETS", aliases: ["Makam Takımları"] },
    { id: "yonetici-takimlari", name: "YÖNETİCİ TAKIMLARI", name_en: "MANAGER SETS", aliases: [] },
    { id: "personel-takimlari", name: "PERSONEL TAKIMLARI", name_en: "STAFF SETS", aliases: ["Personel Takımları"] },
    { id: "workstations", name: "WORKSTATIONS", name_en: "WORKSTATIONS", aliases: ["Workstation"] },
    { id: "toplanti-masalari", name: "TOPLANTI MASALARI", name_en: "MEETING TABLES", aliases: ["Toplantı Masaları"] },
    { id: "bankolar", name: "BANKOLAR", name_en: "RECEPTION DESKS", aliases: ["Banko"] },
    { id: "kesonlar", name: "KESONLAR", name_en: "PEDESTALS", aliases: ["Keson"] },
    { id: "etajer-kabinler", name: "ETAJER - KABİNLER", name_en: "CREDENZAS - CABINETS", aliases: ["Etajer", "Etajerler", "Kabinler"] },
    { id: "dolaplar", name: "DOLAPLAR", name_en: "STORAGE CABINETS", aliases: ["Dolap"] },
    { id: "dosya-dolaplari", name: "DOSYA DOLAPLARI", name_en: "FILING CABINETS", aliases: [] },
    { id: "soyunma-dolaplari", name: "SOYUNMA DOLAPLARI", name_en: "LOCKERS", aliases: [] },
    { id: "asos-dolaplar", name: "ASOS DOLAPLAR", name_en: "ASOS CABINETS", aliases: [] },
    { id: "kasalar", name: "KASALAR", name_en: "SAFES", aliases: ["Kasa"] },
    { id: "oturma-gruplari", name: "OTURMA GRUPLARI", name_en: "SOFA SETS", aliases: [] },
    { id: "lobi-koltuklari", name: "LOBİ KOLTUKLARI", name_en: "LOBBY SEATING", aliases: ["Loby Koltukları", "Lobi Koltukları"] },
    { id: "ofis-koltuklari", name: "OFİS KOLTUKLARI", name_en: "OFFICE CHAIRS", aliases: ["Ofis Koltukları"] },
    { id: "fileli-ofis-koltuklari", name: "FİLELİ OFİS KOLTUKLARI", name_en: "MESH OFFICE CHAIRS", aliases: ["Fileli Koltuklar", "Fileli Koltuk"] },
    { id: "proje-koltuklari", name: "PROJE KOLTUKLARI", name_en: "PROJECT CHAIRS", aliases: [] },
    { id: "tabureler", name: "TABURELER", name_en: "STOOLS", aliases: [] },
    { id: "bar-koltuklari", name: "BAR KOLTUKLARI", name_en: "BAR CHAIRS", aliases: [] },
    { id: "konferans-koltuklari", name: "KONFERANS KOLTUKLARI", name_en: "CONFERENCE CHAIRS", aliases: [] },
    { id: "puflar", name: "PUFLAR", name_en: "POUFS", aliases: [] },
    { id: "proje-ve-aksesuar", name: "PROJE VE AKSESUAR", name_en: "PROJECTS & ACCESSORIES", aliases: ["Aksesuarlar", "Aksesuar"] }
]);
/* Eşleşmeyen eski kategorilerin ürünleri kaybolmasın diye buraya taşınır. */
const FALLBACK_CATEGORY_ID = "proje-ve-aksesuar";
function categoryKey(v) { return String(v ?? "").toLocaleUpperCase("tr-TR").replace(/[^A-ZÇĞİÖŞÜ0-9]/g, ""); }
const FIXED_CATEGORY_LOOKUP = (() => { const m = new Map(); for (const fc of FIXED_CATEGORIES) {
    m.set(fc.id, fc.id);
    for (const n of [fc.name, fc.name_en, ...fc.aliases])
        m.set(categoryKey(n), fc.id);
} return m; })();
/* FİYAT LİSTESİ DÜZENİ (kategori bazında)
   table  = Takım tablosu (modül + ölçü + birim fiyat + takım fiyatı)
   sizes  = Ölçü kartları (her ölçü ayrı fiyat; toplanmaz)
   models = Model sırası (Müdür · Şef · Personel · Misafir; her modelin kendi fotoğrafı ve fiyatı; toplanmaz) */
const PDF_CATEGORY_LAYOUTS = Object.freeze([
    { id: "table", name: "Takım Tablosu", desc: "Modüller toplanır, takım fiyatı çıkar." },
    { id: "sizes", name: "Ölçü Kartları", desc: "Her ölçünün ayrı fiyatı; 3'lü kartlar." },
    { id: "models", name: "Model Sırası", desc: "Müdür, şef, misafir… her modelin resmi ve fiyatı." }
]);
const DEFAULT_CATEGORY_LAYOUTS = Object.freeze({
    "workstations": "sizes",
    "toplanti-masalari": "sizes",
    "bankolar": "sizes",
    "kesonlar": "sizes",
    "etajer-kabinler": "sizes",
    "dolaplar": "sizes",
    "dosya-dolaplari": "sizes",
    "soyunma-dolaplari": "sizes",
    "asos-dolaplar": "sizes",
    "kasalar": "sizes",
    "lobi-koltuklari": "sizes",
    "tabureler": "sizes",
    "bar-koltuklari": "sizes",
    "konferans-koltuklari": "sizes",
    "puflar": "sizes",
    "proje-ve-aksesuar": "sizes",
    "ofis-koltuklari": "models", "fileli-ofis-koltuklari": "models", "proje-koltuklari": "models"
});
function categoryLayoutOf(data, categoryId) {
    const v = data?.pdf?.categoryLayouts?.[categoryId];
    return PDF_CATEGORY_LAYOUTS.some(l => l.id === v) ? v : (DEFAULT_CATEGORY_LAYOUTS[categoryId] || "table");
}
function isVariantLayout(layout) { return layout === "sizes" || layout === "models"; }
/* Ölçü/model fiyatları alternatiftir: toplam yerine en düşük fiyat ("…'den başlayan") kullanılır. */
function variantMinPrice(price) {
    const p = normalizePrice(price);
    const vals = p.parts.filter(x => !x.contactOnly).map(x => priceNumber(x.amount)).filter(v => v !== null && v > 0);
    if (vals.length)
        return Math.min(...vals);
    return p.manualTotal !== null && p.manualTotal !== undefined ? priceNumber(p.manualTotal) : null;
}
function fixedCategoryIdFor(c) {
    if (!c || typeof c !== "object")
        return null;
    if (FIXED_CATEGORY_LOOKUP.has(String(c.id || "")))
        return FIXED_CATEGORY_LOOKUP.get(String(c.id));
    const name = typeof c.name === "string" ? c.name : (c.name?.tr || "");
    return FIXED_CATEGORY_LOOKUP.get(categoryKey(name)) || FIXED_CATEGORY_LOOKUP.get(categoryKey(c.name_en)) || null;
}
