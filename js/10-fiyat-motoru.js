/* -------------------- SHARED PRICE ENGINE FOR PDF + WEB -------------------- */
function getCurrencyByData(source) {
    const id = source?.currency?.selected || "TRY";
    return CURRENCIES.find(x => x.id === id) || CURRENCIES[0];
}
function convertPriceByData(source, amount) {
    if (amount === null || amount === undefined || amount === "")
        return null;
    const n = Number(amount), c = source?.currency?.selected || "TRY";
    if (!Number.isFinite(n))
        return null;
    if (c === "USD") {
        const r = Number(source?.currency?.usdRate);
        return r > 0 ? n / r : null;
    }
    if (c === "EUR") {
        const r = Number(source?.currency?.eurRate);
        return r > 0 ? n / r : null;
    }
    return n;
}
function formatAmountByData(source, amount) {
    const v = convertPriceByData(source, amount);
    if (v === null)
        return null;
    const c = getCurrencyByData(source);
    /* Kuruş / cent yazılmaz: ondalık kısım yuvarlanmadan doğrudan atılır (21.560,63 → 21.560). */
    const locale = c.id === "TRY" ? "tr-TR" : "en-US";
    const s = Math.floor(Math.abs(v) + 1e-9).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return c.id === "USD" ? "$" + s : c.id === "EUR" ? "€" + s : s + " ₺";
}
