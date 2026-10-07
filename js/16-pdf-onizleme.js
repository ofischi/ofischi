/* -------------------- PDF ÖN İZLEME -------------------- */
/* PDF dosyası verilmeden önce sayfalar, PDF'i oluşturan aynı çizim komutlarından canvas'a çizilir.
   Dış kütüphane / iframe gerekmez (CSP kapalı kalır); sayfalar kaydırıldıkça çizilir. */
const PDF_GID_TO_CP = (() => { const m = {}; for (const k in PDF_FONT_CMAP) {
    const g = PDF_FONT_CMAP[k];
    if (!(g in m))
        m[g] = Number(k);
} return m; })();
const pdfPreviewImageCache = new Map();
function pdfPreviewLoadImage(dataUri) {
    if (pdfPreviewImageCache.has(dataUri))
        return pdfPreviewImageCache.get(dataUri);
    const p = new Promise(resolve => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => resolve(null); im.src = dataUri; });
    pdfPreviewImageCache.set(dataUri, p);
    return p;
}
async function pdfRenderPageToCanvas(page, canvas, scale) {
    const { width: PW, height: PH } = pdfPageMetrics();
    canvas.width = Math.round(PW * scale);
    canvas.height = Math.round(PH * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx)
        return;
    const imgs = new Map();
    for (const asset of page.images.values()) {
        if (asset && asset.data)
            imgs.set("Im" + asset.id, await pdfPreviewLoadImage(asset.data));
    }
    ctx.setTransform(scale, 0, 0, -scale, 0, PH * scale);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, PW, PH);
    const toks = String(page.content).match(/\/[A-Za-z0-9]+|<[0-9A-Fa-f]*>|-?\d*\.?\d+|[A-Za-z*]+/g) || [];
    let st = [], fill = "rgb(0,0,0)", stroke = "rgb(0,0,0)", size = 10, tm = [1, 0, 0, 1, 0, 0], bold = false;
    const col = (r, g, b) => `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
    ctx.lineJoin = "round";
    for (const t of toks) {
        if (/^(-?\d*\.?\d+|\/.+|<.*>)$/.test(t)) {
            st.push(t);
            continue;
        }
        const n = (i) => Number(st[st.length - i]);
        switch (t) {
            case "rg":
                fill = col(n(3), n(2), n(1));
                break;
            case "RG":
                stroke = col(n(3), n(2), n(1));
                break;
            case "w":
                ctx.lineWidth = n(1);
                break;
            case "q":
                ctx.save();
                break;
            case "Q":
                ctx.restore();
                break;
            case "cm":
                ctx.transform(n(6), n(5), n(4), n(3), n(2), n(1));
                break;
            case "m":
                ctx.beginPath();
                ctx.moveTo(n(2), n(1));
                break;
            case "l":
                ctx.lineTo(n(2), n(1));
                break;
            case "c":
                ctx.bezierCurveTo(n(6), n(5), n(4), n(3), n(2), n(1));
                break;
            case "h":
                ctx.closePath();
                break;
            case "re":
                ctx.beginPath();
                ctx.rect(n(4), n(3), n(2), n(1));
                break;
            case "f":
                ctx.fillStyle = fill;
                ctx.fill();
                break;
            case "S":
                ctx.strokeStyle = stroke;
                ctx.stroke();
                break;
            case "W":
                ctx.clip();
                break;
            case "n":
                ctx.beginPath();
                break;
            case "Do": {
                const im = imgs.get(String(st[st.length - 1]).slice(1));
                if (im) {
                    ctx.save();
                    ctx.transform(1, 0, 0, -1, 0, 1);
                    ctx.drawImage(im, 0, 0, 1, 1);
                    ctx.restore();
                }
                break;
            }
            case "BT":
                tm = [1, 0, 0, 1, 0, 0];
                break;
            case "Tr":
                bold = n(1) === 2;
                break;
            case "Tf":
                size = n(1);
                break;
            case "Tm":
                tm = [n(6), n(5), n(4), n(3), n(2), n(1)];
                break;
            case "Tj": {
                const hex = String(st[st.length - 1]).slice(1, -1);
                let text = "", wUnits = 0;
                for (let i = 0; i + 3 < hex.length + 1; i += 4) {
                    const gid = parseInt(hex.substr(i, 4), 16);
                    if (Number.isNaN(gid))
                        continue;
                    text += String.fromCodePoint(PDF_GID_TO_CP[gid] || 63);
                    wUnits += PDF_FONT_WIDTHS[gid] || 0;
                }
                const target = wUnits / PDF_FONT_METRICS.unitsPerEm * size;
                ctx.save();
                ctx.transform(tm[0], tm[1], tm[2], tm[3], tm[4], tm[5]);
                ctx.scale(1, -1);
                ctx.font = `${bold ? "700 " : "400 "}${size}px Inter, "Segoe UI", Roboto, Arial, sans-serif`;
                ctx.fillStyle = fill;
                const m = ctx.measureText(text).width;
                if (m > 0 && target > 0)
                    ctx.scale(target / m, 1);
                ctx.fillText(text, 0, 0);
                ctx.restore();
                break;
            }
            case "Tf_":
                break;
            default: break;
        }
        st = [];
    }
}
function PdfPreviewModal({ preview, language, onClose, onDownload }) {
    const EN = language === "EN";
    const hostRef = useRef(null), [zoom, setZoom] = useState(false);
    useEffect(() => {
        const onKey = e => { if (e.key === "Escape")
            onClose(); };
        document.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
    }, []);
    useEffect(() => {
        const host = hostRef.current;
        if (!host)
            return;
        const scale = Math.min(2, Math.max(1.4, (window.devicePixelRatio || 1) * 1.1));
        const done = new Set();
        const draw = async (cv) => {
            if (done.has(cv))
                return;
            done.add(cv);
            const idx = Number(cv.dataset.page);
            try {
                await pdfRenderPageToCanvas(preview.pages[idx], cv, scale);
                cv.dataset.ready = "1";
            }
            catch (e) {
                console.warn("Ön izleme sayfası çizilemedi:", e);
            }
        };
        const canvases = Array.from(host.querySelectorAll("canvas"));
        if (typeof IntersectionObserver === "undefined") {
            canvases.slice(0, 6).forEach(draw);
            return;
        }
        /* Görünür alana yaklaşan sayfa çizilir; çok uzaklaşan sayfanın belleği boşaltılır (600+ sayfalık katalogda telefon donmasın). */
        const io = new IntersectionObserver(entries => { entries.forEach(en => { const cv = en.target; if (en.isIntersecting)
            draw(cv);
        else if (done.has(cv) && cv.dataset.ready === "1") {
            done.delete(cv);
            cv.dataset.ready = "";
            cv.width = 0;
            cv.height = 0;
        } }); }, { root: host, rootMargin: "1600px 0px" });
        canvases.forEach(cv => io.observe(cv));
        return () => io.disconnect();
    }, [preview]);
    const count = preview.pages.length;
    return React.createElement("div", { role: "dialog", "aria-modal": "true", "aria-label": EN ? "PDF preview" : "PDF ön izleme", className: "fixed inset-0 flex flex-col", style: { zIndex: 400, background: "#0b0b0d" } },
        React.createElement("div", { className: "flex items-center gap-2 px-3 py-3 text-white", style: { paddingTop: "max(12px, env(safe-area-inset-top))", borderBottom: "1px solid rgba(255,255,255,.1)" } },
            React.createElement("div", { className: "min-w-0 flex-1" },
                React.createElement("div", { className: "text-sm font-bold truncate" }, preview.title),
                React.createElement("div", { className: "text-[11px] opacity-70" }, EN ? `${count} pages · tap a page to zoom` : `${count} sayfa · yakınlaştırmak için sayfaya dokunun`)),
            React.createElement("button", { type: "button", onClick: onDownload, className: "min-h-[44px] px-4 rounded-xl text-sm font-bold flex items-center gap-2", style: { background: preview.accent || "#C9A227", color: "#111" } },
                React.createElement(Icon, { type: "download", size: 16 }),
                EN ? "Download PDF" : "PDF'i İndir"),
            React.createElement("button", { type: "button", "aria-label": EN ? "Close preview" : "Ön izlemeyi kapat", onClick: onClose, className: "w-11 h-11 flex items-center justify-center rounded-full hover:text-white", style: { color: "rgba(255,255,255,.8)" } },
                React.createElement(Icon, { type: "x", size: 21 }))),
        React.createElement("div", { ref: hostRef, className: "flex-1 overscroll-contain px-3", style: { overflow: "auto", minHeight: 0, paddingTop: 16, paddingBottom: 24, WebkitOverflowScrolling: "touch" }, "data-pdf-preview": "1" },
            React.createElement("div", { className: "mx-auto flex flex-col", style: zoom ? { width: "max(200%, 1100px)", maxWidth: "none", gap: 16 } : { maxWidth: 760, gap: 16 } }, preview.pages.map((p, i) => React.createElement("div", { key: i, className: "relative", onClick: e => { const el = e.currentTarget; setZoom(z => !z); requestAnimationFrame(() => requestAnimationFrame(() => { try {
                    el.scrollIntoView({ block: "start", inline: "start" });
                }
                catch (_) { } })); }, style: { cursor: zoom ? "zoom-out" : "zoom-in" } },
                React.createElement("canvas", { "data-page": i, "aria-label": (EN ? "Page " : "Sayfa ") + (i + 1), style: { width: "100%", aspectRatio: "595.28 / 841.89", background: "#fff", borderRadius: 6, display: "block", boxShadow: "0 6px 30px rgba(0,0,0,.45)" } }),
                React.createElement("div", { className: "absolute text-[10px] font-bold px-2 rounded-full", style: { right: 12, bottom: 8, paddingTop: 2, paddingBottom: 2, background: "rgba(0,0,0,.55)", color: "#fff" } }, i + 1 + " / " + count))))));
}

