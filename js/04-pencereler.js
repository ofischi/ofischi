/* ===== Sitenin cam tasarımlı pencereleri =====
   Tarayıcının kendi confirm / alert / prompt pencereleri KULLANILMAZ. Metinler textContent ile yazılır (HTML enjeksiyonu olamaz). */
const __dlgQueue = [];
let __dlgBusy = false;
function askConfirm(message, opts = {}) {
    return new Promise(resolve => { __dlgQueue.push({ message: String(message ?? ""), opts: opts || {}, resolve, notice: false }); if (!__dlgBusy)
        __dlgNext(); });
}
function askNotice(message, opts = {}) {
    return new Promise(resolve => { __dlgQueue.push({ message: String(message ?? ""), opts: { ok: "Tamam", title: "Bilgi", ...(opts || {}) }, resolve, notice: true }); if (!__dlgBusy)
        __dlgNext(); });
}
if (typeof window !== "undefined")
    window.alert = m => { askNotice(m); };
function __dlgNext() {
    const job = __dlgQueue.shift();
    if (!job) {
        __dlgBusy = false;
        return;
    }
    __dlgBusy = true;
    const o = job.opts, danger = !!o.danger, prevFocus = document.activeElement;
    const accent = (typeof window !== "undefined" && window.__ofAccent) || "#C9A227";
    const uidn = "of-dlg-" + Math.random().toString(36).slice(2, 8);
    const wrap = document.createElement("div");
    wrap.className = "of-dlg-wrap";
    wrap.style.setProperty("--of-accent", accent);
    const card = document.createElement("div");
    card.className = "of-dlg" + (danger ? " is-danger" : "");
    card.setAttribute("role", job.notice ? "dialog" : "alertdialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-labelledby", uidn + "-t");
    card.setAttribute("aria-describedby", uidn + "-m");
    const ic = document.createElement("div");
    ic.className = "of-dlg-ic";
    ic.textContent = danger ? "!" : (job.notice ? "i" : "?");
    ic.setAttribute("aria-hidden", "true");
    const title = document.createElement("div");
    title.className = "of-dlg-t";
    title.id = uidn + "-t";
    title.textContent = o.title || (danger ? "Emin misiniz?" : (job.notice ? "Bilgi" : "Onay"));
    const msg = document.createElement("div");
    msg.className = "of-dlg-m";
    msg.id = uidn + "-m";
    msg.textContent = job.message;
    const row = document.createElement("div");
    row.className = "of-dlg-row";
    const btnCancel = document.createElement("button");
    btnCancel.type = "button";
    btnCancel.className = "of-dlg-btn";
    btnCancel.textContent = o.cancel || "Vazgeç";
    const btnOk = document.createElement("button");
    btnOk.type = "button";
    btnOk.className = "of-dlg-btn is-ok";
    btnOk.textContent = o.ok || (danger ? "Sil" : "Tamam");
    if (!job.notice)
        row.appendChild(btnCancel);
    row.appendChild(btnOk);
    card.appendChild(ic);
    card.appendChild(title);
    card.appendChild(msg);
    card.appendChild(row);
    wrap.appendChild(card);
    let done = false;
    const finish = result => {
        if (done)
            return;
        done = true;
        document.removeEventListener("keydown", onKey, true);
        wrap.remove();
        try {
            if (prevFocus && prevFocus.focus)
                prevFocus.focus({ preventScroll: true });
        }
        catch (_) { }
        job.resolve(job.notice ? true : result);
        __dlgNext();
    };
    const onKey = ev => {
        if (ev.key === "Escape") {
            ev.preventDefault();
            ev.stopPropagation();
            finish(false);
        }
        else if (ev.key === "Tab") {
            const f = job.notice ? [btnOk] : [btnCancel, btnOk], i = f.indexOf(document.activeElement);
            ev.preventDefault();
            f[(i + (ev.shiftKey ? f.length - 1 : 1)) % f.length].focus();
        }
        else if (ev.key === "Enter" && document.activeElement !== btnCancel) {
            ev.preventDefault();
            ev.stopPropagation();
            finish(true);
        }
    };
    document.addEventListener("keydown", onKey, true);
    btnOk.addEventListener("click", () => finish(true));
    btnCancel.addEventListener("click", () => finish(false));
    wrap.addEventListener("mousedown", ev => { if (ev.target === wrap && !job.notice)
        finish(false); });
    document.body.appendChild(wrap);
    /* Tehlikeli işlemlerde varsayılan odak "Vazgeç"te (yanlışlıkla Enter ile silinmesin). */
    (danger && !job.notice ? btnCancel : btnOk).focus({ preventScroll: true });
}
function RateInput({ value, onCommit, label }) {
    const [draft, setDraft] = React.useState(null);
    const shown = draft !== null ? draft : String(value ?? "");
    return React.createElement("input", { type: "text", inputMode: "decimal", "aria-label": label, className: "admin-input", value: shown,
        onChange: e => {
            const v = e.target.value.replace(",", ".");
            if (!/^\d{0,6}(\.\d{0,4})?$/.test(v)) return;
            setDraft(v);
            const n = parseFloat(v);
            if (Number.isFinite(n) && n > 0 && n <= 100000) onCommit(n);
        },
        onBlur: () => setDraft(null) });
}
function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
