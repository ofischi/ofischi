/* -------------------- PDF PRICE LIST -------------------- */
/*
   PDF LAYOUT — ORIGINAL OFISCHI GRID
   A4 portrait, fixed x coordinates, one identical product template.
   The original reference uses compact stacked product blocks on page 2;
   this implementation keeps that logic while removing KG / M³ as requested.
*/
function pdfText(lang, tr, en, fallback) { return getText(lang, tr, en, fallback || tr); }
function pdfCurrencyInfo(data) {
    const id = data?.currency?.selected || "TRY";
    const rate = id === "USD" ? Number(data?.currency?.usdRate) : id === "EUR" ? Number(data?.currency?.eurRate) : 1;
    return { id, rate: rate > 0 ? rate : 1 };
}
function pdfMoney(data, amount) {
    if (amount === null || amount === undefined || amount === "" || !Number.isFinite(Number(amount)))
        return "—";
    return formatAmountByData(data, amount) || "—";
}
function pdfTotal(data, item, lang) {
    const total = priceTotal(item?.price);
    if (total !== null)
        return pdfMoney(data, total);
    const p = normalizePrice(item?.price);
    return p.parts.some(x => x.contactOnly) ? (lang === "EN" ? "Contact us" : "İletişime geçin") : "—";
}
function pdfCleanDims(value) { return String(value || "—").replace(/\b(kg|m³|m3)\b/gi, "").replace(/\s{2,}/g, " ").trim() || "—"; }
function pdfDimsParts(value) {
    const s = pdfCleanDims(value), nums = s.match(/[-+]?\d+(?:[.,]\d+)?/g) || [];
    return [nums[0] || "—", nums[1] || "—", nums[2] || "—"];
}
function pdfRowsForItem(item) {
    const p = normalizePrice(item?.price);
    if (p.parts.length)
        return p.parts;
    return [{ name: item?.name || "", name_en: item?.name_en || "", dims: item?.dims || "", dims_en: item?.dims_en || "", amount: p.amount, contactOnly: p.contactOnly }];
}
/* -------------------- STRICT PDF DATA / IMAGE BOUNDARIES -------------------- */
function pdfImageSource(value) {
    if (typeof value === "string")
        return value.trim();
    if (value && typeof value === "object")
        return String(value.src || value.data || value.url || "").trim();
    return "";
}
function pdfValidProductId(item) {
    const id = item?.id;
    /* Kısa/eski kimlikli gerçek ürünler de PDF'e girer (önceden 4 karakterden kısa kimlikler sessizce atlanıyordu). */
    return (typeof id === "string" && id.trim().length > 0) || (typeof id === "number" && Number.isFinite(id));
}
function pdfHasRealProductData(item) {
    if (!item || typeof item !== "object")
        return false;
    const price = item.price;
    const hasPrice = !!price && ((Array.isArray(price.parts) && price.parts.some(p => p && ((p.amount !== null && p.amount !== undefined && p.amount !== "") || String(p.name ?? "").trim()))) ||
        (price.amount !== null && price.amount !== undefined && price.amount !== ""));
    return !!pdfImageSource(item.image) || (Array.isArray(item.images) && item.images.some(Boolean)) || !!String(item.dims ?? "").trim() || !!String(item.desc ?? "").trim() || hasPrice;
}
function pdfIsDemoProduct(item) {
    if (!item || typeof item !== "object")
        return true;
    if (!pdfValidProductId(item))
        return true;
    if (item.isDemo === true || item.placeholder === true || item.temporary === true)
        return true;
    const name = String(item.name ?? "").trim();
    if (!name)
        return true;
    /* Only an empty legacy placeholder named Yeni Ürün/New Product is removed. */
    if (/^(yeni\s*ürün|new\s*product)$/i.test(name) && !pdfHasRealProductData(item))
        return true;
    return false;
}
function pdfProductImageSource(item, data) {
    const src = pdfImageSource(item?.image) || pdfImageSource(Array.isArray(item?.images) ? item.images.find(Boolean) : "");
    if (!src)
        return "";
    /* Product image can ONLY come from this exact item's image field. */
    const logo = pdfImageSource(data?.logo?.src);
    if (logo && src === logo)
        return "";
    for (const category of (data?.categories || [])) {
        const cover = pdfImageSource(category?.coverImage);
        if (cover && src === cover)
            return "";
    }
    return src;
}
function pdfRealCategories(rawData) {
    const source = rawData && typeof rawData === "object" ? rawData : {};
    const categories = Array.isArray(source.categories) ? source.categories : [];
    return categories.map(category => {
        if (!category || typeof category !== "object")
            return null;
        const rawItems = Array.isArray(category.items) ? category.items : [];
        const items = rawItems.filter(item => !pdfIsDemoProduct(item)).map(item => {
            const normalized = normalizeItem(item);
            /* One PDF product = one source item. No fields are borrowed from another item. */
            return {
                ...normalized,
                id: item.id,
                categoryId: category.id,
                categoryName: category.name,
                categoryName_en: category.name_en,
                image: pdfProductImageSource(item, source) || null
            };
        });
        return { ...category, items };
    }).filter(Boolean).filter(category => category.items.length > 0);
}
async function pdfPrepareImages(data) {
    const prepared = pdfRealCategories(data), images = new Map();
    for (const category of prepared) {
        for (const item of category.items) {
            const src = pdfProductImageSource(item, data);
            if (src && !images.has(src))
                images.set(src, null);
            /* Model sırası düzeni: her modelin (Müdür, Şef…) kendi fotoğrafı */
            for (const part of normalizePrice(item.price).parts) {
                const ps = pdfImageSource(part.image);
                if (ps && !images.has(ps))
                    images.set(ps, null);
            }
            for (const g of (Array.isArray(item.images) ? item.images : []).slice(0, 10)) {
                const gs = pdfImageSource(g);
                if (gs && !images.has(gs))
                    images.set(gs, null);
            }
        }
    }
    await Promise.all([...images.keys()].map(async (src) => images.set(src, await pdfImageAsset(src))));
    return { data: { ...data, categories: prepared }, images };
}
/* Embedded DejaVu Sans: real Unicode text in the PDF, including Ç Ş Ğ İ Ö Ü ı. */
