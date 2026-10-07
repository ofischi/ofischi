/* -------------------- TRANSLATION -------------------- */
const UI = {
    tr: {
        currency: "Para Birimi", search: "Ürün ara...", clearSearch: "Aramayı temizle",
        products: "ürün", clear: "Aramayı temizle", found: "ürün bulundu",
        notFound: "Aradığınız ürün bulunamadı.", empty: "Henüz ürün eklenmedi.",
        detailedPrices: "Detaylı fiyatlar", dimensions: "Ölçüler", prices: "Fiyatlar",
        contactPrice: "Fiyat için iletişime geçin", call: "Fiyat / Bilgi İçin Ara",
        premium: "Premium", admin: "Yönetim Girişi", wrongPin: "Hatalı PIN.", cancel: "Vazgeç",
        login: "Giriş Yap", adminPanel: "Yönetim Paneli", general: "Genel", catalog: "Ürün Kataloğu",
        siteName: "Site Adı", eyebrow: "Üst Etiket", phone: "Telefon", save: "Kaydet ve Kapat",
        saved: "Kaydedildi!", saving: "Kaydediliyor...", newCategory: "Yeni Kategori",
        productsBtn: "Ürünler", addProduct: "Ürün Ekle", deleteConfirm: "Bu ürün silinsin mi?",
        catDelete: "Bu kategori ve içindeki ürünler silinsin mi?", newProduct: "Yeni Ürün",
        description: "Ürün özellikleri", dimsPlaceholder: "Ölçüler: 200x90x75 cm",
        addPrice: "Fiyat Ekle", parts: "Ayrı Fiyatlar", partHint: "Ürünün parçalarını ayrı ayrı fiyatlandır.",
        newPart: "Yeni Parça", contactOnly: "Fiyat için iletişime geçin", total: "Toplam",
    },
    en: {
        currency: "Currency", search: "Search products...", clearSearch: "Clear search",
        products: "products", clear: "Clear search", found: "products found",
        notFound: "No products found.", empty: "No products have been added yet.",
        detailedPrices: "Detailed pricing", dimensions: "Dimensions", prices: "Prices",
        contactPrice: "Contact us for price", call: "Call for Price / Information",
        premium: "Premium", admin: "Admin Login", wrongPin: "Incorrect PIN.", cancel: "Cancel",
        login: "Log In", adminPanel: "Admin Panel", general: "General", catalog: "Product Catalog",
        siteName: "Site Name", eyebrow: "Top Label", phone: "Phone", save: "Save & Close",
        saved: "Saved!", saving: "Saving...", newCategory: "New Category",
        productsBtn: "Products", addProduct: "Add Product", deleteConfirm: "Delete this product?",
        catDelete: "Delete this category and all products in it?", newProduct: "New Product",
        description: "Product features", dimsPlaceholder: "Dimensions: 200x90x75 cm",
        addPrice: "Add Price", parts: "Separate Prices", partHint: "Price the product components separately.",
        newPart: "New Part", contactOnly: "Contact us for price", total: "Total",
    }
};
function t(lang, key) { return UI[lang === "EN" ? "en" : "tr"][key] || UI.tr[key] || key; }
/* Sözlük çevirisinde kaynağın büyük/küçük harf biçimini koru: "Masa"→"Desk", "MASA"→"DESK". */
function pdfMatchCase(src, rep) {
    const s = String(src || ""), r = String(rep || "");
    const words = s.split(/\s+/).filter(Boolean);
    if (words.length > 1 && words.every(w => { const f = w.charAt(0); return f === f.toLocaleUpperCase("tr-TR") && f !== f.toLocaleLowerCase("tr-TR"); }) && s !== s.toLocaleUpperCase("tr-TR"))
        return r.replace(/\b([a-z])/g, (m, c) => c.toUpperCase());
    if (s && s === s.toLocaleUpperCase("tr-TR") && s !== s.toLocaleLowerCase("tr-TR"))
        return r.toUpperCase();
    const f = s.charAt(0);
    if (f && f === f.toLocaleUpperCase("tr-TR") && f !== f.toLocaleLowerCase("tr-TR"))
        return r.charAt(0).toUpperCase() + r.slice(1);
    return r;
}
function translateFallbackSync(text) {
    if (!text || !String(text).trim())
        return "";
    const source = String(text).trim();
    const exact = {
        "VIP Makam Takımları": "VIP Executive Office Sets", "ETAJERLİ MASA": "DESK WITH RETURN", "DOLAP": "CABINET", "SEHPA": "COFFEE TABLE", "ÜNİTE": "UNIT", "MASA": "DESK", "ETAJER": "RETURN", "ÇALIŞMA MASASI": "OFFICE DESK",
        "Makam Takımları": "Executive Office Sets", "Personel Takımları": "Staff Office Sets", "Toplantı Masaları": "Meeting Tables", "Workstation": "Workstations", "Loby Koltukları": "Lobby Seating", "Ofis Koltukları": "Office Chairs", "Fileli Koltukları": "Mesh Office Chairs", "Aksesuarlar": "Accessories",
        "Ofis Mobilyaları": "Office Furniture", "Ofis Mobilyası": "Office Furniture", "Yönetici Masası": "Executive Desk", "Yönetici Çalışma Masası": "Executive Office Desk", "Toplantı Masası": "Meeting Table", "Ofis Koltuğu": "Office Chair", "Misafir Koltuğu": "Guest Chair", "Lobi Koltuğu": "Lobby Seating", "Fileli Koltuk": "Mesh Office Chair", "Çalışma Masası": "Office Desk", "Personel Masası": "Staff Desk", "Makam Masası": "Executive Desk", "Dolap": "Cabinet", "Sehpa": "Coffee Table", "Ünite": "Unit", "İNEGÖL ÜRETİM": "İNEGÖL PRODUCTION", "Yeni Ürün": "New Product", "Yeni Kategori": "New Category", "Yeni Parça": "New Part", "Fiyat için iletişime geçin": "Contact us for price"
    };
    if (exact[source])
        return exact[source];
    let s = source;
    const phrases = [
        ["yönetici çalışma masası", "executive office desk"], ["yönetici masası", "executive desk"], ["makam masası", "executive desk"], ["personel masası", "staff desk"], ["çalışma masası", "office desk"], ["toplantı masası", "meeting table"], ["toplantı masaları", "meeting tables"], ["ofis koltuğu", "office chair"], ["ofis koltukları", "office chairs"], ["fileli koltuğu", "mesh office chair"], ["fileli koltuk", "mesh office chair"], ["fileli koltuklar", "mesh office chairs"], ["misafir koltuğu", "guest chair"], ["lobi koltuğu", "lobby seating"], ["loby koltukları", "lobby seating"], ["vip makam takımları", "VIP executive office sets"], ["makam takımları", "executive office sets"], ["personel takımları", "staff office sets"], ["ofis mobilyaları", "office furniture"], ["özel tasarım", "special design"], ["çekmeceli", "with drawers"], ["çekmece", "drawer"], ["kapaklı", "with doors"], ["kapak", "door/panel"], ["ölçüler", "dimensions"], ["ahşap", "wood"], ["ceviz", "walnut"], ["antrasit", "anthracite"], ["siyah", "black"], ["beyaz", "white"], ["krem", "cream"], ["kahverengi", "brown"], ["deri", "leather"], ["kumaş", "fabric"], ["metal", "metal"], ["cam", "glass"], ["modern", "modern"], ["klasik", "classic"], ["premium", "premium"], ["özel", "special"], ["tasarım", "design"], ["yeni ürün", "new product"], ["yeni kategori", "new category"], ["yeni parça", "new part"], ["fiyat için iletişime geçin", "contact us for price"], ["iletişime geçin", "contact us"], ["üretim", "production"], ["ofis", "office"], ["masalar", "desks"], ["masa", "desk"], ["dolaplar", "cabinets"], ["dolap", "cabinet"], ["sehpalar", "coffee tables"], ["sehpa", "coffee table"], ["üniteler", "units"], ["ünite", "unit"], ["etajerli masa", "desk with return"], ["etajerlı masa", "desk with return"], ["etajer", "return"], ["adet", "pieces"], ["ve", "and"], ["ile", "with"]
    ];
    phrases.forEach(([a, b]) => { const esc = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); let re; try {
        re = new RegExp("(^|[^\\p{L}\\p{N}])(" + esc + ")(?=$|[^\\p{L}\\p{N}])", "giu");
    }
    catch (_) {
        re = new RegExp("(^|[\\s.,;:!?()\\-/])(" + esc + ")(?=$|[\\s.,;:!?()\\-/])", "gi");
    } s = s.replace(re, (m, pre, word) => pre + pdfMatchCase(word, b)); });
    s = s.replace(/\b(\d+)\s*çekmeceli\b/gi, "$1-drawer");
    s = s.replace(/(\d+)\s*kişilik/gi, "$1 seats");
    s = s.replace(/\b(\d+)\s*adet\b/gi, "$1 pieces");
    return s;
}
function getText(lang, tr, en, fallback) {
    if (lang !== "EN")
        return tr || "";
    const source = String(fallback || tr || "").trim();
    const translated = String(en || "").trim();
    // Never allow generic placeholders to mask a real product/category/part name.
    const placeholderPairs = {
        "Yeni Ürün": "New Product",
        "Yeni Parça": "New Part",
        "Yeni Kategori": "New Category",
        "New Product": "New Product",
        "New Part": "New Part",
        "New Category": "New Category"
    };
    const genericEnglishPlaceholders = new Set(["new product", "new part", "new category"]);
    const isGenericPlaceholder = genericEnglishPlaceholders.has(translated.toLocaleLowerCase("en-US")) &&
        !genericEnglishPlaceholders.has(source.toLocaleLowerCase("en-US"));
    if (translated && translated !== source && !isGenericPlaceholder)
        return translated;
    // If the Turkish source itself is only the system placeholder, its normal EN label is correct.
    if (source && placeholderPairs[source] && translated === placeholderPairs[source])
        return translated;
    /* Kayıtlı İngilizce yoksa sözlükle anında çevir; sonuç yarı Türkçe kalıyorsa karışık metin yerine orijinali göster. */
    const quick = translateFallbackSync(source);
    return /[çğıöşüİÇĞÖŞÜ]/.test(quick) ? source : quick;
}
function preserveTechnicalTokens(source, target) {
    if (!source || !target)
        return target;
    const tokens = source.match(/\b(?:\d+(?:[.,]\d+)?\s*(?:mm|cm|m|kg|g|°|%|TL|USD|EUR)?|\d+\s*[x×]\s*\d+(?:\s*[x×]\s*\d+)?(?:\s*(?:cm|mm|m))?)\b/gi) || [];
    let out = target;
    tokens.forEach(tok => {
        if (!out.toLowerCase().includes(tok.toLowerCase())) {
            /* Do not inject aggressively; source technical data remains separately stored. */
        }
    });
    return out;
}
/*
  Frontend-first AI:
  1) Browser Prompt API if available.
  2) Built-in professional dictionary for furniture/catalog phrases.
  3) Safe fallback to Turkish.
  No secret API key is embedded.
*/
/* Çeviri yardımcıları: hiçbir adım sonsuza kadar takılı kalmaz. */
function trTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("timeout")), ms);
        Promise.resolve(promise).then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
    });
}
/* Bozuk çeviri: kaynak metinden anormal uzun, markdown (**, ##) içeren veya satır sayısı uyuşmayan çıktı
   (ör. tek kelimelik ürün adı için model "makale" yazmış). Bunlar kabul edilmez, kayıtlıysa yeniden çevrilir. */
function trBadEn(tr, en) {
    tr = String(tr ?? "").trim();
    en = String(en ?? "").trim();
    if (!tr || !en)
        return false;
    if (en.length > tr.length * 3 + 40)
        return true;
    if (/\*\*|^#{1,6}\s|^\s*[*-]\s+\S/m.test(en) && !/\*\*|^#{1,6}\s/m.test(tr))
        return true;
    if (!/\n/.test(tr) && /\n/.test(en))
        return true;
    return false;
}
/* Cihaz içi dil modeli bazen yorum ekler ("Elbette, işte çeviri:" gibi); makul uzunlukta tek parça çıktıyı kabul et. */
function trSaneOutput(source, out) {
    const o = String(out || "").trim();
    return !!o && o.length <= source.length * 3 + 40 && (/\n/.test(source) || !/\n/.test(o));
}
/* Çeviri servisi dakikada 60 istekle sınırlı: bütçe dolmaya yakınsa pencere yenilenene kadar bekler (hata vermez). */
async function trWaitBudget() {
    for (let i = 0; i < 70; i++) {
        const st = rateState.get("translation");
        if (!st || Date.now() - st.startedAt >= 60000 || st.count < 52)
            return;
        await new Promise(r => setTimeout(r, 1000));
    }
}
async function aiTranslateResult(text, type = "general") {
    if (!text || !text.trim())
        return { text: "", good: false };
    const source = text.trim();
    /* 0) Chrome'un cihaz içi Translator API'si: ağ trafiği yok, anında. Model yüklüyse kullanılır. */
    try {
        if (window.Translator && typeof window.Translator.create === "function" && typeof window.Translator.availability === "function") {
            const av = await trTimeout(window.Translator.availability({ sourceLanguage: "tr", targetLanguage: "en" }), 3000);
            if (av === "available") {
                window.__ofTranslator = window.__ofTranslator || await trTimeout(window.Translator.create({ sourceLanguage: "tr", targetLanguage: "en" }), 6000);
                const out = await trTimeout(window.__ofTranslator.translate(source), 8000);
                if (out && out.trim())
                    return { text: out.trim(), good: true };
            }
        }
    }
    catch (e) {
        console.warn("On-device Translator unavailable:", e);
    }
    /* deterministic professional catalog fallback */
    const exact = {
        "VIP Makam Takımları": "VIP Executive Office Sets",
        "ETAJERLİ MASA": "DESK WITH RETURN",
        "DOLAP": "CABINET",
        "SEHPA": "COFFEE TABLE",
        "ÜNİTE": "UNIT",
        "MASA": "DESK",
        "ETAJER": "RETURN",
        "ÇALIŞMA MASASI": "OFFICE DESK",
        "Makam Takımları": "Executive Office Sets",
        "Personel Takımları": "Staff Office Sets",
        "Toplantı Masaları": "Meeting Tables",
        "Workstation": "Workstations",
        "Loby Koltukları": "Lobby Seating",
        "Ofis Koltukları": "Office Chairs",
        "Fileli Koltuklar": "Mesh Office Chairs",
        "Aksesuarlar": "Accessories",
        "Ofis Mobilyaları": "Office Furniture",
        "Ofis Mobilyası": "Office Furniture",
        "Yönetici Masası": "Executive Desk",
        "Yönetici Çalışma Masası": "Executive Office Desk",
        "Toplantı Masası": "Meeting Table",
        "Ofis Koltuğu": "Office Chair",
        "Misafir Koltuğu": "Guest Chair",
        "Lobi Koltuğu": "Lobby Seating",
        "Fileli Koltuk": "Mesh Office Chair",
        "Çalışma Masası": "Office Desk",
        "Personel Masası": "Staff Desk",
        "Makam Masası": "Executive Desk",
        "Dolap": "Cabinet",
        "Sehpa": "Coffee Table",
        "Ünite": "Unit",
        "İNEGÖL ÜRETİM": "İNEGÖL PRODUCTION",
        "Yeni Ürün": "New Product",
        "Yeni Kategori": "New Category",
        "Yeni Parça": "New Part",
        "Fiyat için iletişime geçin": "Contact us for price"
    };
    if (exact[source])
        return { text: exact[source], good: true };
    /* Network translation fallback. No API key is required. If the service is unavailable,
       the deterministic professional catalog dictionary below is used. */
    try {
        const translationSource = safeText(source, SECURITY_LIMITS.text);
        await enforceClientRateLimit("translation", 60, 60 * 1000);
        const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=tr&tl=en&dt=t&q=" + encodeURIComponent(translationSource);
        const ctl = typeof AbortController === "function" ? new AbortController() : null, abortTimer = setTimeout(() => ctl && ctl.abort(), 10000);
        let response;
        try {
            response = await fetch(url, { method: "GET", headers: { Accept: "application/json" }, cache: "force-cache", signal: ctl ? ctl.signal : undefined });
        }
        finally {
            clearTimeout(abortTimer);
        }
        if (response.ok) {
            const json = await response.json();
            const translated = Array.isArray(json?.[0]) ? json[0].map(x => Array.isArray(x) ? x[0] : "").join("").trim() : "";
            if (translated)
                return { text: preserveTechnicalTokens(source, translated), good: true };
        }
    }
    catch (e) {
        console.warn("Online translation unavailable:", e);
    }
    /*
      Phrase-level fallback. It intentionally leaves unknown text in Turkish
      rather than inventing a bad translation. Browser AI is used first when supported.
    */
    let s = source;
    const phrases = [
        ["yönetici çalışma masası", "executive office desk"],
        ["yönetici masası", "executive desk"],
        ["makam masası", "executive desk"],
        ["personel masası", "staff desk"],
        ["çalışma masası", "office desk"],
        ["toplantı masası", "meeting table"],
        ["toplantı masaları", "meeting tables"],
        ["ofis koltuğu", "office chair"],
        ["ofis koltukları", "office chairs"],
        ["fileli koltuk", "mesh office chair"],
        ["fileli koltuklar", "mesh office chairs"],
        ["misafir koltuğu", "guest chair"],
        ["lobi koltuğu", "lobby seating"],
        ["loby koltukları", "lobby seating"],
        ["vip makam takımları", "VIP executive office sets"],
        ["makam takımları", "executive office sets"],
        ["personel takımları", "staff office sets"],
        ["ofis mobilyaları", "office furniture"],
        ["özel tasarım", "special design"],
        ["çekmeceli", "with drawers"],
        ["çekmece", "drawer"],
        ["kapaklı", "with doors"],
        ["kapak", "door/panel"],
        ["ölçüler", "dimensions"],
        ["ahşap", "wood"],
        ["ceviz", "walnut"],
        ["antrasit", "anthracite"],
        ["siyah", "black"],
        ["beyaz", "white"],
        ["krem", "cream"],
        ["kahverengi", "brown"],
        ["deri", "leather"],
        ["kumaş", "fabric"],
        ["metal", "metal"],
        ["cam", "glass"],
        ["modern", "modern"],
        ["klasik", "classic"],
        ["premium", "premium"],
        ["özel", "special"],
        ["tasarım", "design"],
        ["yeni ürün", "new product"],
        ["yeni kategori", "new category"],
        ["yeni parça", "new part"],
        ["fiyat için iletişime geçin", "contact us for price"],
        ["iletişime geçin", "contact us"],
        ["üretim", "production"],
        ["ofis", "office"],
        ["masa", "desk"],
        ["masalar", "desks"],
        ["dolap", "cabinet"],
        ["dolaplar", "cabinets"],
        ["sehpa", "coffee table"],
        ["sehpalar", "coffee tables"],
        ["ünite", "unit"],
        ["üniteler", "units"],
        ["etajerli masa", "desk with return"],
        ["etajerlı masa", "desk with return"],
        ["etajer", "return"],
        ["adet", "pieces"],
        ["ve", "and"],
        ["ile", "with"]
    ];
    phrases.forEach(([a, b]) => { const esc = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); let re; try {
        re = new RegExp("(^|[^\\p{L}\\p{N}])(" + esc + ")(?=$|[^\\p{L}\\p{N}])", "giu");
    }
    catch (_) {
        re = new RegExp("(^|[\\s.,;:!?()\\-/])(" + esc + ")(?=$|[\\s.,;:!?()\\-/])", "gi");
    } s = s.replace(re, (m, pre, word) => pre + pdfMatchCase(word, b)); });
    s = s.replace(/\b(\d+)\s*çekmeceli\b/gi, "$1-drawer");
    s = s.replace(/(\d+)\s*kişilik/gi, "$1 seats");
    s = s.replace(/\b(\d+)\s*adet\b/gi, "$1 pieces");
    return { text: s === source ? source : preserveTechnicalTokens(source, s), good: false };
}
/* Bekleyen çeviriler: yalnızca düzenlenen / eklenen alanların anahtarı tutulur. Çeviri başarısız olursa (çevrimdışı vb.)
   anahtar kuyrukta kalır ve bağlantı gelince SADECE bunlar yeniden denenir; tüm site asla taranmaz. */
const TR_PENDING_KEY = "ofischi_tr_pending_v1";
function trPendingLoad() { try {
    const a = JSON.parse(lsGet(TR_PENDING_KEY) || "[]");
    return new Set(Array.isArray(a) ? a.filter(x => typeof x === "string").slice(0, 3000) : []);
}
catch (_) {
    return new Set();
} }
function trPendingSave(set) { try {
    if (set.size)
        lsSet(TR_PENDING_KEY, JSON.stringify([...set].slice(0, 3000)));
    else
        lsRemove(TR_PENDING_KEY);
}
catch (_) { } }
function trPendingAdd(k) { const p = trPendingLoad(); if (!p.has(k)) {
    p.add(k);
    trPendingSave(p);
} }
function trPendingRemove(keys) { const p = trPendingLoad(); let ch = false; for (const k of keys)
    if (p.delete(k))
        ch = true; if (ch)
    trPendingSave(p); }
/* Çevirisi EKSİK alanları bulur (yalnızca bunlar çevrilir; çevrilmiş olanlara dokunulmaz, ağa istek gitmez).
   Dönen anahtarlar bekleyen-çeviri kuyruğu biçimindedir. */
function trDecide(tr, en, src, isName) {
    tr = String(tr ?? "").trim();
    en = String(en ?? "").trim();
    if (!tr)
        return "none";
    if (trBadEn(tr, en))
        return "translate";
    if (src === tr)
        return "none";
    if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(tr) || (isName && /^[^\s]+$/.test(tr) && tr === tr.toLocaleUpperCase("tr-TR")))
        return "none";
    const hasEn = !!en && en !== tr && en !== translateFallbackSync(tr) && !/^(new product|new part|new category)$/i.test(en);
    return hasEn ? "none" : "translate";
}
/* Çevirisi kaynakla aynı çıkan (marka adı gibi) genel/kategori metinleri tekrar "eksik" sayılmasın. */
const TR_SAME_KEY = "ofischi_tr_same_v1";
function trSameSet() { try {
    const a = JSON.parse(lsGet(TR_SAME_KEY) || "[]");
    return new Set(Array.isArray(a) ? a.filter(x => typeof x === "string") : []);
}
catch (_) {
    return new Set();
} }
function trSameAdd(k) { try {
    const set = trSameSet();
    set.add(k);
    lsSet(TR_SAME_KEY, JSON.stringify([...set].slice(-1000)));
}
catch (_) { } }
function trMissingKeys(data, onlyBad = false) {
    const same = trSameSet(), single = tr => !/\s/.test(tr) && tr === tr.toLocaleUpperCase("tr-TR");
    const keys = [];
    if (!data)
        return keys;
    for (const f of ["siteName", "subtitle", "eyebrow"]) {
        const tr = String(data[f] ?? "").trim(), en = String(data[f + "_en"] ?? "").trim();
        if (trBadEn(tr, en)) {
            keys.push("general|" + f);
            continue;
        }
        if (!onlyBad && tr && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(tr) && (!en || (en === tr && !same.has("general|" + f + "|" + tr))) && !(single(tr) && en === tr))
            keys.push("general|" + f);
    }
    for (const c of (data.categories || [])) {
        const tr = String(c.name ?? "").trim(), en = String(c.name_en ?? "").trim();
        if (trBadEn(tr, en))
            keys.push("cat|" + c.id);
        else if (!onlyBad && tr && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(tr) && (!en || /^new category$/i.test(en) || (en === tr && !same.has("cat|" + c.id + "|" + tr))) && !(single(tr) && en === tr))
            keys.push("cat|" + c.id);
        for (const it of (c.items || [])) {
            const want = (tr, en, src, isName) => onlyBad ? trBadEn(tr, en) : trDecide(tr, en, src, isName) === "translate";
            if (want(it.name, it.name_en, it.name_src, true))
                keys.push("item|" + c.id + "|" + it.id + "|name");
            if (want(it.desc, it.desc_en, it.desc_src, false))
                keys.push("item|" + c.id + "|" + it.id + "|desc");
            for (const part of normalizePrice(it.price).parts)
                if (want(part.name, part.name_en, part.name_src, false))
                    keys.push("part|" + c.id + "|" + it.id + "|" + part.id);
        }
    }
    return keys;
}
async function aiTranslateText(text, type = "general") { return (await aiTranslateResult(text, type)).text; }
/* Çakışmasız önbellek anahtarı: metnin tamamının 2 x 32-bit karması + uzunluk (önceki btoa kısaltması uzun metinlerde çakışabiliyordu). */
function cacheKey(text, type = "general") {
    const str = type + "::" + text;
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return "ofischi_tr_en_v4_" + type + "_" + str.length.toString(36) + "_" + (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
}
async function translateCachedResult(text, type) {
    if (!text || !text.trim())
        return { text: "", good: false };
    const source = String(text).trim();
    const key = cacheKey(source, type);
    const genericPlaceholders = new Set(["new product", "new part", "new category"]);
    const isBadPlaceholder = (value) => {
        const v = String(value || "").trim().toLocaleLowerCase("en-US");
        const tr = source.toLocaleLowerCase("tr-TR");
        return genericPlaceholders.has(v) && !genericPlaceholders.has(tr) && !["yeni ürün", "yeni parça", "yeni kategori"].includes(tr);
    };
    try {
        const cached = lsGet(key);
        if (cached && cached.trim() !== source && !isBadPlaceholder(cached) && !trBadEn(source, cached))
            return { text: cached.trim(), good: true };
    }
    catch (e) { }
    const ai = await aiTranslateResult(source, type), result = ai.text;
    const resultBad = trBadEn(source, result);
    const good = ai.good && !!result && !isBadPlaceholder(result) && !resultBad;
    const finalResult = (result && result.trim() !== source && !isBadPlaceholder(result) && !resultBad) ? result.trim() : translateFallbackSync(source);
    /* Yalnızca gerçek çeviriler önbelleğe alınır; kaba sözlük yedeği kalıcı hale gelmez. */
    if (good && finalResult && finalResult.trim() !== source && !isBadPlaceholder(finalResult)) {
        lsSet(key, finalResult);
    }
    return { text: finalResult || source, good };
}
async function translateCached(text, type) { return (await translateCachedResult(text, type)).text; }
async function translateProduct(item, setStatus) {
    const copy = { ...item };
    copy.name_en = await translateCached(item.name, "product_name", setStatus);
    copy.desc_en = await translateCached(item.desc, "product_description", setStatus);
    copy.dims_en = item.dims; // dimensions must never be altered
    copy.price = normalizePrice(item.price);
    for (const part of copy.price.parts) {
        part.name_en = await translateCached(part.name, "price_part", setStatus);
        part.dims_en = part.dims || "";
    }
    return copy;
}
