/* -------------------- APP -------------------- */
/* Yönetim panelindeki şablon seçicisi için küçük şematik önizleme. */
function CatalogTemplateThumb({ id, accent }) {
    const a = accent || "#C9A227", img = "#3a3a3a", ln = "#5a5a5a", bg = "#f4f2ee";
    const page = c => React.createElement("svg", { viewBox: "0 0 60 80", className: "w-full h-auto rounded-md", "aria-hidden": "true", style: { background: bg, maxHeight: 96 } }, c);
    if (id === "klasik")
        return page(React.createElement(React.Fragment, null, [0, 1, 2, 3].map(i => React.createElement("g", { key: i },
            React.createElement("rect", { x: "5", y: 6 + i * 18, width: "50", height: "16", fill: "#fff", stroke: "#999", strokeWidth: ".5" }),
            React.createElement("rect", { x: "5", y: 6 + i * 18, width: "50", height: "3", fill: "#111" }),
            React.createElement("rect", { x: "7", y: 11 + i * 18, width: "14", height: "9", fill: img }),
            React.createElement("rect", { x: "24", y: 12 + i * 18, width: "28", height: "1.6", fill: ln }),
            React.createElement("rect", { x: "24", y: 15 + i * 18, width: "22", height: "1.6", fill: ln }),
            React.createElement("rect", { x: "24", y: 18 + i * 18, width: "25", height: "1.6", fill: ln })))));
    if (id === "vitrin")
        return page(React.createElement(React.Fragment, null,
            React.createElement("rect", { x: "6", y: "6", width: "10", height: "1.5", fill: a }),
            React.createElement("rect", { x: "6", y: "10", width: "34", height: "3.5", fill: "#222" }),
            React.createElement("rect", { x: "6", y: "17", width: "48", height: "32", fill: img }),
            [0, 1, 2].map(i => React.createElement("rect", { key: i, x: 6 + i * 13, y: "52", width: "11", height: "7", fill: "#777" })),
            React.createElement("rect", { x: "6", y: "62", width: "44", height: "1.4", fill: ln }),
            React.createElement("rect", { x: "6", y: "66", width: "48", height: "3", fill: "#111" }),
            React.createElement("rect", { x: "6", y: "70", width: "48", height: "1.4", fill: ln }),
            React.createElement("rect", { x: "6", y: "73", width: "48", height: "1.4", fill: ln })));
    if (id === "izgara")
        return page(React.createElement(React.Fragment, null,
            React.createElement("rect", { x: "6", y: "6", width: "26", height: "3", fill: "#222" }),
            React.createElement("rect", { x: "6", y: "11", width: "48", height: ".8", fill: a }),
            [0, 1, 2, 3, 4, 5].map(i => { const x = 6 + (i % 2) * 25, y = 15 + Math.floor(i / 2) * 21; return React.createElement("g", { key: i },
                React.createElement("rect", { x: x, y: y, width: "23", height: "19", fill: "#fff", stroke: "#bbb", strokeWidth: ".5" }),
                React.createElement("rect", { x: x + 1, y: y + 1, width: "21", height: "10", fill: img }),
                React.createElement("rect", { x: x + 2, y: y + 13, width: "14", height: "1.6", fill: "#222" }),
                React.createElement("rect", { x: x + 2, y: y + 16, width: "18", height: "1.2", fill: ln })); })));
    return page(React.createElement(React.Fragment, null,
        React.createElement("rect", { x: "6", y: "6", width: "26", height: "3", fill: "#222" }),
        React.createElement("rect", { x: "6", y: "11", width: "48", height: ".8", fill: a }),
        React.createElement("rect", { x: "6", y: "15", width: "27", height: "28", fill: img }),
        React.createElement("rect", { x: "36", y: "17", width: "8", height: "3", fill: a }),
        React.createElement("rect", { x: "36", y: "23", width: "17", height: "2.4", fill: "#222" }),
        React.createElement("rect", { x: "36", y: "28", width: "16", height: "1.3", fill: ln }),
        React.createElement("rect", { x: "36", y: "31", width: "14", height: "1.3", fill: ln }),
        React.createElement("rect", { x: "27", y: "47", width: "27", height: "28", fill: img }),
        React.createElement("rect", { x: "6", y: "49", width: "8", height: "3", fill: a }),
        React.createElement("rect", { x: "6", y: "55", width: "17", height: "2.4", fill: "#222" }),
        React.createElement("rect", { x: "6", y: "60", width: "16", height: "1.3", fill: ln }),
        React.createElement("rect", { x: "6", y: "63", width: "14", height: "1.3", fill: ln })));
}
function ProductImageLightbox({ fullScreenImage, setFullScreenImage, onClose }) {
    const [zoom, setZoom] = useState(1), [pan, setPan] = useState({ x: 0, y: 0 });
    const pointersRef = useRef(new Map()), gestureRef = useRef(null), dragRef = useRef(null), swipeRef = useRef(null);
    const imgs = fullScreenImage?.images || [];
    const index = Math.max(0, Math.min(fullScreenImage?.index || 0, Math.max(imgs.length - 1, 0)));
    const clampZoom = z => Math.min(4, Math.max(1, z));
    const clampPan = p => { const limit = Math.max(0, Math.min(window.innerWidth, window.innerHeight) * 0.72 * (zoom - 1)); return { x: Math.max(-limit, Math.min(limit, p.x)), y: Math.max(-limit, Math.min(limit, p.y)) }; };
    const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
    useEffect(() => { resetView(); }, [fullScreenImage?.index]);
    useEffect(() => {
        const onKey = e => {
            if (e.key === "Escape")
                onClose();
            else if (e.key === "ArrowRight" && imgs.length > 1) {
                setFullScreenImage(v => ({ ...v, index: (v.index + 1) % imgs.length }));
            }
            else if (e.key === "ArrowLeft" && imgs.length > 1) {
                setFullScreenImage(v => ({ ...v, index: (v.index - 1 + imgs.length) % imgs.length }));
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [imgs.length, onClose, setFullScreenImage]);
    const distance = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const onPointerDown = e => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        const map = pointersRef.current;
        map.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
        if (map.size === 1) {
            dragRef.current = zoom > 1 ? { x: e.clientX, y: e.clientY, pan: { ...pan } } : null;
            swipeRef.current = { x: e.clientX, y: e.clientY };
        }
        if (map.size === 2) {
            const pts = [...map.values()];
            gestureRef.current = { dist: distance(pts[0], pts[1]), zoom, pan: { ...pan } };
            dragRef.current = null;
        }
    };
    const onPointerMove = e => {
        const map = pointersRef.current;
        if (!map.has(e.pointerId))
            return;
        e.preventDefault();
        e.stopPropagation();
        map.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
        if (map.size === 2 && gestureRef.current) {
            const pts = [...map.values()];
            const ratio = distance(pts[0], pts[1]) / Math.max(gestureRef.current.dist, 1);
            const nz = clampZoom(gestureRef.current.zoom * ratio);
            setZoom(nz);
            setPan(p => nz === 1 ? { x: 0, y: 0 } : clampPan(p));
            return;
        }
        if (dragRef.current && zoom > 1) {
            setPan(clampPan({ x: dragRef.current.pan.x + (e.clientX - dragRef.current.x), y: dragRef.current.pan.y + (e.clientY - dragRef.current.y) }));
        }
    };
    const onPointerUp = e => {
        e.preventDefault();
        e.stopPropagation();
        const map = pointersRef.current, start = swipeRef.current;
        if (start && map.size === 1 && !gestureRef.current) {
            const dx = e.clientX - start.x, dy = e.clientY - start.y;
            if (zoom === 1 && imgs.length > 1 && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
                setFullScreenImage(v => ({ ...v, index: (v.index + (dx < 0 ? 1 : -1) + imgs.length) % imgs.length }));
            }
        }
        map.delete(e.pointerId);
        if (map.size < 2)
            gestureRef.current = null;
        if (map.size === 0) {
            dragRef.current = null;
            swipeRef.current = null;
        }
    };
    const onWheel = e => { e.preventDefault(); e.stopPropagation(); const next = clampZoom(zoom * (e.deltaY < 0 ? 1.12 : .89)); setZoom(next); if (next === 1)
        setPan({ x: 0, y: 0 });
    else
        setPan(clampPan(pan)); };
    const onDoubleClick = e => { e.preventDefault(); e.stopPropagation(); const next = zoom > 1 ? 1 : 2; setZoom(next); if (next === 1)
        setPan({ x: 0, y: 0 }); };
    const prev = e => { e.preventDefault(); e.stopPropagation(); if (imgs.length > 1)
        setFullScreenImage(v => ({ ...v, index: (v.index - 1 + imgs.length) % imgs.length })); };
    const next = e => { e.preventDefault(); e.stopPropagation(); if (imgs.length > 1)
        setFullScreenImage(v => ({ ...v, index: (v.index + 1) % imgs.length })); };
    if (!fullScreenImage)
        return null;
    return React.createElement("div", { className: "fixed inset-0 z-[300] image-lightbox flex items-center justify-center", onClick: onClose },
        React.createElement("div", { className: "image-lightbox-card", onClick: e => e.stopPropagation(), onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, onPointerCancel: onPointerUp, onWheel: onWheel, onDoubleClick: onDoubleClick, style: { cursor: zoom > 1 ? "grab" : "default" } },
            React.createElement(CachedImage, { loading: "eager", src: imgs[index] || imgs[0], alt: "\u00DCr\u00FCn foto\u011Fraf\u0131", draggable: "false", style: { transform: `translate3d(${pan.x}px,${pan.y}px,0) scale(${zoom})`, transition: (dragRef.current || gestureRef.current) ? "none" : "transform .32s cubic-bezier(.22,1,.36,1)" } })),
        imgs.length > 1 && React.createElement(React.Fragment, null,
            React.createElement("button", { type: "button", className: "image-lightbox-nav left", onClick: prev, "aria-label": "\u00D6nceki foto\u011Fraf" },
                React.createElement("span", { style: { display: "flex", transform: "rotate(180deg)" } },
                    React.createElement(Icon, { type: "arrow", size: 22 }))),
            React.createElement("button", { type: "button", className: "image-lightbox-nav right", onClick: next, "aria-label": "Sonraki foto\u011Fraf" },
                React.createElement(Icon, { type: "arrow", size: 22 }))),
        imgs.length > 1 && React.createElement("div", { className: "lightbox-count", onClick: e => e.stopPropagation() },
            index + 1,
            " / ",
            imgs.length),
        React.createElement("button", { type: "button", className: "image-lightbox-close", onClick: e => { e.stopPropagation(); onClose(); }, "aria-label": "Kapat" },
            React.createElement(Icon, { type: "x", size: 22 })));
}
