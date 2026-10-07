function pdfB64Bytes(b64) { const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++)
    out[i] = bin.charCodeAt(i); return out; }
function pdfHex(bytes) { let s = ""; for (let i = 0; i < bytes.length; i++)
    s += bytes[i].toString(16).padStart(2, "0"); return s.toUpperCase(); }
function pdfGlyphId(cp) {
    return PDF_FONT_CMAP[cp] ?? PDF_FONT_CMAP[63] ?? 0;
}
/* Gömülü fontta olmayan karakterleri en yakın karşılığına çevir (yoksa "?" basılıyordu). */
const PDF_CHAR_MAP = { "\u2018": "'", "\u2019": "'", "\u201A": ",", "\u201B": "'", "\u201C": '"', "\u201D": '"', "\u201E": '"', "\u2032": "'", "\u2033": '"', "\u2022": "·", "\u2023": "·", "\u25CF": "·", "\u2212": "-", "\u2010": "-", "\u2011": "-", "\u2012": "-", "\u2015": "—", "\u00A0": " ", "\u2007": " ", "\u2009": " ", "\u202F": " ", "\u200B": "", "\u200C": "", "\u200D": "", "\uFEFF": "", "\u2122": "TM", "\u2192": "->", "\u2190": "<-", "\u2264": "<=", "\u2265": ">=", "\u2248": "~", "\u2300": "Ø", "\u2715": "×", "\u2716": "×" };
function pdfNormalizeText(text) {
    let out = "";
    for (const ch of String(text ?? "")) {
        const cp = ch.codePointAt(0);
        if (PDF_FONT_CMAP[cp] !== undefined) {
            out += ch;
            continue;
        }
        if (PDF_CHAR_MAP[ch] !== undefined) {
            out += PDF_CHAR_MAP[ch];
            continue;
        }
        if (cp < 32) {
            out += " ";
            continue;
        }
        /* Aksanlı harf ise aksanını atıp dene (ș → s, ā → a); olmazsa atla. */
        const base = ch.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
        out += [...base].every(c => PDF_FONT_CMAP[c.codePointAt(0)] !== undefined) ? base : "";
    }
    return out;
}
function pdfUnicodeHex(text) {
    let out = "";
    for (const ch of pdfNormalizeText(text)) {
        const cp = ch.codePointAt(0);
        if (cp <= 0xFFFF) {
            out += pdfGlyphId(cp).toString(16).padStart(4, "0");
        }
        else {
            const v = cp - 0x10000;
            const hi = 0xD800 + (v >> 10), lo = 0xDC00 + (v & 1023);
            out += pdfGlyphId(hi).toString(16).padStart(4, "0");
            out += pdfGlyphId(lo).toString(16).padStart(4, "0");
        }
    }
    return out.toUpperCase();
}
function pdfFontWidth(text, size) {
    let total = 0;
    for (const ch of pdfNormalizeText(text)) {
        const cp = ch.codePointAt(0);
        total += (PDF_FONT_WIDTHS[pdfGlyphId(cp)] || 0);
    }
    return total / PDF_FONT_METRICS.unitsPerEm * size;
}
function pdfWrapText(text, maxWidth, size, maxLines = 3) {
    const words = String(text ?? "").trim().split(/\s+/).filter(Boolean);
    if (!words.length)
        return [""];
    const lines = [];
    let line = "";
    for (const word of words) {
        const test = line ? line + " " + word : word;
        if (!line || pdfFontWidth(test, size) <= maxWidth)
            line = test;
        else {
            lines.push(line);
            line = word;
        }
    }
    if (line)
        lines.push(line);
    if (lines.length <= maxLines)
        return lines;
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    const rest = lines.slice(maxLines - 1).join(" ");
    while (last.length && pdfFontWidth(last + "…", size) > maxWidth)
        last = last.slice(0, -1);
    kept[maxLines - 1] = last ? last + "…" : "…";
    return kept;
}
function pdfTextOp(text, x, y, size, opts = {}) {
    const align = opts.align || "left", bold = !!opts.bold, maxWidth = opts.maxWidth ?? null, maxLines = opts.maxLines || 1, leading = opts.leading || size * 1.12;
    const lines = pdfWrapText(text, maxWidth ?? 1e9, size, maxLines);
    let out = "";
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let xx = x;
        if (align === "center")
            xx = x - pdfFontWidth(line, size) / 2;
        else if (align === "right")
            xx = x - pdfFontWidth(line, size);
        const hex = pdfUnicodeHex(line), color = Array.isArray(opts.color) ? opts.color : [0, 0, 0];
        /* Kalın yazı "doldur+kontur" ile çizilir; kontur rengi de yazı rengine eşitlenir
           (önceden son çizilen çizginin rengini alıyor, kalın yazılar soluk/gri görünüyordu). */
        const rgb = `${color[0]} ${color[1]} ${color[2]} rg ${color[0]} ${color[1]} ${color[2]} RG`;
        /* Use PDF text rendering mode for bold instead of drawing the same glyph
           twice. Double-drawing caused visible ghosting/overlap in Acrobat. */
        const boldOp = bold ? `${Math.max(0.18, Math.min(0.42, size * 0.035)).toFixed(2)} w 2 Tr\n` : '';
        const resetOp = bold ? '0 Tr\n' : '';
        out += `${rgb}\nBT ${boldOp}/F1 ${size.toFixed(2)} Tf 1 0 0 1 ${xx.toFixed(2)} ${(y - i * leading).toFixed(2)} Tm <${hex}> Tj ${resetOp}ET\n`;
    }
    return out;
}
function pdfRect(x, y, w, h, fill = null, stroke = null, lw = 0.5) {
    let s = "";
    if (fill)
        s += `${fill[0]} ${fill[1]} ${fill[2]} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f\n`;
    if (stroke)
        s += `${stroke[0]} ${stroke[1]} ${stroke[2]} RG ${lw.toFixed(2)} w ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S\n`;
    return s;
}
function pdfLine(x1, y1, x2, y2, color = [0.25, 0.25, 0.25], lw = 0.5) { return `${color[0]} ${color[1]} ${color[2]} RG ${lw.toFixed(2)} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`; }
function pdfFitRect(iw, ih, x, y, w, h) { const r = Math.min(w / iw, h / ih); const dw = iw * r, dh = ih * r; return { x: x + (w - dw) / 2, y: y + (h - dh) / 2, w: dw, h: dh }; }
function pdfDrawImage(name, asset, x, y, w, h, contain = true) {
    if (!asset)
        return "";
    const box = contain ? pdfFitRect(asset.width, asset.height, x, y, w, h) : { x, y, w, h };
    return `q\n${box.w.toFixed(2)} 0 0 ${box.h.toFixed(2)} ${box.x.toFixed(2)} ${box.y.toFixed(2)} cm\n/${name} Do\nQ\n`;
}
const PDF_IMAGE_TIMEOUT_MS = 15000;
function pdfWithTimeout(promise, ms, fallback = null) {
    let timer;
    return Promise.race([promise, new Promise(res => { timer = setTimeout(() => res(fallback), ms); })]).finally(() => clearTimeout(timer));
}
async function pdfLoadImageSafe(key) {
    if (!key)
        return null;
    /* Yanıt vermeyen bir görsel sunucusu PDF'i sonsuza kadar bekletmesin. */
    return pdfWithTimeout(pdfLoadImageInner(key), PDF_IMAGE_TIMEOUT_MS, null);
}
async function pdfLoadImageInner(key) {
    // Uzak görselleri önce Blob olarak al. Böylece canvas
    // cross-origin kaynak yüzünden "Tainted canvases may not be exported" vermez.
    if (/^https?:\/\//i.test(key)) {
        try {
            const r = await fetch(key, { mode: "cors", cache: "force-cache" });
            if (r.ok) {
                const blob = await r.blob();
                const objectUrl = URL.createObjectURL(blob);
                const result = await new Promise(resolve => {
                    const im = new Image();
                    let done = false;
                    const finish = v => { if (done)
                        return; done = true; resolve(v); };
                    im.onload = () => finish({ im, width: im.naturalWidth || im.width, height: im.naturalHeight || im.height, objectUrl });
                    im.onerror = () => finish(null);
                    im.src = objectUrl;
                });
                if (result)
                    return result;
                try {
                    URL.revokeObjectURL(objectUrl);
                }
                catch { }
            }
        }
        catch (err) {
            console.warn("PDF görseli Blob olarak alınamadı, CORS ile deneniyor:", err);
        }
    }
    return await new Promise(resolve => {
        const im = new Image();
        let done = false;
        const finish = v => { if (done)
            return; done = true; resolve(v); };
        if (/^https?:\/\//i.test(key))
            im.crossOrigin = "anonymous";
        im.onload = () => finish({ im, width: im.naturalWidth || im.width, height: im.naturalHeight || im.height, objectUrl: null });
        im.onerror = () => finish(null);
        im.src = key;
    });
}
/* Görsel çözünürlüğü kullanım yerine göre: ürün kutusu ~186x82pt → 300 dpi için ~1000 px yeterli.
   Tam sayfa kategori kapağı için 2000 px. (Eskiden her görsel 2400 px/%96 kaliteydi → çok büyük PDF.) */
async function pdfImageAsset(src, { max = 1000, quality = .86 } = {}) {
    const key = pdfImageSource(src);
    if (!key)
        return null;
    const cacheKey = key + "|" + max + "|" + quality;
    pdfImageAsset.cache = pdfImageAsset.cache || new Map();
    if (pdfImageAsset.cache.has(cacheKey))
        return pdfImageAsset.cache.get(cacheKey);
    const asset = await pdfLoadImageSafe(key);
    if (!asset) {
        pdfImageAsset.cache.set(cacheKey, null);
        return null;
    }
    try {
        /* Boyutu tanımsız SVG'ler için makul varsayılan. */
        const iw = asset.width || 800, ih = asset.height || 600;
        /* Acrobat-safe: normalize every image to RGB JPEG because the PDF XObject declares DeviceRGB. */
        const c = document.createElement('canvas');
        const scale = Math.min(1, max / Math.max(iw, ih));
        c.width = Math.max(1, Math.round(iw * scale));
        c.height = Math.max(1, Math.round(ih * scale));
        const cctx = c.getContext('2d', { alpha: false });
        cctx.fillStyle = '#ffffff';
        cctx.fillRect(0, 0, c.width, c.height);
        cctx.drawImage(asset.im, 0, 0, c.width, c.height);
        const data = c.toDataURL('image/jpeg', quality);
        const result = { data, width: c.width, height: c.height, source: key };
        pdfImageAsset.cache.set(cacheKey, result);
        return result;
    }
    catch (err) {
        console.warn("PDF görseli işlenemedi:", err);
        pdfImageAsset.cache.set(cacheKey, null);
        return null;
    }
    finally {
        if (asset.objectUrl) {
            try {
                URL.revokeObjectURL(asset.objectUrl);
            }
            catch (_) { }
        }
    }
}
async function pdfLogoImageAsset(src) {
    const key = pdfImageSource(src);
    if (!key)
        return null;
    pdfLogoImageAsset.cache = pdfLogoImageAsset.cache || new Map();
    if (pdfLogoImageAsset.cache.has(key))
        return pdfLogoImageAsset.cache.get(key);
    const asset = await pdfLoadImageSafe(key);
    if (!asset) {
        pdfLogoImageAsset.cache.set(key, null);
        return null;
    }
    if (asset.objectUrl)
        setTimeout(() => { try {
            URL.revokeObjectURL(asset.objectUrl);
        }
        catch (_) { } }, 0);
    const iw = asset.width || 1200, ih = asset.height || 600;
    const max = 1800, scale = Math.min(1, max / Math.max(iw, ih));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(iw * scale));
    c.height = Math.max(1, Math.round(ih * scale));
    const ctx = c.getContext("2d", { alpha: false });
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(asset.im, 0, 0, c.width, c.height);
    const data = c.toDataURL("image/jpeg", .98);
    const result = { data, width: c.width, height: c.height, source: key };
    pdfLogoImageAsset.cache.set(key, result);
    return result;
}
function pdfDataUriToBytes(dataUri) { const b64 = String(dataUri || "").split(",")[1] || ""; return pdfB64Bytes(b64); }
function pdfConcatBytes(chunks) { let total = 0; for (const c of chunks)
    total += c.length; const out = new Uint8Array(total); let o = 0; for (const c of chunks) {
    out.set(c, o);
    o += c.length;
} return out; }
function pdfObjBytes(value) { return value instanceof Uint8Array ? value : new TextEncoder().encode(value); }
function pdfCodepointToGid(cp) {
    return PDF_FONT_CMAP[cp] ?? PDF_FONT_CMAP[63] ?? 0;
}
function pdfCollectUsedGlyphs(texts) {
    const map = new Map();
    const add = (cp) => {
        const gid = pdfGlyphId(cp);
        if (!map.has(gid))
            map.set(gid, cp);
    };
    add(32);
    add(63);
    for (const text of texts) {
        for (const ch of String(text ?? "")) {
            const cp = ch.codePointAt(0);
            if (cp <= 0xFFFF)
                add(cp);
            else {
                const v = cp - 0x10000;
                add(0xD800 + (v >> 10));
                add(0xDC00 + (v & 1023));
            }
        }
    }
    return map;
}
function pdfToUnicodeObject(glyphToUnicode) {
    const arr = [...glyphToUnicode.entries()].sort((a, b) => a[0] - b[0]);
    let body = "/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000><FFFF>\nendcodespacerange\n";
    for (let i = 0; i < arr.length; i += 100) {
        const chunk = arr.slice(i, i + 100);
        body += chunk.length + " beginbfchar\n";
        for (const [gid, cp] of chunk) {
            body += `<${gid.toString(16).padStart(4, "0")}><${cp.toString(16).padStart(4, "0")}>\n`;
        }
        body += "endbfchar\n";
    }
    body += "endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend";
    return body;
}
async function pdfFontBytes() {
    if (pdfFontBytes.cache)
        return pdfFontBytes.cache;
    pdfFontBytes.cache = (async () => {
        const raw = pdfB64Bytes(PDF_FONT_GZIP_B64);
        if (typeof DecompressionStream !== "function")
            throw new Error("Bu tarayıcı sıkıştırılmış PDF fontunu açamıyor.");
        const ds = new DecompressionStream("gzip");
        const ab = await new Response(new Blob([raw]).stream().pipeThrough(ds)).arrayBuffer();
        return new Uint8Array(ab);
    })();
    return pdfFontBytes.cache;
}
async function pdfMakeFontAndToUnicode(objs, glyphToUnicode) {
    const add = b => { objs.push(b); return objs.length; };
    const fontBytes = await pdfFontBytes();
    const fontFile = add(pdfConcatBytes([pdfObjBytes(`<< /Length ${fontBytes.length} /Length1 ${fontBytes.length} >>\nstream\n`), fontBytes, pdfObjBytes("\nendstream")]));
    const m = PDF_FONT_METRICS, scale = 1000 / m.unitsPerEm, bb = m.bbox.map(v => Math.round(v * scale));
    const desc = add(pdfObjBytes(`<< /Type /FontDescriptor /FontName /DejaVuSans /Flags 32 /FontBBox [${bb.join(" ")}] /ItalicAngle 0 /Ascent ${Math.round(m.ascent * scale)} /Descent ${Math.round(m.descent * scale)} /CapHeight ${Math.round(m.capHeight * scale)} /StemV 80 /FontFile2 ${fontFile} 0 R >>`));
    /* IMPORTANT: /W must contain the real advance width for EVERY glyph CID that
       the PDF can emit. The previous version only listed glyphs discovered by
       scanning the already-generated PDF content stream (which contains hex
       digits, not the original Unicode characters). That made most letters fall
       back to /DW 500 and caused Acrobat to squeeze/overlap text. */
    const widths = [];
    for (let gid = 0; gid < PDF_FONT_WIDTHS.length; gid++) {
        widths.push(`${gid} [${Math.round((PDF_FONT_WIDTHS[gid] || 0) * scale)}]`);
    }
    /* Build ToUnicode from the actual Unicode->GID table, not from PDF operators.
       This keeps copy/search/extraction correct for Turkish characters too. */
    const fullMap = new Map();
    for (const [cp, gid] of Object.entries(PDF_FONT_CMAP)) {
        const ncp = Number(cp), ngid = Number(gid);
        if (!fullMap.has(ngid))
            fullMap.set(ngid, ncp);
    }
    if (glyphToUnicode instanceof Map) {
        for (const [gid, cp] of glyphToUnicode.entries())
            fullMap.set(Number(gid), Number(cp));
    }
    const cmapText = pdfToUnicodeObject(fullMap);
    const cmapBytes = pdfObjBytes(cmapText);
    const cmap = add(pdfConcatBytes([pdfObjBytes(`<< /Length ${cmapBytes.length} >>\nstream\n`), cmapBytes, pdfObjBytes("\nendstream")]));
    const cid = add(pdfObjBytes(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /DejaVuSans /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${desc} 0 R /DW 500 /W [${widths.join(" ")}] /CIDToGIDMap /Identity >>`));
    const type0 = add(pdfObjBytes(`<< /Type /Font /Subtype /Type0 /BaseFont /DejaVuSans /Encoding /Identity-H /DescendantFonts [${cid} 0 R] /ToUnicode ${cmap} 0 R >>`));
    return type0;
}
function pdfPageMetrics() { return { width: 595.28, height: 841.89 }; }
/* Fixed A4 geometry. All product blocks use these exact x/width values. */
const PDF_LAYOUT = {
    W: 595.28, H: 841.89,
    rail: 18, left: 27, right: 8, top: 18, bottom: 25,
    gap: 5,
    cardW: 560.28,
    imageW: 190,
    imageH: 82,
    cardH: 105,
    titleH: 17,
    headerH: 16,
    rowH: 14.5,
    categoryH: 18
};
PDF_LAYOUT.cardW = PDF_LAYOUT.W - PDF_LAYOUT.left - PDF_LAYOUT.right;
PDF_LAYOUT.tableX = PDF_LAYOUT.left + PDF_LAYOUT.imageW;
PDF_LAYOUT.tableW = PDF_LAYOUT.cardW - PDF_LAYOUT.imageW;
PDF_LAYOUT.moduleW = 116;
PDF_LAYOUT.dimW = 78;
PDF_LAYOUT.unitW = 82;
PDF_LAYOUT.setW = PDF_LAYOUT.tableW - PDF_LAYOUT.moduleW - PDF_LAYOUT.dimW - PDF_LAYOUT.unitW;
PDF_LAYOUT.c1 = PDF_LAYOUT.tableX + PDF_LAYOUT.moduleW;
PDF_LAYOUT.c2 = PDF_LAYOUT.c1 + PDF_LAYOUT.dimW;
PDF_LAYOUT.c3 = PDF_LAYOUT.c2 + PDF_LAYOUT.unitW;
/* 5 satıra kadar tüm ürün kartları aynı yükseklikte (sayfa başına 7 ürün düzeni korunur).
   Daha fazla fiyat kalemi olan ürünlerde kart uzar; satırlar okunaklı kalır, üst üste binmez. */
const PDF_ROW_MIN_H = 12.4;
/* Takım tablosu kartı (A1 tasarım diliyle): görsel paneli, ad + altın çizgi, satır alanı başlangıcı */
const PDF_TBL = { imgW: 178, headTop: 35, pad: 6, setW: 104 };
function pdfMaxRowsPerCard() {
    const L = PDF_LAYOUT;
    return Math.floor((L.H - L.top - L.bottom - L.categoryH - L.gap - PDF_TBL.headTop - PDF_TBL.pad) / PDF_ROW_MIN_H);
}
function pdfVisibleRows(item, lang) {
    const rows = pdfRowsForItem(item), max = pdfMaxRowsPerCard();
    if (rows.length <= max)
        return rows;
    const hidden = rows.length - (max - 1);
    return [...rows.slice(0, max - 1), { name: lang === "EN" ? `+${hidden} more items — call us` : `+${hidden} kalem daha — bizi arayın`, dims: "", amount: null, contactOnly: false, __more: true }];
}
function pdfCardHeight(item) {
    const L = PDF_LAYOUT, rows = pdfVisibleRows(item, "TR").length;
    const need = PDF_TBL.headTop + rows * PDF_ROW_MIN_H + PDF_TBL.pad;
    return Math.max(L.cardH, Math.ceil(need));
}
function pdfCategoryHeight() { return PDF_LAYOUT.categoryH; }
function pdfPageChrome(data, pageNo) {
    const L = PDF_LAYOUT, W = L.W, H = L.H;
    let c = pdfRect(0, 0, L.rail, H, [0.05, 0.05, 0.05]);
    const site = data.pdf?.website || data.pdf?.footer || "www.ofishci.com";
    const hex = pdfUnicodeHex(site);
    c += `q\n1 0 0 1 ${(L.rail / 2).toFixed(2)} ${(H / 2).toFixed(2)} cm\n0 1 -1 0 0 0 cm\nBT /F1 8.5 Tf 1 0 0 1 0 0 Tm <${hex}> Tj ET\nQ\n`;
    if (data.pdf?.showPageNumbers !== false)
        c += pdfTextOp(String(pageNo), L.rail / 2, 13, 8.5, { align: "center", bold: true, color: [1, 1, 1] });
    return c;
}
/* ORTAK KATEGORİ BAŞLIĞI: fiyat listesi ve tüm katalog şablonları aynı koyu bant + vurgu çizgisini kullanır. */
let pdfAccentCurrent = [0.79, 0.64, 0.15];
function pdfCategoryBar(name, x, y, w, h, fs = 11.8) {
    let c = pdfRect(x, y, w, h, [0.05, 0.05, 0.05]);
    c += pdfRect(x, y, w, 1.6, pdfAccentCurrent);
    c += pdfTextOp(name, x + w / 2, y + (h - fs) / 2 + 1.1, fs, { align: "center", bold: true, maxWidth: w - 10, maxLines: 1, color: [1, 1, 1] });
    return c;
}
function pdfCategoryBlock(category, lang, x, y, w) {
    const h = PDF_LAYOUT.categoryH;
    let c = pdfRect(x, y, w, h, [0.05, 0.05, 0.05]);
    c += pdfRect(x, y, w, 1.6, pdfAccentCurrent);
    c += pdfTextOp(pdfText(lang, category.name, category.name_en, category.name), x + w / 2, y + 5.1, 11.8, { align: "center", bold: true, maxWidth: w - 10, maxLines: 1, color: [1, 1, 1] });
    return c;
}
/* ORTAK KART İSKELETİ (takım tablosu + klasik katalog): yumuşak gölgeli kart, bej görsel paneli, ad + altın çizgi */
function pdfTblFrame(item, lang, x, y, w, h, asset, id, acc, nameRight) {
    const T = PDF_TBL, top = y + h, title = pdfText(lang, item.name, item.name_en, item.name) || "—";
    let c = pdfSoftCard(x, y, w, h, 7);
    c += pdfRoundRect(x + 5, y + 5, T.imgW - 10, h - 10, 5, PDF_IMG_BG);
    if (asset)
        c += pdfDrawImage("Im" + id, asset, x + 10, y + 9, T.imgW - 20, h - 18, true);
    else
        c += pdfTextOp(lang === "EN" ? "NO PRODUCT IMAGE" : "ÜRÜN GÖRSELİ YOK", x + T.imgW / 2, y + h / 2 - 3, 7.4, { align: "center", bold: true, color: [0.62, 0.62, 0.62], maxWidth: T.imgW - 20 });
    const tx = x + T.imgW + 8, nameMax = nameRight - tx;
    c += pdfTextOp(title, tx, top - 16, 11.6, { bold: true, maxWidth: nameMax, maxLines: 1, color: [0.06, 0.06, 0.06] });
    c += pdfRect(tx, top - 22.5, 20, 1.5, acc);
    c += pdfLine(tx + 24, top - 21.75, nameRight, top - 21.75, [0.89, 0.885, 0.875], .4);
    return { c, tx, top };
}
function pdfTblCaption(text, x, y, align) { return pdfTextOp(text, x, y, 6.3, { align, bold: true, color: [0.55, 0.55, 0.55], maxLines: 1 }); }
function pdfProductBlock(data, category, item, lang, x, y, w, h, asset, id) {
    const T = PDF_TBL, acc = pdfCatalogAccent(data), rows = pdfVisibleRows(item, lang);
    const setX = x + w - 8 - T.setW, right = setX - 10;
    let { c, tx, top } = pdfTblFrame(item, lang, x, y, w, h, asset, id, acc, right);
    /* Sütunlar: Modül · G/D/Y · Birim fiyat (sağa yaslı) */
    const unitW = 74, dimW = 78, third = dimW / 3, ux = right, dx = right - unitW - dimW, modW = dx - tx - 6;
    const capY = top - 31;
    c += pdfTblCaption(lang === "EN" ? "MODULE" : "MODÜL", tx, capY, "left");
    ["G/W", "D/D", "Y/H"].forEach((t, j) => { c += pdfTblCaption(t, dx + third * (j + .5), capY, "center"); });
    c += pdfTblCaption(lang === "EN" ? "UNIT PRICE" : "BİRİM FİYAT", ux, capY, "right");
    const rowsTop = top - T.headTop, rowH = Math.min(15.5, (rowsTop - (y + T.pad)) / Math.max(rows.length, 1));
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
        pdfDimsParts(part.dims).forEach((v, j) => { c += pdfTextOp(v, dx + third * (j + .5), cy, fs - .3, { align: "center", maxWidth: third - 2, maxLines: 1, color: [0.3, 0.3, 0.3] }); });
        const muted = part.contactOnly || part.amount === null || part.amount === undefined;
        const price = muted ? (lang === "EN" ? "Contact us" : "İletişime geçin") : pdfMoney(data, part.amount);
        c += pdfTextOp(price, ux, cy, muted ? fs - 1 : fs + .2, { align: "right", bold: !muted, maxWidth: unitW - 2, maxLines: 1, color: muted ? [0.5, 0.5, 0.5] : [0.06, 0.06, 0.06] });
    }
    /* Takım fiyatı: sağda ayrı, altın vurgulu panel */
    const ph = h - 12, py = y + 6, mid = py + ph / 2;
    c += pdfRoundRect(setX, py, T.setW, ph, 6, [0.99, 0.982, 0.958], [acc[0] * .6 + .4, acc[1] * .6 + .4, acc[2] * .6 + .4], .6);
    c += pdfTextOp(lang === "EN" ? "SET PRICE" : "TAKIM FİYATI", setX + T.setW / 2, mid + 9, 6.5, { align: "center", bold: true, color: [0.5, 0.47, 0.4], maxWidth: T.setW - 8, maxLines: 1 });
    c += pdfRect(setX + T.setW / 2 - 8, mid + 4.5, 16, 1.1, acc);
    const total = pdfTotal(data, item, lang), isMoney = /\d/.test(total);
    c += pdfTextOp(total, setX + T.setW / 2, mid - 9, isMoney ? 12.4 : 8.6, { align: "center", bold: true, maxWidth: T.setW - 8, maxLines: 1, color: isMoney ? [acc[0] * .72, acc[1] * .72, acc[2] * .72] : [0.45, 0.45, 0.45] });
    return c;
}
async function renderPdfCoverPage(data, lang, titleOverride) {
    const L = PDF_LAYOUT, W = L.W, H = L.H;
    let content = pdfRect(0, 0, W, H, [0.02, 0.02, 0.02]);
    content += pdfRect(7, 7, W - 14, H - 14, null, [0.55, 0.55, 0.55], .55);
    content += pdfRect(11, 11, W - 22, H - 22, null, [0.22, 0.22, 0.22], .55);
    const images = new Map(), logoSrc = pdfImageSource(data.pdf?.coverLogo?.src);
    const loaded = await pdfLogoImageAsset(logoSrc);
    if (loaded) {
        const logo = { ...loaded, id: 1 };
        images.set("__coverLogo__", logo);
        content += pdfDrawImage("Im1", logo, 55, 365, 485, 205, true);
    }
    const cur = data.currency?.selected === "USD" ? "USD" : data.currency?.selected === "EUR" ? "EUR" : "TL";
    const autoTitle = lang === "EN" ? `2026-2 ${cur} PRICE LIST` : `2026-2 ${cur} FİYAT LİSTESİ`;
    /* Yönetimde yazılan başlık Türkçedir; İngilizce PDF'te otomatik İngilizce başlık kullanılır (ayrı "title_en" varsa o). */
    const defTitle = /^2026-2\s*(TL|USD|EUR)?\s*F[İI]YAT L[İI]STES[İI]$/i.test(String(data.pdf?.title || "").trim());
    const title = titleOverride || (lang === "EN" ? (data.pdf?.title_en || autoTitle) : ((data.pdf?.title && !defTitle) ? data.pdf.title : autoTitle));
    content += pdfTextOp(title, W - 42, 55, 17.5, { align: "right", bold: true, maxWidth: 455, maxLines: 2, color: [1, 1, 1] });
    return { content, images, pageNo: null };
}
/* Görseli kutuyu tamamen dolduracak şekilde orantılı büyütür ve taşan kısmı kırpar (object-fit: cover).
   Önceki sürüm görseli sayfaya zorla geriyordu → yatay fotoğraflar dikey sayfada bozuk görünüyordu. */
function pdfDrawImageCover(name, asset, x, y, w, h, focusY = .5) {
    if (!asset)
        return "";
    const iw = asset.width || 1, ih = asset.height || 1, sc = Math.max(w / iw, h / ih), dw = iw * sc, dh = ih * sc;
    const dx = x + (w - dw) / 2, dy = y + (h - dh) * (1 - focusY);
    return `q\n${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re W n\n${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${dx.toFixed(2)} ${dy.toFixed(2)} cm\n/${name} Do\nQ\n`;
}
/* KATEGORİ KAPAĞI
   Üstte tam genişlik fotoğraf (kırpılarak, asla gerilmeden), altta koyu panelde kategori adı ve ürün sayısı.
   Kapak görseli olmayan kategorilerde fotoğraf alanında marka logosu yer alır (katalog tutarlı kalır). */
const PDF_COVER_INK = [5 / 255, 5 / 255, 5 / 255]; /* logo JPEG arka planıyla birebir aynı ton: logo kutusu görünmez */
async function renderPdfCategoryCoverPage(data, lang, category, pageNo) {
    const L = PDF_LAYOUT, W = L.W, H = L.H, acc = pdfCatalogAccent(data), M = 44;
    const images = new Map();
    let c = pdfRect(0, 0, W, H, PDF_COVER_INK);
    const photoH = Math.round(H * 0.63), photoY = H - photoH;
    const src = pdfImageSource(category?.coverImage);
    const asset = src ? await pdfImageAsset(src, { max: 2000, quality: .88 }) : null;
    const logo = await pdfLogoImageAsset(pdfImageSource(data.pdf?.coverLogo?.src));
    if (asset) {
        const a = { ...asset, id: 1 };
        images.set("__categoryCover__", a);
        c += pdfDrawImageCover("Im1", a, 0, photoY, W, photoH, .5);
    }
    else if (logo) {
        /* Fotoğrafsız kapak: üst alanda ortalanmış marka logosu (zemin logo zeminiyle aynı ton) */
        const lg = { ...logo, id: 3 };
        images.set("__categoryHeroLogo__", lg);
        c += pdfDrawImage("Im3", lg, W * 0.2, photoY + photoH * 0.32, W * 0.6, photoH * 0.36, true);
    }
    c += pdfRect(0, photoY - 3, W, 3, acc);
    /* Panel: kategori adı + ürün sayısı, panelin ortasında dikey hizalı */
    const name = pdfText(lang, category?.name, category?.name_en, category?.name || "") || "";
    const fs = 32, lead = 37, nameW = W - 2 * M, nl = pdfWrapText(name, nameW, fs, 2).length;
    const blockH = nl * lead + 34, panelTop = photoY - 3, panelBottom = 80;
    let y = panelTop - ((panelTop - panelBottom) - blockH) / 2 - fs * 0.8;
    c += pdfTextOp(name, M, y, fs, { bold: true, maxWidth: nameW, maxLines: 2, leading: lead, color: [1, 1, 1] });
    y -= (nl - 1) * lead + 26;
    const count = (category?.items || []).filter(Boolean).length;
    c += pdfRect(M, y + 8, 32, 1.8, acc);
    c += pdfTextOp(lang === "EN" ? `${count} ${count === 1 ? "PRODUCT" : "PRODUCTS"}` : `${count} ÜRÜN`, M + 42, y + 4.5, 9.5, { bold: true, color: [0.72, 0.72, 0.72] });
    /* Alt şerit: logo, web sitesi, sayfa numarası */
    c += pdfLine(M, 74, W - M, 74, [0.16, 0.16, 0.16], .5);
    if (logo) {
        const lg = { ...logo, id: 2 };
        images.set("__categoryLogo__", lg);
        c += pdfDrawImage("Im2", lg, M - 4, 26, 130, 40, true);
    }
    else
        c += pdfTextOp(String(data.siteName || "").toUpperCase(), M, 40, 10, { bold: true, color: [1, 1, 1] });
    const site = data.pdf?.website || data.pdf?.footer || "";
    if (site)
        c += pdfTextOp(site, W - M, 40, 8, { align: "right", maxWidth: 220, maxLines: 1, color: [0.6, 0.6, 0.6] });
    if (data.pdf?.showPageNumbers !== false)
        c += pdfTextOp(String(pageNo), W - M, 26, 8, { align: "right", bold: true, color: [0.45, 0.45, 0.45] });
    return { content: c, images, pageNo };
}
async function renderPdfCatalogPage(data, lang, blocks, pageNo, preparedImages, opts = {}) {
    const L = PDF_LAYOUT, W = L.W, H = L.H;
    let content = pdfPageChrome(data, pageNo), images = new Map(), yTop = L.top, imageId = 1;
    const imageMap = preparedImages || new Map();
    for (const block of blocks) {
        if (block.type === "category") {
            const h = L.categoryH;
            content += pdfCategoryBlock(block.category, lang, L.left, H - yTop - h, L.cardW);
            yTop += h + L.gap;
            continue;
        }
        if (block.type === "sizeRow" || block.type === "modelRow") {
            const acc = pdfHexToRgb(data?.theme?.accent), useImg = src => { if (!src)
                return null; const prep = imageMap.get(src); if (!prep)
                return null; let a = images.get(src); if (!a) {
                a = { ...prep, id: imageId++ };
                images.set(src, a);
            } return a; };
            const h = block.h, y = H - yTop - h;
            if (block.type === "sizeRow") {
                const w = pdfSizeColW();
                block.items.forEach((it, i) => { content += pdfSizeCard(data, it, lang, L.left + i * (w + PDF_SIZE.gap), y, w, h, useImg(pdfProductImageSource(it, data)), acc); });
            }
            else
                content += pdfModelRow(data, block.item, lang, L.left, y, L.cardW, h, useImg, acc);
            yTop += h + L.gap;
            continue;
        }
        const item = block.item, h = (opts.cardHeight || pdfCardHeight)(item);
        if (yTop + h > H - L.bottom)
            console.warn("PDF: ürün sayfa sınırını aşıyor, yine de basılıyor:", item?.id);
        const src = pdfProductImageSource(item, data), preparedAsset = src ? imageMap.get(src) : null;
        /* Aynı görseli kullanan ürünler aynı XObject'i paylaşır (önceden ikinci ürün ilkinin görsel referansını bozuyordu). */
        let asset = null;
        if (preparedAsset) {
            asset = images.get(src) || { ...preparedAsset, id: imageId++ };
            images.set(src, asset);
        }
        const y = H - yTop - h;
        content += (opts.catalog ? pdfCatalogListBlock : pdfProductBlock)(data, block.category, item, lang, L.left, y, L.cardW, h, asset, asset?.id || imageId++);
        yTop += h + L.gap;
    }
    content += pdfTextOp(data.pdf?.footer || data.pdf?.website || "www.ofishci.com", L.left, 14, 7.5, { maxWidth: 260, maxLines: 1 });
    return { content, images, pageNo };
}
