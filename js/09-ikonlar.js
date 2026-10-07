/* -------------------- ICON -------------------- */
function Icon({ type, size = 18, className }) {
    const props = { width: size, height: size, className, "aria-hidden": true, focusable: "false", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
    let c = null;
    if (type === "settings")
        c = React.createElement(React.Fragment, null,
            React.createElement("circle", { cx: "12", cy: "12", r: "3" }),
            React.createElement("path", { d: "M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1.1 1.6v.1h-2.4v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.7-1.7.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1.1H6v-2.4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L9 6.7l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 12 5.5v-.1h2.4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.7 1.7-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1.1h.1V14h-.1a1.7 1.7 0 0 0-1.6 1z" }));
    else if (type === "x")
        c = React.createElement(React.Fragment, null,
            React.createElement("path", { d: "M6 6l12 12" }),
            React.createElement("path", { d: "M18 6L6 18" }));
    else if (type === "plus")
        c = React.createElement(React.Fragment, null,
            React.createElement("path", { d: "M12 5v14" }),
            React.createElement("path", { d: "M5 12h14" }));
    else if (type === "trash")
        c = React.createElement(React.Fragment, null,
            React.createElement("path", { d: "M3 6h18" }),
            React.createElement("path", { d: "M8 6V4h8v2" }),
            React.createElement("path", { d: "M19 6l-1 14H6L5 6" }),
            React.createElement("path", { d: "M10 11v5" }),
            React.createElement("path", { d: "M14 11v5" }));
    else if (type === "upload")
        c = React.createElement(React.Fragment, null,
            React.createElement("path", { d: "M12 16V4" }),
            React.createElement("path", { d: "M7 9l5-5 5 5" }),
            React.createElement("path", { d: "M5 20h14" }));
    else if (type === "download")
        c = React.createElement(React.Fragment, null,
            React.createElement("path", { d: "M12 4v12" }),
            React.createElement("path", { d: "m7 11 5 5 5-5" }),
            React.createElement("path", { d: "M5 20h14" }));
    else if (type === "up")
        c = React.createElement("path", { d: "m18 15-6-6-6 6" });
    else if (type === "down")
        c = React.createElement("path", { d: "m6 9 6 6 6-6" });
    else if (type === "save")
        c = React.createElement(React.Fragment, null,
            React.createElement("path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" }),
            React.createElement("path", { d: "M17 21v-8H7v8" }),
            React.createElement("path", { d: "M7 3v5h8" }));
    else if (type === "image")
        c = React.createElement(React.Fragment, null,
            React.createElement("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }),
            React.createElement("circle", { cx: "8.5", cy: "8.5", r: "1.5" }),
            React.createElement("path", { d: "m21 15-5-5L5 21" }));
    else if (type === "lock")
        c = React.createElement(React.Fragment, null,
            React.createElement("rect", { x: "4", y: "10", width: "16", height: "10", rx: "2" }),
            React.createElement("path", { d: "M8 10V7a4 4 0 0 1 8 0v3" }));
    else if (type === "check")
        c = React.createElement("path", { d: "m5 12 4 4L19 6" });
    else if (type === "phone")
        c = React.createElement("path", { d: "M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.07 5.18 2 2 0 0 1 5.05 3h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L9 10.73a16 16 0 0 0 4.27 4.27l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z" });
    else if (type === "search")
        c = React.createElement(React.Fragment, null,
            React.createElement("circle", { cx: "11", cy: "11", r: "7" }),
            React.createElement("path", { d: "m20 20-4-4" }));
    else if (type === "arrow")
        c = React.createElement(React.Fragment, null,
            React.createElement("path", { d: "M5 12h14" }),
            React.createElement("path", { d: "m13 6 6 6-6 6" }));
    else if (type === "globe")
        c = React.createElement(React.Fragment, null,
            React.createElement("circle", { cx: "12", cy: "12", r: "9" }),
            React.createElement("path", { d: "M3 12h18" }),
            React.createElement("path", { d: "M12 3a14 14 0 0 1 0 18" }),
            React.createElement("path", { d: "M12 3a14 14 0 0 0 0 18" }));
    else if (type === "spark")
        c = React.createElement(React.Fragment, null,
            React.createElement("path", { d: "m12 3-1.5 5.5L5 10l5.5 1.5L12 17l1.5-5.5L19 10l-5.5-1.5Z" }),
            React.createElement("path", { d: "m19 16-.7 2.3L16 19l2.3.7L19 22l.7-2.3L22 19l-2.3-.7Z" }));
    return React.createElement("svg", { ...props }, c);
}
function AdminLabel({ children }) { return React.createElement("div", { style: { color: "#737373", fontSize: "10px", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: "6px" } }, children); }
function ColorInput({ label, value, onChange }) { return React.createElement("label", { className: "flex items-center justify-between mb-3" },
    React.createElement("span", { className: "text-xs text-neutral-400" }, label),
    React.createElement("input", { type: "color", value: value || "#000000", onChange: e => onChange(e.target.value), className: "w-9 h-9 rounded-lg border border-neutral-700 bg-transparent cursor-pointer" })); }
