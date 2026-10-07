/* ==================== FİYAT LİSTESİ: ÖLÇÜ KARTLARI (A1) & MODEL SIRASI (B1) ==================== */
const PDF_SIZE = { cols: 3, gap: 8, imgH: 120, rowH: 15.5, headH: 12 };
const PDF_MODEL = { maxCols: 5, minCols: 4, headH: 36, imgH: 88, cellH: 144 };
function pdfVariantRows(item, lang) {
    const p = normalizePrice(item?.price);
    if (p.parts.length)
        return p.parts.map(part => ({ name: pdfText(lang, part.name, part.name_en, part.name) || "", dims: part.dims || "", amount: part.amount, contactOnly: !!part.contactOnly || part.amount === null, image: part.image || null }));
    const amt = p.manualTotal !== null && p.manualTotal !== undefined ? p.manualTotal : priceTotal(p);
    return [{ name: "", dims: item?.dims || "", amount: amt, contactOnly: amt === null, image: null }];
}
/* Fiyatsız katalogda ölçü kartları / model sıraları fiyat göstermez. */
let pdfNoPrice = false;
/* Fiyatsız katalogda açıklamadaki fiyatla ilgili cümleler ("… dahil fiyatlar", "130.200 TL" vb.) gösterilmez. */
const PDF_PRICE_TEXT = /fiyat|price|₺|\bTL\b|\bUSD\b|\bEUR\b|[$€]|\d{1,3}(?:\.\d{3})+(?:,\d+)?/i;
function pdfDescText(lang, item) {
    const t = pdfText(lang, item?.desc, item?.desc_en, item?.desc) || "";
    if (!pdfNoPrice || !t)
        return t;
    return t.split(/\n+/).map(line => line.split(/(?<=[.!?;])\s+(?=\S)/).filter(seg => !PDF_PRICE_TEXT.test(seg)).join(" ")).filter(x => x.trim()).join("\n").trim();
}
function pdfVariantPrice(data, r, lang) {
    if (pdfNoPrice)
        return { text: "", muted: true, none: true };
    if (r.contactOnly || r.amount === null || r.amount === undefined)
        return { text: lang === "EN" ? "Ask for price" : "Fiyat sorunuz", muted: true };
    return { text: pdfMoney(data, r.amount), muted: false };
}
function pdfSizeColW() { const L = PDF_LAYOUT; return (L.cardW - PDF_SIZE.gap * (PDF_SIZE.cols - 1)) / PDF_SIZE.cols; }
function pdfSizeCardHeight(item, lang) {
    const w = pdfSizeColW(), name = pdfText(lang, item.name, item.name_en, item.name) || "—";
    const nl = pdfWrapText(name, w - 18, 10.2, 2).length, rows = pdfVariantRows(item, lang).length;
    return Math.ceil(PDF_SIZE.imgH + 15 + (nl - 1) * 12.4 + 13 + PDF_SIZE.headH + rows * PDF_SIZE.rowH + 8);
}
function pdfSizeRowBlocks(items, lang) {
    const out = [];
    for (let i = 0; i < items.length; i += PDF_SIZE.cols) {
        const chunk = items.slice(i, i + PDF_SIZE.cols);
        out.push({ type: "sizeRow", items: chunk, h: Math.max(...chunk.map(it => pdfSizeCardHeight(it, lang))) });
    }
    return out;
}
/* Yuvarlak köşeli dikdörtgen (Bezier) — kartlara daha zarif bir görünüm verir. */
function pdfRoundRect(x, y, w, h, r, fill = null, stroke = null, lw = .5) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    const k = .5523 * r, f = v => v.toFixed(2);
    const path = `${f(x + r)} ${f(y)} m ${f(x + w - r)} ${f(y)} l ${f(x + w - r + k)} ${f(y)} ${f(x + w)} ${f(y + r - k)} ${f(x + w)} ${f(y + r)} c ${f(x + w)} ${f(y + h - r)} l ${f(x + w)} ${f(y + h - r + k)} ${f(x + w - r + k)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)} c ${f(x + r)} ${f(y + h)} l ${f(x + r - k)} ${f(y + h)} ${f(x)} ${f(y + h - r + k)} ${f(x)} ${f(y + h - r)} c ${f(x)} ${f(y + r)} l ${f(x)} ${f(y + r - k)} ${f(x + r - k)} ${f(y)} ${f(x + r)} ${f(y)} c h`;
    let c = "";
    if (fill)
        c += `${fill[0]} ${fill[1]} ${fill[2]} rg ${path} f\n`;
    if (stroke)
        c += `${stroke[0]} ${stroke[1]} ${stroke[2]} RG ${lw.toFixed(2)} w ${path} S\n`;
    return c;
}
/* Hafif gölgeli kart zemini */
function pdfSoftCard(x, y, w, h, r = 7) {
    return pdfRoundRect(x + 1.2, y - 1.6, w, h, r, [0.9, 0.895, 0.885]) + pdfRoundRect(x, y, w, h, r, [1, 1, 1], [0.84, 0.83, 0.82], .5);
}
const PDF_IMG_BG = [0.957, 0.953, 0.944];
/* A1 — ÖLÇÜ KARTI: üstte görsel, altında ad, ince altın çizgi ve ölçü → fiyat satırları */
function pdfSizeCard(data, item, lang, x, y, w, h, asset, acc) {
    const top = y + h, ih = PDF_SIZE.imgH, pad = 10;
    let c = pdfSoftCard(x, y, w, h, 7);
    c += pdfRoundRect(x + 5, top - 5 - ih + 4, w - 10, ih - 4, 5, PDF_IMG_BG);
    if (asset)
        c += pdfDrawImage("Im" + asset.id, asset, x + 11, top - ih + 6, w - 22, ih - 16, true);
    else
        c += pdfTextOp(lang === "EN" ? "NO PRODUCT IMAGE" : "ÜRÜN GÖRSELİ YOK", x + w / 2, top - ih / 2 - 3, 7.4, { align: "center", bold: true, color: [0.62, 0.62, 0.62], maxWidth: w - 14 });
    let ty = top - ih - 16;
    const name = pdfText(lang, item.name, item.name_en, item.name) || "—", nl = pdfWrapText(name, w - 2 * pad, 10.2, 2).length;
    c += pdfTextOp(name, x + pad, ty, 10.2, { bold: true, maxWidth: w - 2 * pad, maxLines: 2, leading: 12.4, color: [0.06, 0.06, 0.06] });
    ty -= (nl - 1) * 12.4 + 8;
    c += pdfRect(x + pad, ty, 18, 1.5, acc);
    ty -= 5;
    c += pdfTextOp(lang === "EN" ? "SIZE (cm)" : "ÖLÇÜ (cm)", x + pad, ty - 8, 6.4, { bold: true, color: [0.55, 0.55, 0.55] });
    if (!pdfNoPrice)
        c += pdfTextOp(lang === "EN" ? "PRICE" : "FİYAT", x + w - pad, ty - 8, 6.4, { align: "right", bold: true, color: [0.55, 0.55, 0.55] });
    ty -= PDF_SIZE.headH;
    pdfVariantRows(item, lang).forEach((r, i) => {
        const rowTop = ty - i * PDF_SIZE.rowH, cy = rowTop - PDF_SIZE.rowH + 5;
        if (i % 2 === 0)
            c += pdfRoundRect(x + pad - 4, rowTop - PDF_SIZE.rowH + 1, w - 2 * pad + 8, PDF_SIZE.rowH - 2, 3, [0.972, 0.969, 0.962]);
        const pr = pdfVariantPrice(data, r, lang), prSize = pr.muted ? 7.2 : 9.2, prW = pr.none ? 0 : pdfFontWidth(pr.text, prSize) + 4;
        const dl = String(r.dims || "").trim() ? pdfDimsLabel(r.dims) : "", main = dl || r.name || "—", sub = dl ? r.name : "";
        const mainMax = Math.max(30, w - 2 * pad - prW - 6), mainW = Math.min(pdfFontWidth(main, 8.8) + 3, mainMax);
        c += pdfTextOp(main, x + pad, cy, 8.8, { bold: true, maxWidth: mainMax, maxLines: 1, color: [0.1, 0.1, 0.1] });
        if (sub) {
            const subMax = w - 2 * pad - prW - 6 - mainW - 4;
            if (subMax > 18)
                c += pdfTextOp(sub, x + pad + mainW + 3, cy, 7.2, { maxWidth: subMax, maxLines: 1, color: [0.48, 0.48, 0.48] });
        }
        if (!pr.none)
            c += pdfTextOp(pr.text, x + w - pad, cy, prSize, { align: "right", bold: !pr.muted, maxWidth: prW + 2, maxLines: 1, color: pr.muted ? [0.5, 0.5, 0.5] : [0.06, 0.06, 0.06] });
    });
    return c;
}
function pdfModelCellH() { return PDF_MODEL.cellH - (pdfNoPrice ? 14 : 0); }
function pdfModelCols(n) { return Math.min(PDF_MODEL.maxCols, Math.max(PDF_MODEL.minCols, n)); }
function pdfModelRowHeight(item, lang) {
    const n = Math.max(1, pdfVariantRows(item, lang).length), cols = pdfModelCols(n);
    return Math.ceil(PDF_MODEL.headH + Math.ceil(n / cols) * pdfModelCellH() + 6);
}
/* B1 — MODEL SIRASI: seri adı + açıklama, altında her model ayrı panelde (resim · model · ölçü · fiyat).
   Model fotoğrafı: önce modelin kendi fotoğrafı, yoksa ürün fotoğrafları sırayla (1. foto → 1. model…), o da yoksa ana fotoğraf. */
function pdfModelRow(data, item, lang, x, y, w, h, useImg, acc) {
    const top = y + h;
    let c = pdfSoftCard(x, y, w, h, 8);
    const name = pdfText(lang, item.name, item.name_en, item.name) || "—", desc = pdfDescText(lang, item) || "";
    const nameW = Math.min(pdfFontWidth(name, 12.5) + 6, w * 0.55);
    c += pdfTextOp(name, x + 14, top - 20, 12.5, { bold: true, maxWidth: w * 0.55, maxLines: 1, color: [0.06, 0.06, 0.06] });
    if (desc)
        c += pdfTextOp(desc, x + w - 14, top - 19.5, 7.8, { align: "right", maxWidth: w - 28 - nameW - 12, maxLines: 1, color: [0.45, 0.45, 0.45] });
    c += pdfRect(x + 14, top - 28, 22, 1.6, acc);
    c += pdfLine(x + 40, top - 27.2, x + w - 14, top - 27.2, [0.88, 0.88, 0.88], .4);
    const rows = pdfVariantRows(item, lang), n = rows.length, cols = pdfModelCols(n), gap = 8, inner = w - 20, cellW = (inner - gap * (cols - 1)) / cols;
    const mainSrc = pdfProductImageSource(item, data), gallery = (Array.isArray(item.images) ? item.images : []).map(pdfImageSource).filter(Boolean);
    rows.forEach((r, i) => {
        const col = i % cols, row = Math.floor(i / cols), cx = x + 10 + col * (cellW + gap), cTop = top - PDF_MODEL.headH - row * pdfModelCellH();
        const panelH = pdfModelCellH() - 8;
        c += pdfRoundRect(cx, cTop - panelH, cellW, panelH, 6, [0.975, 0.972, 0.966]);
        const ih = PDF_MODEL.imgH, boxY = cTop - 4 - ih;
        const a = useImg(pdfImageSource(r.image)) || useImg(gallery[i]) || useImg(mainSrc);
        if (a)
            c += pdfDrawImage("Im" + a.id, a, cx + 8, boxY + 3, cellW - 16, ih - 6, true);
        let ly = boxY - 11;
        const label = String(r.name || "").toLocaleUpperCase(lang === "EN" ? "en-US" : "tr-TR") || "—";
        c += pdfTextOp(label, cx + cellW / 2, ly, 7.6, { align: "center", bold: true, maxWidth: cellW - 10, maxLines: 1, color: [0.25, 0.25, 0.25] });
        c += pdfRect(cx + cellW / 2 - 7, ly - 4.5, 14, 1, acc);
        ly -= 13;
        if (String(r.dims || "").trim())
            c += pdfTextOp(pdfDimsLabel(r.dims) + " cm", cx + cellW / 2, ly, 6.6, { align: "center", maxWidth: cellW - 10, maxLines: 1, color: [0.5, 0.5, 0.5] });
        ly -= 13.5;
        const pr = pdfVariantPrice(data, r, lang);
        if (!pr.none)
            c += pdfTextOp(pr.text, cx + cellW / 2, ly, pr.muted ? 7.4 : 10.8, { align: "center", bold: !pr.muted, maxWidth: cellW - 10, maxLines: 1, color: pr.muted ? [0.5, 0.5, 0.5] : [0.06, 0.06, 0.06] });
    });
    return c;
}
/* Akış düzeni: kategori şeridi + ürün kartları, sayfa başına en fazla 7 ürün.
   Fiyat listesi ve "Klasik" katalog aynı sayfalama kurallarını kullanır. */
async function pdfFlowPages(data, lang, preparedImages, pages, opts = {}) {
    const L = PDF_LAYOUT, H = L.H, TOP = L.top, BOTTOM = L.bottom, GAP = L.gap, MAX_PRODUCTS = 7;
    const cardH = opts.cardHeight || pdfCardHeight;
    let current = [], used = TOP, productCount = 0;
    const flush = async () => {
        if (!current.length)
            return;
        pages.push(await renderPdfCatalogPage(data, lang, current, pages.length + 1, preparedImages, opts));
        current = [];
        used = TOP;
        productCount = 0;
    };
    const fits = h => used + h <= H - BOTTOM;
    for (const category of (data.categories || [])) {
        const items = Array.isArray(category.items) ? category.items : [];
        if (!items.length)
            continue;
        if (data.pdf?.useCategoryCovers) {
            /* Önceki kategorinin bekleyen ürünleri kapaktan ÖNCE basılır. */
            await flush();
            pages.push(await renderPdfCategoryCoverPage(data, lang, category, pages.length + 1));
        }
        const layout = opts.forceTable ? "table" : categoryLayoutOf(data, category.id);
        if (layout !== "table") {
            /* Ölçü kartları / model sırası: yükseklik bazlı sayfalama */
            const blocks = layout === "sizes" ? pdfSizeRowBlocks(items, lang) : items.map(it => ({ type: "modelRow", item: it, h: pdfModelRowHeight(it, lang) }));
            if (current.length && !fits(L.categoryH + GAP + blocks[0].h))
                await flush();
            current.push({ type: "category", category });
            used += L.categoryH + GAP;
            for (const blk of blocks) {
                if (!fits(blk.h)) {
                    await flush();
                    current.push({ type: "category", category });
                    used += L.categoryH + GAP;
                }
                current.push({ ...blk, category });
                used += blk.h + GAP;
            }
            continue;
        }
        if (current.length && (!fits(L.categoryH + GAP + cardH(items[0])) || productCount >= MAX_PRODUCTS))
            await flush();
        current.push({ type: "category", category });
        used += L.categoryH + GAP;
        for (const item of items) {
            const h = cardH(item);
            if (productCount >= MAX_PRODUCTS || !fits(h)) {
                await flush();
                current.push({ type: "category", category });
                used += L.categoryH + GAP;
            }
            current.push({ type: "product", category, item });
            used += h + GAP;
            productCount++;
        }
    }
    await flush();
}
async function buildPriceListPDF(rawData, lang) {
    const source = normalizeData(rawData), currency = source.currency?.selected || "TRY";
    /* PDF dili artık para biriminden değil, sitenin seçili dilinden gelir. */
    const pdfLang = lang === "EN" ? "EN" : lang === "TR" ? "TR" : (currency === "TRY" ? "TR" : "EN");
    pdfAccentCurrent = pdfCatalogAccent(source);
    pdfNoPrice = false;
    const prepared = await pdfPrepareImages(source), data = prepared.data;
    const pages = [await renderPdfCoverPage(data, pdfLang)];
    await pdfFlowPages(data, pdfLang, prepared.images, pages);
    return await pdfCreateVectorDocument(pages);
}
