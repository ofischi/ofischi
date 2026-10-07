/* ==================== KATALOG PDF (FİYATSIZ) ==================== */
function pdfHexToRgb(hex, fallback = [0.79, 0.64, 0.15]) {
    const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(hex || "").trim());
    if (!m)
        return fallback;
    let h = m[1];
    if (h.length === 3)
        h = h.split("").map(c => c + c).join("");
    return [0, 2, 4].map(i => Math.round(parseInt(h.slice(i, i + 2), 16) / 255 * 1000) / 1000);
}
function pdfCatalogAccent(data) { return pdfHexToRgb(data?.theme?.accent); }
function pdfItemImages(item) {
    const list = [], add = v => { const s = pdfImageSource(v); if (s && !list.includes(s))
        list.push(s); };
    add(item?.image);
    (Array.isArray(item?.images) ? item.images : []).forEach(add);
    return list;
}
function pdfCatalogRows(item, lang) {
    const p = normalizePrice(item?.price);
    if (p.parts.length)
        return p.parts.map(part => ({ name: pdfText(lang, part.name, part.name_en, part.name) || "—", dims: part.dims || "" }));
    const d = String(item?.dims || "").trim();
    return d ? [{ name: pdfText(lang, item.name, item.name_en, item.name) || "—", dims: d }] : [];
}
function pdfDimsLabel(v) {
    const s = pdfCleanDims(v);
    if (s === "—")
        return "—";
    const n = s.match(/\d+(?:[.,]\d+)?/g) || [];
    if ((n.length === 3 || n.length === 2) && /^[\d\s.,x×X*\/cmCM\-]+$/.test(s))
        return n.join(" × ");
    return s;
}
function pdfPageImages() {
    const map = new Map();
    let next = 1;
    return { map, use(key, asset) { if (!key || !asset)
            return null; if (map.has(key))
            return map.get(key); const a = { ...asset, id: next++ }; map.set(key, a); return a; } };
}
function pdfImageBox(asset, x, y, w, h, lang, bg = [0.955, 0.953, 0.945]) {
    let c = pdfRect(x, y, w, h, bg);
    if (asset)
        c += pdfDrawImage("Im" + asset.id, asset, x + 5, y + 5, w - 10, h - 10, true);
    else
        c += pdfTextOp(lang === "EN" ? "NO PRODUCT IMAGE" : "ÜRÜN GÖRSELİ YOK", x + w / 2, y + h / 2 - 3, 8, { align: "center", bold: true, color: [0.6, 0.6, 0.6], maxWidth: w - 10 });
    return c;
}
/* Modern şablonların ortak sayfa çerçevesi: üstte marka + kategori, altta web sitesi + sayfa no. */
function pdfCatalogChrome(data, pageNo, lang, label) {
    const L = PDF_LAYOUT, W = L.W, H = L.H, acc = pdfCatalogAccent(data);
    /* Fiyat listesiyle aynı yan şerit (koyu zemin, dikey site adı, sayfa numarası) + üstte marka ve vurgu çizgisi. */
    let c = pdfRect(0, 0, W, H, [1, 1, 1]) + pdfPageChrome(data, pageNo);
    c += pdfRect(36, H - 33, 26, 2.4, acc);
    c += pdfTextOp(String(data.siteName || "").toUpperCase(), 68, H - 35, 7.5, { bold: true, maxWidth: 230, maxLines: 1, color: [0.3, 0.3, 0.3] });
    if (label)
        c += pdfTextOp(label, W - 36, H - 35, 7.5, { align: "right", maxWidth: 250, maxLines: 1, color: [0.45, 0.45, 0.45] });
    return c;
}
/* Modül / ölçü tablosu (fiyatsız). Sığmayan kalemler "+n kalem daha" satırıyla özetlenir. */
function pdfDimsTable(rows, lang, x, yTop, w, maxH, acc, { rowH = 15, fs = 8.6, nameRatio = .6 } = {}) {
    const headH = 16;
    if (!rows.length || maxH < headH + rowH)
        return { content: "", height: 0 };
    const maxRows = Math.max(1, Math.floor((maxH - headH) / rowH));
    let list = rows;
    if (rows.length > maxRows) {
        const hidden = rows.length - (maxRows - 1);
        list = [...rows.slice(0, maxRows - 1), { name: lang === "EN" ? `+${hidden} more items` : `+${hidden} kalem daha`, more: true }];
    }
    const nameW = w * nameRatio;
    let c = "";
    const top = yTop - headH;
    c += pdfRect(x, top, w, headH, [0.08, 0.08, 0.08]);
    c += pdfTextOp(lang === "EN" ? "MODULE" : "MODÜL", x + 6, top + 5.2, 7.4, { bold: true, color: [1, 1, 1], maxWidth: nameW - 8, maxLines: 1 });
    c += pdfTextOp(lang === "EN" ? "W × D × H (cm)" : "G × D × Y (cm)", x + w - 6, top + 5.2, 7.4, { align: "right", bold: true, color: [1, 1, 1], maxWidth: w - nameW - 8, maxLines: 1 });
    list.forEach((r, i) => {
        const ry = top - (i + 1) * rowH;
        if (i % 2 === 1)
            c += pdfRect(x, ry, w, rowH, [0.965, 0.963, 0.958]);
        const cy = ry + rowH / 2 - fs * 0.34;
        c += pdfTextOp(r.name, x + 6, cy, fs, { bold: !r.more, maxWidth: r.more ? w - 12 : nameW - 10, maxLines: 1, color: r.more ? [0.42, 0.42, 0.42] : [0.1, 0.1, 0.1] });
        if (!r.more)
            c += pdfTextOp(pdfDimsLabel(r.dims), x + w - 6, cy, fs, { align: "right", maxWidth: w - nameW - 8, maxLines: 1, color: [0.18, 0.18, 0.18] });
    });
    const h = headH + list.length * rowH;
    c += pdfLine(x, yTop - h, x + w, yTop - h, acc, .9);
    return { content: c, height: h };
}
/* --- Şablon 1: KLASİK LİSTE (fiyat listesi düzeni, fiyat sütunları yerine ölçüler + açıklama) --- */
function pdfCatalogCardHeight(item) {
    const L = PDF_LAYOUT, rows = Math.max(1, pdfVisibleRows(item, "TR").length), hasDesc = !!pdfDescText("TR", item);
    const need = Math.ceil(PDF_TBL.headTop + rows * PDF_ROW_MIN_H + (hasDesc ? 24 : 0) + PDF_TBL.pad);
    return Math.min(L.H - L.top - L.bottom - L.categoryH - L.gap, Math.max(L.cardH, need));
}
function pdfCatalogListBlock(data, category, item, lang, x, y, w, h, asset, id) {
    const T = PDF_TBL, acc = pdfCatalogAccent(data), right = x + w - 12;
    let { c, tx, top } = pdfTblFrame(item, lang, x, y, w, h, asset, id, acc, right);
    const dimW = 132, third = dimW / 3, dx = right - dimW, modW = dx - tx - 6, capY = top - 31;
    c += pdfTblCaption(lang === "EN" ? "MODULE" : "MODÜL", tx, capY, "left");
    ["G/W", "D/D", "Y/H"].forEach((t, j) => { c += pdfTblCaption(t, dx + third * (j + .5), capY, "center"); });
    const desc = pdfDescText(lang, item), descH = desc ? 24 : 0;
    const rows = pdfVisibleRows(item, lang), rowsTop = top - T.headTop, rowH = Math.min(15.5, (rowsTop - (y + T.pad + descH)) / Math.max(rows.length, 1));
    for (let i = 0; i < rows.length; i++) {
        const rt = rowsTop - i * rowH, rb = rt - rowH, part = rows[i] || {};
        if (i % 2 === 0)
            c += pdfRoundRect(tx - 4, rb + .8, right - tx + 8, rowH - 1.6, 3, [0.972, 0.969, 0.962]);
        const fs = Math.min(8.8, Math.max(7, rowH * 0.6)), cy = rb + rowH / 2 - fs * 0.34;
        const mod = pdfText(lang, part.name, part.name_en, part.name) || "—";
        if (part.__more) {
            c += pdfTextOp(mod, tx, cy, fs, { bold: true, maxWidth: right - tx, maxLines: 1, color: [0.45, 0.45, 0.45] });
            continue;
        }
        c += pdfTextOp(mod, tx, cy, fs, { bold: true, maxWidth: modW, maxLines: 1, color: [0.1, 0.1, 0.1] });
        pdfDimsParts(part.dims).forEach((v, j) => { c += pdfTextOp(v, dx + third * (j + .5), cy, fs, { align: "center", bold: true, maxWidth: third - 2, maxLines: 1, color: [0.2, 0.2, 0.2] }); });
    }
    if (desc)
        c += pdfTextOp(desc, tx, y + T.pad + descH - 10, 7.6, { maxWidth: right - tx, maxLines: 2, leading: 9.4, color: [0.4, 0.4, 0.4] });
    return c;
}
/* --- Şablon 2: VİTRİN (her ürün tek sayfa) --- */
function pdfDimsTableHeight(rows, maxRowsH, rowH = 15) { return rows.length ? 16 + Math.min(rows.length, Math.max(1, Math.floor(maxRowsH / rowH))) * rowH : 0; }
function pdfRenderVitrinPage(data, lang, category, item, pageNo, assets) {
    const L = PDF_LAYOUT, W = L.W, H = L.H, acc = pdfCatalogAccent(data), X = 36, CW = W - 72, reg = pdfPageImages();
    const catName = pdfText(lang, category.name, category.name_en, category.name) || "";
    let c = pdfCatalogChrome(data, pageNo, lang, catName), y = H - 66;
    c += pdfTextOp(catName.toLocaleUpperCase(lang === "EN" ? "en-US" : "tr-TR"), X, y, 8.5, { bold: true, color: acc, maxWidth: CW, maxLines: 1 });
    y -= 27;
    const name = pdfText(lang, item.name, item.name_en, item.name) || "—", nl = pdfWrapText(name, CW, 21, 2).length;
    c += pdfTextOp(name, X, y, 21, { bold: true, maxWidth: CW, maxLines: 2, leading: 24, color: [0.07, 0.07, 0.07] });
    y -= (nl - 1) * 24 + 16;
    const imgs = pdfItemImages(item), extra = imgs.slice(1).filter(src => assets.get(src)).slice(0, 4);
    const descTxt = pdfDescText(lang, item), descH = descTxt ? pdfWrapText(descTxt, CW, 9.5, 4).length * 13.5 + 14 : 0;
    const rowsList = pdfCatalogRows(item, lang), tableH = pdfDimsTableHeight(rowsList, 10 * 15);
    /* Ana görsel, açıklama ve ölçü tablosundan kalan alanı doldurur (boş sayfa altı kalmaz). */
    const free = (y - 48) - (extra.length ? 64 + 16 : 8) - 8 - descH - tableH - 6;
    const imgH = Math.max(260, Math.min(500, free));
    c += pdfImageBox(reg.use(imgs[0], assets.get(imgs[0])), X, y - imgH, CW, imgH, lang);
    y -= imgH + 8;
    if (extra.length) {
        const n = 4, tw = (CW - 8 * (n - 1)) / n;
        extra.forEach((src, i) => { c += pdfImageBox(reg.use(src, assets.get(src)), X + i * (tw + 8), y - 64, tw, 64, lang); });
        y -= 64 + 16;
    }
    else
        y -= 8;
    const desc = pdfDescText(lang, item);
    if (desc) {
        const lines = pdfWrapText(desc, CW, 9.5, 4).length;
        c += pdfTextOp(desc, X, y - 9.5, 9.5, { maxWidth: CW, maxLines: 4, leading: 13.5, color: [0.25, 0.25, 0.25] });
        y -= lines * 13.5 + 14;
    }
    const t = pdfDimsTable(pdfCatalogRows(item, lang), lang, X, y, CW, y - 48, acc);
    c += t.content;
    return { content: c, images: reg.map, pageNo };
}
/* VİTRİN İKİLİ: sayfa başına 2 model (oturma grupları) — her yarıda ad, büyük görsel, açıklama ve ölçü tablosu */
function pdfRenderVitrinDuoPage(data, lang, category, items, pageNo, assets) {
    const L = PDF_LAYOUT, W = L.W, H = L.H, acc = pdfCatalogAccent(data), X = 36, CW = W - 72, reg = pdfPageImages();
    const catName = pdfText(lang, category.name, category.name_en, category.name) || "";
    let c = pdfCatalogChrome(data, pageNo, lang, catName);
    c += pdfTextOp(catName.toLocaleUpperCase(lang === "EN" ? "en-US" : "tr-TR"), X, H - 66, 8.5, { bold: true, color: acc, maxWidth: CW, maxLines: 1 });
    const areaTop = H - 80, areaBottom = 48, gap = 26, slotH = (areaTop - areaBottom - gap) / 2;
    items.forEach((item, i) => {
        const top = areaTop - i * (slotH + gap), bottom = top - slotH;
        const name = pdfText(lang, item.name, item.name_en, item.name) || "—";
        c += pdfTextOp(name, X, top - 18, 17, { bold: true, maxWidth: CW, maxLines: 1, color: [0.07, 0.07, 0.07] });
        c += pdfRect(X, top - 27, 24, 1.8, acc);
        const desc = pdfDescText(lang, item), dl = desc ? pdfWrapText(desc, CW, 9, 2).length : 0, descH = dl ? dl * 12.5 + 6 : 0;
        const rows = pdfCatalogRows(item, lang), tableH = pdfDimsTableHeight(rows, 4 * 14, 14);
        const imgTop = top - 36, imgBottom = bottom + tableH + descH + 10;
        const src = pdfItemImages(item)[0];
        c += pdfImageBox(reg.use(src, assets.get(src)), X, imgBottom, CW, imgTop - imgBottom, lang);
        let y = imgBottom - 8;
        if (desc) {
            c += pdfTextOp(desc, X, y - 9, 9, { maxWidth: CW, maxLines: 2, leading: 12.5, color: [0.28, 0.28, 0.28] });
            y -= descH;
        }
        c += pdfDimsTable(rows, lang, X, y, CW, y - bottom, acc, { rowH: 14, fs: 8.4, nameRatio: .55 }).content;
        if (i === 0 && items.length > 1)
            c += pdfLine(X, bottom - gap / 2, X + CW, bottom - gap / 2, [0.86, 0.86, 0.86], .5);
    });
    return { content: c, images: reg.map, pageNo };
}
/* Izgara ve Dergi sayfalarının kategori başlığı */
function pdfCatalogSectionHeader(data, lang, category, cont, X, CW) {
    const L = PDF_LAYOUT, H = L.H, acc = pdfCatalogAccent(data);
    const name = pdfText(lang, category.name, category.name_en, category.name) || "";
    return pdfCategoryBar((name + (cont ? (lang === "EN" ? "  (continued)" : "  (devam)") : "")).toUpperCase(), X, H - 84, CW, 22, 12.5);
}
/* --- Şablon 3: IZGARA (sayfa başına 6 kart) --- */
function pdfRenderIzgaraPage(data, lang, category, items, pageNo, assets, cont) {
    const L = PDF_LAYOUT, W = L.W, H = L.H, acc = pdfCatalogAccent(data), X = 36, CW = W - 72, reg = pdfPageImages();
    const catName = pdfText(lang, category.name, category.name_en, category.name) || "";
    let c = pdfCatalogChrome(data, pageNo, lang, catName) + pdfCatalogSectionHeader(data, lang, category, cont, X, CW);
    const gap = 14, cols = 2, rowsN = 3, areaTop = H - 94, areaBottom = 46, cardW = (CW - gap) / cols, cardH = (areaTop - areaBottom - gap * (rowsN - 1)) / rowsN;
    items.forEach((item, i) => {
        const col = i % cols, row = Math.floor(i / cols), x = X + col * (cardW + gap), top = areaTop - row * (cardH + gap), y = top - cardH;
        c += pdfRect(x, y, cardW, cardH, [1, 1, 1], [0.86, 0.86, 0.86], .6);
        const imgH = cardH * 0.56, src = pdfItemImages(item)[0];
        c += pdfImageBox(reg.use(src, assets.get(src)), x + 1, top - 1 - imgH, cardW - 2, imgH, lang);
        c += pdfRect(x + 10, top - imgH - 8, 18, 1.8, acc);
        let ty = top - imgH - 22;
        const name = pdfText(lang, item.name, item.name_en, item.name) || "—", nl = pdfWrapText(name, cardW - 20, 10.5, 2).length;
        c += pdfTextOp(name, x + 10, ty, 10.5, { bold: true, maxWidth: cardW - 20, maxLines: 2, leading: 12.5, color: [0.07, 0.07, 0.07] });
        ty -= (nl - 1) * 12.5 + 14;
        const rows = pdfCatalogRows(item, lang);
        let info = "";
        if (rows.length === 1) {
            const dl = pdfDimsLabel(rows[0].dims);
            info = (lang === "EN" ? "Size: " : "Ölçü: ") + dl + (/cm|mm|\bm\b|—/i.test(dl) ? "" : " cm");
        }
        else if (rows.length > 1)
            info = (lang === "EN" ? `${rows.length} modules · ` : `${rows.length} modül · `) + rows.map(r => r.name).join(", ");
        if (info) {
            c += pdfTextOp(info, x + 10, ty, 8.2, { bold: true, maxWidth: cardW - 20, maxLines: 1, color: [0.25, 0.25, 0.25] });
            ty -= 13;
        }
        const desc = pdfDescText(lang, item);
        const room = Math.floor((ty - (y + 8)) / 10.5) + 1;
        if (desc && room > 0)
            c += pdfTextOp(desc, x + 10, ty, 8, { maxWidth: cardW - 20, maxLines: Math.min(3, room), leading: 10.5, color: [0.4, 0.4, 0.4] });
    });
    return { content: c, images: reg.map, pageNo };
}
/* --- Şablon 4: DERGİ (sayfa başına 2 ürün, görseller sırayla sol/sağ) --- */
function pdfRenderDergiPage(data, lang, category, items, startIndex, pageNo, assets, cont) {
    const L = PDF_LAYOUT, W = L.W, H = L.H, acc = pdfCatalogAccent(data), X = 36, CW = W - 72, reg = pdfPageImages();
    const catName = pdfText(lang, category.name, category.name_en, category.name) || "";
    let c = pdfCatalogChrome(data, pageNo, lang, catName) + pdfCatalogSectionHeader(data, lang, category, cont, X, CW);
    const gap = 22, areaTop = H - 96, areaBottom = 46, slotH = (areaTop - areaBottom - gap) / 2, imgW = Math.round(CW * 0.56), textW = CW - imgW - 20;
    items.forEach((item, i) => {
        const idx = startIndex + i, top = areaTop - i * (slotH + gap), y = top - slotH, imageLeft = idx % 2 === 0;
        const ix = imageLeft ? X : X + textW + 20, tx = imageLeft ? X + imgW + 20 : X, src = pdfItemImages(item)[0];
        c += pdfImageBox(reg.use(src, assets.get(src)), ix, y, imgW, slotH, lang);
        let ty = top - 24;
        ty -= 4;
        const name = pdfText(lang, item.name, item.name_en, item.name) || "—", nl = pdfWrapText(name, textW, 14.5, 3).length;
        c += pdfTextOp(name, tx, ty, 14.5, { bold: true, maxWidth: textW, maxLines: 3, leading: 17.5, color: [0.07, 0.07, 0.07] });
        ty -= (nl - 1) * 17.5 + 12;
        c += pdfRect(tx, ty, 24, 1.8, acc);
        ty -= 16;
        const desc = pdfDescText(lang, item);
        if (desc) {
            const lines = pdfWrapText(desc, textW, 9, 7).length;
            c += pdfTextOp(desc, tx, ty, 9, { maxWidth: textW, maxLines: 7, leading: 12.5, color: [0.28, 0.28, 0.28] });
            ty -= (lines - 1) * 12.5 + 20;
        }
        const t = pdfDimsTable(pdfCatalogRows(item, lang), lang, tx, ty + 6, textW, ty + 6 - (y + 2), acc, { rowH: 14, fs: 8, nameRatio: .55 });
        c += t.content;
        if (i === 0 && items.length > 1)
            c += pdfLine(X, y - gap / 2, X + CW, y - gap / 2, [0.86, 0.86, 0.86], .5);
    });
    return { content: c, images: reg.map, pageNo };
}
const PDF_CATALOG_TEMPLATES = [
    { id: "klasik", name: "Klasik Liste", desc: "Fiyat listesiyle aynı düzen; fiyat yerine ölçüler ve açıklama. Sayfa başına 7 ürün." },
    { id: "vitrin", name: "Vitrin", desc: "Takımlar (VIP → Personel) her model tek sayfada, oturma grupları sayfa başına 2 model; diğer kategoriler akıllı düzende." },
    { id: "izgara", name: "Izgara", desc: "Sayfa başına 6 ürün kartı. Geniş ürün yelpazesine hızlı göz atma." },
    { id: "dergi", name: "Dergi", desc: "Sayfa başına 2 ürün, görseller sırayla solda ve sağda. Sunum havası." }
];
function pdfCatalogTemplateId(v) { return PDF_CATALOG_TEMPLATES.some(t => t.id === v) ? v : "vitrin"; }
const PDF_VITRIN_FULL_PAGE = new Set(["vip-makam-takimlari", "makam-takimlari", "yonetici-takimlari", "personel-takimlari"]);
const PDF_VITRIN_DUO_PAGE = new Set(["oturma-gruplari"]);
async function pdfPrepareCatalogAssets(data, tpl) {
    const maxFor = { klasik: 1000, vitrin: 1600, izgara: 900, dergi: 1300 }[tpl] || 1000;
    const want = [], size = new Map(), add = (s, m) => { if (!s)
        return; if (!size.has(s))
        want.push(s); size.set(s, Math.max(size.get(s) || 0, m)); };
    for (const c of data.categories || [])
        for (const it of c.items || []) {
            const imgs = pdfItemImages(it);
            if (tpl === "vitrin" && PDF_VITRIN_FULL_PAGE.has(c.id))
                imgs.slice(0, 5).forEach(s => add(s, maxFor));
            else if (tpl === "vitrin" && PDF_VITRIN_DUO_PAGE.has(c.id))
                imgs.slice(0, 1).forEach(s => add(s, 1300));
            else if (tpl === "vitrin") {
                /* Akış düzenindeki kategoriler: ana görsel + model fotoğrafları, daha küçük çözünürlük */
                add(pdfProductImageSource(it, data), 1000);
                imgs.slice(0, 6).forEach(s => add(s, 1000));
                normalizePrice(it.price).parts.forEach(p => add(pdfImageSource(p.image), 1000));
            }
            else
                imgs.slice(0, 1).forEach(s => add(s, maxFor));
        }
    const map = new Map();
    let i = 0;
    /* Aynı anda en fazla 4 görsel işlenir (büyük kataloglarda bellek taşmasın). */
    const worker = async () => { while (i < want.length) {
        const src = want[i++];
        map.set(src, await pdfImageAsset(src, { max: size.get(src), quality: .86 }));
    } };
    await Promise.all(Array.from({ length: Math.min(4, want.length) }, worker));
    return map;
}
async function buildCatalogPDF(rawData, lang, templateId) {
    pdfNoPrice = true;
    try {
        return await pdfBuildCatalogInner(rawData, lang, templateId);
    }
    finally {
        pdfNoPrice = false;
    }
}
async function pdfBuildCatalogInner(rawData, lang, templateId) {
    pdfAccentCurrent = pdfCatalogAccent(normalizeData(rawData));
    const source = normalizeData(rawData), L = lang === "EN" ? "EN" : "TR";
    const tpl = pdfCatalogTemplateId(templateId || source.pdf?.catalogTemplate);
    const data = { ...source, categories: pdfRealCategories(source) };
    const assets = await pdfPrepareCatalogAssets(data, tpl);
    const title = L === "EN" ? "PRODUCT CATALOG" : (String(source.pdf?.catalogTitle || "").trim() || "ÜRÜN KATALOĞU");
    const pages = [await renderPdfCoverPage(data, L, title)];
    if (tpl === "klasik") {
        await pdfFlowPages(data, L, assets, pages, { catalog: true, forceTable: true, cardHeight: pdfCatalogCardHeight });
    }
    else if (tpl === "vitrin") {
        /* VİTRİN: takım kategorileri (VIP → Personel) her model tek sayfa; diğer kategoriler
           fiyat listesindeki akıllı düzenle (ölçü kartları / model sırası / liste), fiyatsız ve sıkışık. */
        let group = [];
        const flushGroup = async () => {
            if (!group.length)
                return;
            await pdfFlowPages({ ...data, categories: group }, L, assets, pages, { catalog: true, cardHeight: pdfCatalogCardHeight });
            group = [];
        };
        for (const category of data.categories) {
            const items = category.items || [];
            if (!items.length)
                continue;
            const duo = PDF_VITRIN_DUO_PAGE.has(category.id);
            if (!duo && !PDF_VITRIN_FULL_PAGE.has(category.id)) {
                group.push(category);
                continue;
            }
            await flushGroup();
            if (data.pdf?.useCategoryCovers)
                pages.push(await renderPdfCategoryCoverPage(data, L, category, pages.length + 1));
            if (duo) {
                for (let i = 0; i < items.length; i += 2)
                    pages.push(pdfRenderVitrinDuoPage(data, L, category, items.slice(i, i + 2), pages.length + 1, assets));
                continue;
            }
            for (const item of items)
                pages.push(pdfRenderVitrinPage(data, L, category, item, pages.length + 1, assets));
        }
        await flushGroup();
    }
    else {
        for (const category of data.categories) {
            const items = category.items || [];
            if (!items.length)
                continue;
            if (data.pdf?.useCategoryCovers)
                pages.push(await renderPdfCategoryCoverPage(data, L, category, pages.length + 1));
            if (tpl === "vitrin") {
                for (const item of items)
                    pages.push(pdfRenderVitrinPage(data, L, category, item, pages.length + 1, assets));
                continue;
            }
            const per = tpl === "izgara" ? 6 : 2;
            for (let i = 0; i < items.length; i += per) {
                const chunk = items.slice(i, i + per);
                pages.push(tpl === "izgara" ? pdfRenderIzgaraPage(data, L, category, chunk, pages.length + 1, assets, i > 0) : pdfRenderDergiPage(data, L, category, chunk, i, pages.length + 1, assets, i > 0));
            }
        }
    }
    return await pdfCreateVectorDocument(pages);
}
function pdfValidateBlobBytes(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length < 32)
        throw new Error("PDF doğrulaması başarısız: dosya boş veya eksik.");
    const ascii = new TextDecoder("latin1").decode(bytes);
    if (!ascii.slice(0, 8).startsWith("%PDF-"))
        throw new Error("PDF doğrulaması başarısız: geçersiz PDF başlığı.");
    if (!ascii.includes("%%EOF"))
        throw new Error("PDF doğrulaması başarısız: PDF düzgün finalize edilmemiş.");
    const pages = ascii.match(/\/Type\s*\/Page(?:\s|\/|>>)/g) || [];
    if (pages.length < 1)
        throw new Error("PDF doğrulaması başarısız: sayfa bulunamadı.");
    const startMatch = ascii.match(/startxref\s+(\d+)\s+%%EOF\s*$/);
    if (!startMatch)
        throw new Error("PDF doğrulaması başarısız: xref/final kayıt bulunamadı.");
    const xrefPos = Number(startMatch[1]);
    if (!Number.isSafeInteger(xrefPos) || xrefPos < 0 || xrefPos >= bytes.length || ascii.slice(xrefPos, xrefPos + 4) !== "xref")
        throw new Error("PDF doğrulaması başarısız: xref tablosu geçersiz.");
    const trailer = ascii.match(/trailer\s*<<[\s\S]*?\/Size\s+(\d+)[\s\S]*?\/Root\s+(\d+)\s+0\s+R[\s\S]*?>>/);
    if (!trailer)
        throw new Error("PDF doğrulaması başarısız: trailer eksik.");
    const size = Number(trailer[1]);
    if (!Number.isSafeInteger(size) || size < 2)
        throw new Error("PDF doğrulaması başarısız: object sayısı geçersiz.");
    return { size, pages: pages.length, bytes: bytes.length, mime: "application/pdf" };
}
let pdfLastPages = null; /* Ön izleme penceresi için son üretilen sayfa içerikleri */
async function pdfCreateVectorDocument(pages) {
    if (!Array.isArray(pages) || pages.length === 0)
        throw new Error("PDF oluşturulamadı: sayfa bulunamadı.");
    pdfLastPages = pages;
    const objs = [];
    const add = b => { objs.push(b); return objs.length; };
    const usedTexts = [];
    for (const p of pages)
        usedTexts.push(p.content);
    const usedGlyphs = pdfCollectUsedGlyphs(usedTexts);
    const fontObj = await pdfMakeFontAndToUnicode(objs, usedGlyphs);
    const pageRefs = [];
    /* Aynı görsel (ör. her kapaktaki logo, tekrar eden ürün fotoğrafı) PDF'e bir kez gömülür, sayfalar onu paylaşır. */
    const sharedImages = new Map();
    for (const page of pages) {
        const imageRefs = [];
        for (const asset of page.images.values()) {
            if (!asset || !asset.data)
                continue;
            let io = sharedImages.get(asset.data);
            if (!io) {
                const bytes = pdfDataUriToBytes(asset.data);
                if (!bytes.length)
                    throw new Error("PDF oluşturulamadı: görsel verisi boş.");
                io = add(pdfConcatBytes([pdfObjBytes(`<< /Type /XObject /Subtype /Image /Width ${asset.width} /Height ${asset.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`), bytes, pdfObjBytes("\nendstream")]));
                sharedImages.set(asset.data, io);
            }
            imageRefs.push({ id: asset.id, obj: io });
        }
        let res = `/ProcSet [/PDF /Text /ImageC] /Font << /F1 ${fontObj} 0 R >>`;
        if (imageRefs.length)
            res += ` /XObject << ${imageRefs.map(r => `/Im${r.id} ${r.obj} 0 R`).join(" ")} >>`;
        const contentBytes = pdfObjBytes(page.content);
        if (!contentBytes.length)
            throw new Error("PDF oluşturulamadı: boş sayfa içeriği.");
        const co = add(pdfConcatBytes([pdfObjBytes(`<< /Length ${contentBytes.length} >>\nstream\n`), contentBytes, pdfObjBytes("\nendstream")]));
        pageRefs.push(add(pdfObjBytes(`<< /Type /Page /Parent PAGESREF /MediaBox [0 0 595.28 841.89] /Resources << ${res} >> /Contents ${co} 0 R >>`)));
    }
    const pagesObj = add(pdfObjBytes(`<< /Type /Pages /Kids [${pageRefs.map(n => n + " 0 R").join(" ")}] /Count ${pageRefs.length} >>`));
    const titleHex = "FEFF" + [..."Ofischi Fiyat Listesi"].map(ch => ch.charCodeAt(0).toString(16).padStart(4, "0")).join("").toUpperCase();
    const info = add(pdfObjBytes(`<< /Producer (Ofischi Premium PDF) /Title <${titleHex}> >>`));
    const catalog = add(pdfObjBytes(`<< /Type /Catalog /Pages ${pagesObj} 0 R /PageMode /UseNone /ViewerPreferences << /DisplayDocTitle false >> >>`));
    for (const n of pageRefs)
        objs[n - 1] = pdfObjBytes(new TextDecoder().decode(objs[n - 1]).replace("PAGESREF", `${pagesObj} 0 R`));
    const header = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xff, 0xff, 0xff, 0xff, 0x0a]);
    const parts = [header], offsets = [0];
    let pos = header.length;
    for (let i = 0; i < objs.length; i++) {
        const head = pdfObjBytes(`${i + 1} 0 obj\n`), tail = pdfObjBytes("\nendobj\n");
        offsets[i + 1] = pos;
        parts.push(head, objs[i], tail);
        pos += head.length + objs[i].length + tail.length;
    }
    const xrefPos = pos;
    let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objs.length; i++)
        xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
    xref += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
    parts.push(pdfObjBytes(xref));
    const bytes = pdfConcatBytes(parts);
    pdfValidateBlobBytes(bytes);
    return new Blob([bytes], { type: "application/pdf" });
}
