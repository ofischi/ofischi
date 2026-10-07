function App() {
    const [data, setData] = useState(null), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [saved, setSaved] = useState(false), [toast, setToast] = useState(""), [activeCat, setActiveCat] = useState(null), [openCategories, setOpenCategories] = useState({}), [currencyMenuOpen, setCurrencyMenuOpen] = useState(false), [language, setLanguage] = useState(() => lsGet(LANG_KEY) === "EN" ? "EN" : "TR"), [adminSection, setAdminSection] = useState("panel"), [search, setSearch] = useState(""), [searchOpen, setSearchOpen] = useState(false), [viewCurrency, setViewCurrency] = useState(() => { try {
        const v = localStorage.getItem(VIEW_CURRENCY_KEY);
        return ["TRY", "USD", "EUR"].includes(v) ? v : null;
    }
    catch (_) {
        return null;
    } }), [adminSearch, setAdminSearch] = useState(""), [selectedProduct, setSelectedProduct] = useState(null), [detailGalleryIndex, setDetailGalleryIndex] = useState(0), [fullScreenImage, setFullScreenImage] = useState(null), [lightboxZoom, setLightboxZoom] = useState(1), [galleryIndex, setGalleryIndex] = useState({}), [panelOpen, setPanelOpen] = useState(false), [unlocked, setUnlocked] = useState(false), [pinModal, setPinModal] = useState(false), [pinInput, setPinInput] = useState(""), [pinError, setPinError] = useState(false), [logoFailed, setLogoFailed] = useState(false), [newPinInput, setNewPinInput] = useState(""), [busy, setBusy] = useState(false), [pdfBusy, setPdfBusy] = useState(false), [pdfPreview, setPdfPreview] = useState(null), [pdfPreviewUrl, setPdfPreviewUrl] = useState(null), [importRef, setImportRef] = useState(null);
    /* Yeni yönetim paneli durumu */
    const [admView, setAdmView] = useState("table"), [admSel, setAdmSel] = useState(() => new Set()), [admEdit, setAdmEdit] = useState(null), [admTab, setAdmTab] = useState("bilgi"), [admCat, setAdmCat] = useState(""), [admQuery, setAdmQuery] = useState(""), [admIssues, setAdmIssues] = useState(false), [admBulk, setAdmBulk] = useState({ mode: "pct", value: "" }), [admLimit, setAdmLimit] = useState(80), [admAddPick, setAdmAddPick] = useState(false), [admDrag, setAdmDrag] = useState(null), [admCatDrag, setAdmCatDrag] = useState(null);
    const admBaseRef = useRef(null), catRenameTimer = useRef(null);
    useEffect(() => { document.documentElement.lang = language.toLowerCase(); }, [language]);
    useEffect(() => {
        /* Kart galerileri hepsi aynı anda değil, sırayla ve sakin bir tempoda döner.
           "Hareketi azalt" tercihi olan kullanıcılar ve arka plandaki sekmeler için durur. */
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        if (reduce)
            return;
        const multi = [];
        (data?.categories || []).forEach(c => (c.items || []).forEach(i => {
            const g = Array.isArray(i.images) && i.images.length ? i.images : (i.image ? [i.image] : []);
            if (g.length > 1)
                multi.push([i.id, g.length]);
        }));
        if (!multi.length)
            return;
        let cursor = 0;
        const timer = setInterval(() => {
            if (document.hidden || selectedProductRef.current)
                return;
            const [id, len] = multi[cursor % multi.length];
            cursor++;
            setGalleryIndex(prev => ({ ...prev, [id]: ((prev[id] || 0) + 1) % len }));
        }, Math.max(1800, Math.round(9000 / Math.min(multi.length, 5))));
        return () => clearInterval(timer);
    }, [data?.categories]);
    /* Büyük kataloglarda yazarken takılma olmasın: sonuç listesi bir adım geriden güncellenir. */
    const deferredSearch = useDeferredValue(search);
    const selectedProductRef = useRef(null);
    /* Yönetim oturumu: 15 dakika işlem yapılmazsa PIN tekrar sorulur. */
    const ADMIN_IDLE_MS = 15 * 60 * 1000, adminActivityRef = useRef(0);
    useEffect(() => {
        if (!panelOpen)
            return;
        const mark = () => { adminActivityRef.current = Date.now(); };
        mark();
        window.addEventListener("pointerdown", mark, true);
        window.addEventListener("keydown", mark, true);
        /* Açık paneldeki kaydedilmemiş işler kaybolmasın diye panel açıkken kilitlenmez; süre bir sonraki açılışta kontrol edilir. */
        return () => { window.removeEventListener("pointerdown", mark, true); window.removeEventListener("keydown", mark, true); mark(); };
    }, [panelOpen]);
    useEffect(() => { setLogoFailed(false); }, [data?.logo?.src]);
    const categoryBarRef = useRef(null), productsTopRef = useRef(null);
    /* Kategori değişince: seçilen çip yatayda ortalanır, sayfa yeni listenin BAŞINA kaydırılır
       (önceden kullanıcı eski kategorideki kaydırma konumunda kalıyor, yeni listenin ortasını görüyordu). */
    function goToCategory(id, btn) {
        setActiveCat(id);
        setOpenCategories({});
        requestAnimationFrame(() => { try {
            const sc = btn?.parentElement;
            if (sc && btn) {
                const r = btn.getBoundingClientRect(), sr = sc.getBoundingClientRect();
                sc.scrollTo({ left: Math.max(0, sc.scrollLeft + (r.left - sr.left) - (sc.clientWidth - r.width) / 2), behavior: "smooth" });
            }
            const anchor = productsTopRef.current, bar = categoryBarRef.current;
            if (!anchor || !bar)
                return;
            const target = window.scrollY + anchor.getBoundingClientRect().top - bar.getBoundingClientRect().bottom - 4;
            if (window.scrollY > target + 2)
                window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
        }
        catch (_) { } });
    }
    const [pageScrolled, setPageScrolled] = useState(false), [barStuck, setBarStuck] = useState(false);
    useEffect(() => {
        /* Üst şerit ve kategori çubuğu arka planı yalnızca kaydırınca görünür; açılışta sayfanın degrade arka planı bozulmaz. */
        const onScroll = () => {
            setPageScrolled(window.scrollY > 12);
            const el = categoryBarRef.current;
            if (el) {
                const top = parseFloat(getComputedStyle(el).top) || 0;
                setBarStuck(el.getBoundingClientRect().top <= top + 1 && window.scrollY > 0);
            }
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
    }, [loading]);
    useEffect(() => { selectedProductRef.current = selectedProduct; }, [selectedProduct]);
    /* Açık pencere varken arka plan kaymasın; Esc ile en üstteki pencere kapansın. */
    useEffect(() => {
        const locked = !!(selectedProduct || fullScreenImage || pinModal || (panelOpen && unlocked));
        const html = document.documentElement, prevHtml = html.style.overflow, prevBody = document.body.style.overflow;
        if (locked) {
            html.style.overflow = "hidden";
            document.body.style.overflow = "hidden";
        }
        return () => { html.style.overflow = prevHtml; document.body.style.overflow = prevBody; };
    }, [selectedProduct, fullScreenImage, pinModal, panelOpen, unlocked]);
    useEffect(() => {
        const onKey = e => {
            if (e.key !== "Escape")
                return;
            if (fullScreenImage)
                return; /* lightbox kendi Esc davranışını yönetir */
            if (currencyMenuOpen) {
                setCurrencyMenuOpen(false);
                return;
            }
            if (selectedProduct) {
                setSelectedProduct(null);
                return;
            }
            if (pinModal) {
                setPinModal(false);
                return;
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [fullScreenImage, currencyMenuOpen, selectedProduct, pinModal]);
    const panelOpenRef = useRef(false), languageRef = useRef(language), dataRef = useRef(data);
    /* TELEFONUN GERİ TUŞU: açık pencere (ürün detayı, büyük görsel, PDF ön izleme, PIN, yönetim paneli) varsa
       geri tuşu siteden çıkmak yerine en üstteki pencereyi kapatır. */
    const overlayDepth = (panelOpen ? 1 : 0) + (pinModal ? 1 : 0) + (selectedProduct ? 1 : 0) + (fullScreenImage ? 1 : 0) + (pdfPreview ? 1 : 0);
    const histDepthRef = useRef(0), popClosingRef = useRef(false), ignorePopRef = useRef(0);
    useEffect(() => {
        const h = histDepthRef.current;
        try {
            if (overlayDepth > h) {
                for (let i = h; i < overlayDepth; i++)
                    history.pushState({ ofOverlay: i + 1 }, "");
                histDepthRef.current = overlayDepth;
            }
            else if (overlayDepth < h) {
                histDepthRef.current = overlayDepth;
                if (popClosingRef.current)
                    popClosingRef.current = false;
                else {
                    ignorePopRef.current += 1;
                    history.go(-(h - overlayDepth));
                }
            }
        }
        catch (_) { }
    }, [overlayDepth]);
    useEffect(() => {
        const onPop = () => {
            if (ignorePopRef.current > 0) {
                ignorePopRef.current -= 1;
                return;
            }
            if (histDepthRef.current <= 0)
                return;
            popClosingRef.current = true;
            if (pdfPreview)
                closePdfPreview();
            else if (fullScreenImage)
                setFullScreenImage(null);
            else if (selectedProduct)
                setSelectedProduct(null);
            else if (pinModal)
                setPinModal(false);
            else if (panelOpen) {
                if (hasUnsavedPanelChanges()) {
                    /* Geri tuşu: önce geçmiş kaydını geri koy, pencerede onay verilirse panel kapanır ve kayıt temizlenir. */
                    popClosingRef.current = false;
                    try {
                        history.pushState({ ofOverlay: histDepthRef.current }, "");
                    }
                    catch (_) { }
                    requestCloseAdminPanel();
                }
                else
                    requestCloseAdminPanel();
            }
            else
                popClosingRef.current = false;
        };
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    });
    useEffect(() => { panelOpenRef.current = panelOpen; }, [panelOpen]);
    useEffect(() => { languageRef.current = language; }, [language]);
    useEffect(() => { dataRef.current = data; }, [data]);
    useEffect(() => {
        if (!data || !selectedProduct)
            return;
        let fresh = null;
        for (const category of (data.categories || [])) {
            fresh = (category.items || []).find(item => item.id === selectedProduct.id);
            if (fresh)
                break;
        }
        if (!fresh) {
            setSelectedProduct(null);
            return;
        }
        setSelectedProduct(fresh);
    }, [data]);
    function cloneData(value) { return value ? JSON.parse(JSON.stringify(value)) : null; }
    const productTranslationTimers = useRef({});
    const productTranslationSeq = useRef({});
    const generalTranslationTimers = useRef({});
    const generalTranslationSeq = useRef({});
    const toastTimerRef = useRef(null);
    const categoryTranslationTimers = useRef({});
    const categoryTranslationSeq = useRef({});
    const pricePartTranslationTimers = useRef({});
    const pricePartTranslationSeq = useRef({});
    const panelSnapshot = useRef(null);
    /* EN METİNLERİ
       Ziyaretçinin tarayıcısında internet üzerinden çeviri YAPILMAZ (hız + sınır sorunları).
       Kayıtlı *_en alanları gösterilir; boşsa katalog sözlüğüyle anında çeviri yapılır (getText).
       Kalıcı ve kaliteli çeviri, yönetim panelindeki "İngilizce Çevirileri Tamamla" ile bir kez yapılır. */
    useEffect(() => {
        let cancelled = false;
        async function init() {
            try {
                /* Hızlı ilk ekran: localStorage */
                const fastLocal = readLocalRecord(DB_KEY) || readLocalRecord(BACKUP_KEY);
                setData(fastLocal?.data || defaultData());
                /* En güncel yerel kopya (localStorage / yedek / IndexedDB) */
                const best = await loadLocal();
                if (cancelled)
                    return;
                let initial = best?.data || fastLocal?.data || defaultData();
                /* Eski sürümlerden kalan düz metin PIN'i güvenli hash'e taşı ve veriden sil. */
                try {
                    await migrateLegacyPin(best?.rawPin ?? fastLocal?.rawPin);
                }
                catch (e) {
                    console.warn("PIN taşınamadı:", e);
                }
                initial = sanitizeCatalogData(initial);
                if (best || fastLocal)
                    await saveLocal(initial).catch(() => { });
                setData(initial);
                requestPersistentStorage().catch(() => { });
                setLanguage(lsGet(LANG_KEY) === "EN" ? "EN" : "TR");
                setActiveCat((initial?.categories || []).find(c => (c.items || []).length)?.id || initial?.categories?.[0]?.id || null);
            }
            catch (e) {
                console.error(e);
                setData(defaultData());
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        }
        init();
        return () => { cancelled = true; };
    }, []);
    /* Sayfa kapanırken katalog verisi otomatik kaydedilmez. Yalnızca kaydedilmemiş
       admin değişikliği varsa tarayıcı ayrılma uyarısı gösterebilir. */
    useEffect(() => {
        const warn = (event) => {
            if (!panelOpenRef.current || !panelSnapshot.current || !data)
                return;
            const dirty = JSON.stringify(normalizeData(data)) !== JSON.stringify(normalizeData(panelSnapshot.current));
            if (!dirty)
                return;
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [data]);
    /* OTOMATİK İNGİLİZCE ÇEVİRİ (arka planda, arayüzsüz)
       Kaydet'ten sonra çevrilmemiş tüm metinler AI ile sessizce çevrilir ve yerel kayda yazılır.
       Sıra: tarayıcının yerleşik AI modeli (varsa) → çevrimiçi çeviri servisi.
       Kaba sözlük sonucu kalıcı yazılmaz; bir sonraki kayıtta yeniden denenir. */
    const autoTranslateRunning = useRef(false);
    /* Açılışta ve internet geri geldiğinde yalnızca kuyrukta kalan (başarısız) çeviriler tekrar denenir. */
    useEffect(() => {
        if (!data)
            return;
        const run = () => {
            if (dataRef.current && navigator.onLine !== false) {
                /* Daha önce kaydedilmiş bozuk İngilizce metinler (makale gibi uzun çıktılar) bulunup yeniden çevrilir. */
                const bad = trMissingKeys(dataRef.current, true);
                if (bad.length) {
                    const set = trPendingLoad();
                    bad.forEach(k => set.add(k));
                    trPendingSave(set);
                }
            }
            if (trPendingLoad().size && navigator.onLine !== false && dataRef.current)
                autoTranslateMissing(dataRef.current).catch(() => { });
        };
        const tm = setTimeout(run, 2500);
        window.addEventListener("online", run);
        return () => { clearTimeout(tm); window.removeEventListener("online", run); };
    }, [!!data]);
    /* İngilizce çeviri çalıştırıcısı. Kaydet'ten hemen sonra başlar; çalışırken yeni kayıt gelirse (veya iş kaldıysa)
       kuyruk bitene kadar tekrar döner. Aynı anda 4 istek; dakikada 60 sınırını bekleyerek aşmaz. */
    const autoTranslateAgain = useRef(false), autoTranslateRetries = useRef(0), [trBusy, setTrBusy] = useState(0);
    async function autoTranslateMissing(snapshot, fresh = true) {
        if (!snapshot)
            return;
        if (fresh)
            autoTranslateRetries.current = 0;
        if (autoTranslateRunning.current) {
            autoTranslateAgain.current = true;
            return;
        }
        autoTranslateRunning.current = true;
        let rounds = 0;
        try {
            do {
                autoTranslateAgain.current = false;
                await autoTranslateRound(snapshot);
                rounds++;
            } while (autoTranslateAgain.current && rounds < 6);
        }
        finally {
            autoTranslateRunning.current = false;
            setTrBusy(0);
        }
        /* Başarısız kalanlar (çevrimdışı / servis meşgul) 15 sn arayla en fazla 3 kez daha denenir. */
        if (trPendingLoad().size && navigator.onLine !== false && autoTranslateRetries.current < 3) {
            autoTranslateRetries.current++;
            setTimeout(() => { if (dataRef.current)
                autoTranslateMissing(dataRef.current, false).catch(() => { }); }, 15000);
        }
    }
    /* "Eksik çevirileri tamamla": yalnızca İngilizcesi olmayan alanları kuyruğa alır ve çevirir; çevrilmişlere dokunmaz. */
    function translateMissingNow() {
        const d = dataRef.current;
        if (!d)
            return 0;
        if (navigator.onLine === false) {
            showToast("İnternet bağlantısı yok; bağlantı gelince tekrar deneyin.");
            return 0;
        }
        const keys = trMissingKeys(d);
        if (!keys.length) {
            showToast("Eksik çeviri yok, hepsi çevrilmiş.");
            return 0;
        }
        const set = trPendingLoad();
        keys.forEach(k => set.add(k));
        trPendingSave(set);
        showToast(keys.length + " alan çevriliyor…");
        autoTranslateMissing(d).catch(() => { });
        return keys.length;
    }
    async function autoTranslateRound(snapshot) {
        const snap = dataRef.current || snapshot;
        {
            /* Çeviri sadece YENİ veya DEĞİŞEN Türkçe metinler için yapılır. Her alanın çevrildiği Türkçe kaynak metin
               (name_src/desc_src/part.name_src) saklanır; kaynak değişmediyse alan bir daha çevrilmez, ağa hiç istek gitmez. */
            const isModelText = (tr) => /^[^\s]+$/.test(tr) && tr === tr.toLocaleUpperCase("tr-TR");
            const plain = (tr) => !/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(tr);
            const decide = (tr, en, src, isName) => {
                tr = String(tr ?? "").trim();
                en = String(en ?? "").trim();
                if (!tr)
                    return "none";
                if (src === tr && !trBadEn(tr, en))
                    return "none"; /* bu kaynak zaten işlendi */
                if (plain(tr) || (isName && isModelText(tr)))
                    return "mark"; /* sayı/kod ve tek kelimelik model adı çevrilmez */
                const hasEn = !!en && en !== tr && en !== translateFallbackSync(tr) && !/^(new product|new part|new category)$/i.test(en) && !trBadEn(tr, en);
                if (hasEn && !src)
                    return "mark"; /* eski kayıt: İngilizcesi var, sadece kaynağı işaretle */
                return "translate";
            };
            /* Tam site taraması YOK: yalnızca kuyruktaki (düzenlenen / eklenen, çevirisi henüz tamamlanmamış) alanlar işlenir. */
            const jobs = [];
            for (const pk of trPendingLoad()) {
                const [kind, a1, b1, c1] = pk.split("|");
                if (kind === "general") {
                    const tr = String(snap[a1] ?? "").trim();
                    if (tr)
                        jobs.push({ kind: "general", key: a1, tr, type: "general_" + a1, mode: "translate", pk });
                    else
                        trPendingRemove([pk]);
                    continue;
                }
                if (kind === "cat") {
                    const cc = (snap.categories || []).find(x => x.id === a1), tr = String(cc?.name ?? "").trim(), en = String(cc?.name_en ?? "").trim();
                    if (!cc || !tr || (en && en !== tr && !/^new category$/i.test(en) && !trBadEn(tr, en)))
                        trPendingRemove([pk]);
                    else
                        jobs.push({ kind: "cat", cid: a1, tr, type: "category", mode: "translate", pk });
                    continue;
                }
                const cat = (snap.categories || []).find(x => x.id === a1), it = cat && (cat.items || []).find(x => x.id === b1);
                if (!it) {
                    trPendingRemove([pk]);
                    continue;
                }
                if (kind === "item" && (c1 === "name" || c1 === "desc")) {
                    const mode = decide(it[c1], it[c1 + "_en"], it[c1 + "_src"], c1 === "name");
                    if (mode === "none")
                        trPendingRemove([pk]);
                    else
                        jobs.push({ kind: "item", cid: a1, iid: b1, key: c1, tr: String(it[c1] ?? "").trim(), type: c1, mode, pk, en: (mode === "mark" && trBadEn(it[c1], it[c1 + "_en"])) ? String(it[c1] ?? "").trim() : undefined });
                }
                else if (kind === "part") {
                    const part = normalizePrice(it.price).parts.find(x => x.id === c1);
                    if (!part) {
                        trPendingRemove([pk]);
                        continue;
                    }
                    const mode = decide(part.name, part.name_en, part.name_src, false);
                    if (mode === "none")
                        trPendingRemove([pk]);
                    else
                        jobs.push({ kind: "part", cid: a1, iid: b1, pid: c1, tr: String(part.name ?? "").trim(), type: "price_part", mode, pk, en: (mode === "mark" && trBadEn(part.name, part.name_en)) ? String(part.name ?? "").trim() : undefined });
                }
                else
                    trPendingRemove([pk]);
            }
            if (!jobs.length)
                return;
            /* Sonuçları EN GÜNCEL veriye yazar (kullanıcı arada başka şey düzenlese de parti atlanmaz); sadece Türkçe kaynağı
               hâlâ aynı olan alanlara yazılır. Çeviriler panel açıkken de HEMEN kalıcı kaydedilir:
               kullanıcının kaydedilmemiş başka düzenlemeleri varsa onlar kaydedilmez, yalnız çeviriler geri-dönüş noktasına işlenir. */
            const applyJobs = (obj, done) => {
                for (const j of done) {
                    if (j.kind === "cat") {
                        const cc = (obj.categories || []).find(x => x.id === j.cid);
                        if (cc && String(cc.name ?? "").trim() === j.tr && j.en) {
                            cc.name_en = j.en;
                            if (j.en === j.tr)
                                trSameAdd("cat|" + j.cid + "|" + j.tr);
                        }
                        continue;
                    }
                    if (j.kind === "general") {
                        if (String(obj[j.key] ?? "").trim() === j.tr && j.en) {
                            obj[j.key + "_en"] = j.en;
                            if (j.en === j.tr)
                                trSameAdd("general|" + j.key + "|" + j.tr);
                        }
                        continue;
                    }
                    const c = (obj.categories || []).find(x => x.id === j.cid);
                    if (!c)
                        continue;
                    const it = (c.items || []).find(x => x.id === j.iid);
                    if (!it)
                        continue;
                    if (j.kind === "item") {
                        if (String(it[j.key] ?? "").trim() === j.tr) {
                            if (j.en)
                                it[j.key + "_en"] = j.en;
                            it[j.key + "_src"] = j.tr;
                        }
                        continue;
                    }
                    const pr = normalizePrice(it.price);
                    const part = pr.parts.find(x => x.id === j.pid);
                    if (part && String(part.name ?? "").trim() === j.tr) {
                        if (j.en)
                            part.name_en = j.en;
                        part.name_src = j.tr;
                        it.price = pr;
                    }
                }
            };
            const applyBatch = async (done) => {
                const prev = dataRef.current;
                if (!prev || !done.length)
                    return;
                const baseRef = (typeof admBaseRef !== "undefined") ? admBaseRef : null;
                const wasClean = !panelOpenRef.current || !panelSnapshot.current || (baseRef ? prev === baseRef.current : JSON.stringify(prev) === JSON.stringify(panelSnapshot.current));
                const next = JSON.parse(JSON.stringify(prev));
                applyJobs(next, done);
                dataRef.current = next;
                setData(next);
                let toSave = next;
                if (panelOpenRef.current && panelSnapshot.current) {
                    if (wasClean) {
                        panelSnapshot.current = JSON.parse(JSON.stringify(next));
                        if (baseRef)
                            baseRef.current = next;
                    }
                    else {
                        const snapCopy = JSON.parse(JSON.stringify(panelSnapshot.current));
                        applyJobs(snapCopy, done);
                        panelSnapshot.current = snapCopy;
                        toSave = snapCopy;
                    }
                }
                try {
                    await saveLocal(toSave);
                    trPendingRemove(done.map(j => j.pk).filter(Boolean));
                }
                catch (_) { /* kayıt başarısızsa anahtarlar kuyrukta kalır, tekrar denenir */ }
            };
            /* Ağ isteği gerektirmeyen "işaretle" kayıtları tek seferde yazılır. */
            await applyBatch(jobs.filter(j => j.mode === "mark"));
            const queue = jobs.filter(j => j.mode === "translate");
            if (!queue.length)
                return;
            setTrBusy(queue.length);
            let batch = [], fails = 0, idx = 0, doneN = 0, lastApply = Date.now(), stop = false;
            const flushBatch = async (force) => {
                if (batch.length && (force || batch.length >= 20 || Date.now() - lastApply > 1200)) {
                    const b = batch;
                    batch = [];
                    lastApply = Date.now();
                    await applyBatch(b);
                }
            };
            const worker = async () => {
                while (!stop && idx < queue.length) {
                    const job = queue[idx++];
                    let cached = false;
                    try {
                        cached = !!lsGet(cacheKey(job.tr, job.type));
                    }
                    catch (_) { }
                    if (!cached)
                        await trWaitBudget();
                    try {
                        const r = await translateCachedResult(job.tr, job.type);
                        if (r.good && r.text && r.text.trim()) {
                            batch.push({ ...job, en: r.text.trim() });
                            fails = 0;
                        }
                        else if (++fails >= 6)
                            stop = true;
                    }
                    catch (_) {
                        if (++fails >= 6)
                            stop = true;
                    }
                    doneN++;
                    setTrBusy(Math.max(0, queue.length - doneN));
                    await flushBatch(false);
                    if (!cached)
                        await new Promise(r => setTimeout(r, 120));
                }
            };
            await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker));
            await flushBatch(true);
        }
    }
    function showToast(message) { setToast(message); if (toastTimerRef.current)
        clearTimeout(toastTimerRef.current); toastTimerRef.current = setTimeout(() => setToast(""), 3500); }
    /* Kalıcı kayıt yalnızca admin açıkça Kaydet ve Kapat'a bastığında yapılır. */
    function updateData(callback) {
        setData(p => {
            if (!p)
                return p;
            /* Her değişiklikte normalizeData çalıştırmıyoruz; aksi halde kullanıcı alanı boşalttığında
               normalizeData tekrar varsayılan değeri yazar ve input sabitmiş gibi görünür. */
            const copy = JSON.parse(JSON.stringify(p));
            callback(copy);
            const protectedCopy = sanitizeCatalogData(copy);
            setSaved(false);
            /* Kalıcı kayıt yalnızca explicit Save ile yapılır. */
            return protectedCopy;
        });
    }
    function setPath(path, value) { updateData(copy => { let target = copy; for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        target[key] = { ...(target[key] || {}) };
        target = target[key];
    } target[path[path.length - 1]] = value; }); }
    /* Genel TR alanları EN alanlarını otomatik takip eder.
       Kullanıcı Türkçe metni yazmayı bıraktığında kısa bir gecikmeyle çeviri yapılır;
       Türkçe alan tamamen silinirse EN alanı da anında temizlenir. */
    function editGeneralTurkishField(field, value) {
        const enField = field + "_en";
        if (generalTranslationTimers.current[field])
            clearTimeout(generalTranslationTimers.current[field]);
        generalTranslationSeq.current[field] = (generalTranslationSeq.current[field] || 0) + 1;
        const seq = generalTranslationSeq.current[field];
        updateData(copy => { copy[field] = value; if (!value.trim())
            copy[enField] = ""; });
        if (!value.trim())
            return;
        trPendingAdd("general|" + field);
        generalTranslationTimers.current[field] = setTimeout(async () => {
            try {
                const tr_1 = await translateCachedResult(value, "general_" + field);
                const en = tr_1.good ? tr_1.text : "";
                if (generalTranslationSeq.current[field] !== seq)
                    return;
                if (en)
                    trPendingRemove(["general|" + field]);
                updateData(copy => {
                    if (copy[field] === value)
                        copy[enField] = en || "";
                });
            }
            catch (e) {
                console.warn("Otomatik genel alan çevirisi başarısız:", e);
            }
        }, 350);
    }
    function toggleCategory(id) { setOpenCategories(p => ({ ...p, [id]: !p[id] })); }
    function openCategory(id) { setOpenCategories(p => ({ ...p, [id]: true })); }
    function viewCurrencyData() {
        /* Ziyaretçinin para birimi seçimi kataloğun varsayılanını DEĞİŞTİRMEZ; ayrı saklanır. */
        if (!data || panelOpen || !viewCurrency)
            return data;
        return { ...data, currency: { ...(data.currency || {}), selected: viewCurrency } };
    }
    function getCurrency() { return getCurrencyByData(viewCurrencyData()); }
    function convertPrice(amount) { return convertPriceByData(viewCurrencyData(), amount); }
    function formatAmount(amount) { return formatAmountByData(viewCurrencyData(), amount); }
    function chooseViewCurrency(id) {
        setViewCurrency(id);
        lsSet(VIEW_CURRENCY_KEY, id);
    }
    function priceText(part) {
        if (!part || part.contactOnly || part.amount === null || part.amount === undefined || part.amount === "")
            return t(language, "contactPrice");
        return formatAmount(part.amount) || t(language, "contactPrice");
    }
    function productMainPrice(item) {
        const total = priceTotal(item?.price);
        return total !== null ? (formatAmount(total) || t(language, "contactPrice")) : null;
    }
    function switchLanguage(next) {
        /* TR ve EN kesin olarak aynı ana sayfa JSX'ini kullanır; yalnızca metin dili değişir. */
        document.documentElement.lang = next.toLowerCase();
        setLanguage(next);
        lsSet(LANG_KEY, next);
        setSearch("");
        setSelectedProduct(null);
        setFullScreenImage(null);
        setCurrencyMenuOpen(false);
        setOpenCategories({});
        setActiveCat(prev => {
            if (prev)
                return prev;
            return data?.categories?.[0]?.id || null;
        });
    }
    function addCategory() { return; /* kategoriler sabit */ }
    async function deleteCategory(id) {
        return; /* kategoriler sabit */
        if (!(await askConfirm(t(language, "catDelete"), { title: "Kategoriyi sil", ok: "Sil", danger: true })))
            return;
        const next = normalizeData(data);
        next.categories = next.categories.filter(c => c.id !== id);
        try {
            setData(next);
            setOpenCategories(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
            setActiveCat(prev => prev === id ? (next.categories[0]?.id || null) : prev);
            showToast(language === "EN" ? "Category deleted." : "Kategori silindi.");
        }
        catch (e) {
            console.error(e);
            showToast(language === "EN" ? "Delete failed." : "Silme işlemi başarısız.");
        }
    }
    function renameCategory(id, value) {
        return; /* kategoriler sabit */
        const key = String(id);
        if (categoryTranslationTimers.current[key])
            clearTimeout(categoryTranslationTimers.current[key]);
        categoryTranslationSeq.current[key] = (categoryTranslationSeq.current[key] || 0) + 1;
        const seq = categoryTranslationSeq.current[key];
        updateData(x => { x.categories = x.categories.map(c => c.id === id ? { ...c, name: value, ...(!value.trim() ? { name_en: "" } : {}) } : c); });
        if (!value.trim())
            return;
        categoryTranslationTimers.current[key] = setTimeout(async () => {
            try {
                const tr_2 = await translateCachedResult(value, "category");
                const en = tr_2.good ? tr_2.text : "";
                if (categoryTranslationSeq.current[key] !== seq)
                    return;
                updateData(x => { x.categories = x.categories.map(c => c.id === id && c.name === value ? { ...c, name_en: en || "" } : c); });
            }
            catch (e) {
                console.warn("Kategori otomatik çevirisi başarısız:", e);
            }
        }, 350);
    }
    async function moveCategory(id, direction) {
        return; /* kategoriler sabit */
        updateData(x => { const l = [...x.categories], i = l.findIndex(a => a.id === id), j = i + direction; if (i < 0 || j < 0 || j >= l.length)
            return; [l[i], l[j]] = [l[j], l[i]]; x.categories = l; });
    }
    function addItem(categoryId) {
        const item = { id: uid(), isDemo: true, name: "Yeni Ürün", name_en: "New Product", desc: "", desc_en: "", dims: "", dims_en: "", image: null, price: { contactOnly: true, amount: null, manualTotal: null, autoCollect: true, parts: [] } };
        updateData(x => { x.categories = x.categories.map(c => c.id === categoryId ? { ...c, items: [...c.items, item] } : c); });
        openCategory(categoryId);
        if (adminSearch)
            setAdminSearch("");
        /* Yeni ürün listenin sonuna eklenir: oraya kaydır ve ad alanını seçili halde odakla. */
        setTimeout(() => { try {
            const box = document.getElementById("product-image-" + categoryId + "-" + item.id)?.closest(".bg-neutral-800.rounded-xl");
            if (!box)
                return;
            box.scrollIntoView({ behavior: "smooth", block: "center" });
            const inp = box.querySelector('input[aria-label="Ürün adı"]');
            if (inp) {
                inp.focus({ preventScroll: true });
                inp.select();
            }
        }
        catch (_) { } }, 120);
        return item.id;
    }
    function updateItem(categoryId, itemId, field, value) {
        updateData(x => {
            x.categories = x.categories.map(c => c.id !== categoryId ? c : { ...c, items: c.items.map(i => {
                    if (i.id !== itemId)
                        return i;
                    const next = { ...i, [field]: value };
                    if (["name", "desc", "dims", "image", "price"].includes(field)) {
                        const meaningful = field === "image" ? !!value : field === "price" ? pdfHasRealProductData({ ...i, price: value }) : String(value ?? "").trim().length > 0;
                        if (meaningful)
                            next.isDemo = false;
                    }
                    return next;
                }) });
        });
    }
    function editTurkishField(categoryId, item, field, value) {
        const key = categoryId + "::" + item.id + "::" + field;
        if (productTranslationTimers.current[key])
            clearTimeout(productTranslationTimers.current[key]);
        productTranslationSeq.current[key] = (productTranslationSeq.current[key] || 0) + 1;
        const seq = productTranslationSeq.current[key];
        updateItem(categoryId, item.id, field, value);
        if (!value.trim()) {
            updateItem(categoryId, item.id, field + "_en", "");
            return;
        }
        /* Put an immediate deterministic EN value on new/edited Turkish text.
           The async translator then replaces it with a better translation when available. */
        const instantEn = translateFallbackSync(value);
        if (instantEn && instantEn !== value)
            updateItem(categoryId, item.id, field + "_en", instantEn);
        trPendingAdd("item|" + categoryId + "|" + item.id + "|" + field);
        productTranslationTimers.current[key] = setTimeout(async () => {
            try {
                const tr_3 = await translateCachedResult(value, field);
                const en = tr_3.good ? tr_3.text : "";
                if (productTranslationSeq.current[key] !== seq)
                    return;
                if (en)
                    trPendingRemove(["item|" + categoryId + "|" + item.id + "|" + field]);
                updateData(x => { x.categories = x.categories.map(c => c.id !== categoryId ? c : { ...c, items: c.items.map(i => i.id === item.id && i[field] === value ? { ...i, [field + "_en"]: en || "", ...(en ? { [field + "_src"]: value } : {}) } : i) }); });
            }
            catch (e) {
                console.warn("Ürün otomatik çevirisi başarısız:", e);
            }
        }, 350);
    }
    function finishTurkishField(categoryId, item, field, value) { return; }
    async function deleteItem(categoryId, itemId) {
        if (!(await askConfirm(t(language, "deleteConfirm"), { title: "Ürünü sil", ok: "Sil", danger: true })))
            return;
        const next = normalizeData(data);
        next.categories = next.categories.map(c => c.id === categoryId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c);
        setData(next);
        setSelectedProduct(prev => prev?.id === itemId ? null : prev);
        showToast(language === "EN" ? "Product deleted." : "Ürün silindi.");
    }
    function moveItem(categoryId, itemId, direction) {
        updateData(x => { x.categories = x.categories.map(c => { if (c.id !== categoryId)
            return c; const l = [...c.items], i = l.findIndex(a => a.id === itemId), j = i + direction; if (i < 0 || j < 0 || j >= l.length)
            return c; [l[i], l[j]] = [l[j], l[i]]; return { ...c, items: l }; }); });
    }
    function addPricePart(categoryId, itemId) {
        const part = { id: uid(), name: "Yeni Parça", name_en: "New Part", dims: "", dims_en: "", amount: null, contactOnly: false };
        updateData(x => { x.categories = x.categories.map(c => c.id !== categoryId ? c : { ...c, items: c.items.map(i => { if (i.id !== itemId)
                return i; const p = normalizePrice(i.price); return { ...i, price: { ...p, contactOnly: false, parts: [...p.parts, part] } }; }) }); });
    }
    function setPriceAutoCollect(categoryId, itemId, enabled) {
        updateData(x => {
            x.categories = x.categories.map(c => c.id !== categoryId ? c : { ...c, items: c.items.map(i => {
                    if (i.id !== itemId)
                        return i;
                    const p = normalizePrice(i.price);
                    if (enabled)
                        return { ...i, price: { ...p, autoCollect: true } };
                    const current = priceTotal({ ...p, autoCollect: true });
                    const manual = p.manualTotal !== null ? p.manualTotal : current;
                    return { ...i, price: { ...p, autoCollect: false, manualTotal: manual } };
                }) });
        });
    }
    function updatePricePart(categoryId, itemId, partId, field, value) {
        if (field !== "name") {
            updateData(x => { x.categories = x.categories.map(c => c.id !== categoryId ? c : { ...c, items: c.items.map(i => { if (i.id !== itemId)
                    return i; const p = normalizePrice(i.price); return { ...i, price: { ...p, parts: p.parts.map(part => part.id === partId ? { ...part, [field]: value } : part) } }; }) }); });
            return;
        }
        const key = categoryId + "::" + itemId + "::" + partId;
        if (pricePartTranslationTimers.current[key])
            clearTimeout(pricePartTranslationTimers.current[key]);
        pricePartTranslationSeq.current[key] = (pricePartTranslationSeq.current[key] || 0) + 1;
        const seq = pricePartTranslationSeq.current[key];
        updateData(x => { x.categories = x.categories.map(c => c.id !== categoryId ? c : { ...c, items: c.items.map(i => { if (i.id !== itemId)
                return i; const p = normalizePrice(i.price); return { ...i, price: { ...p, parts: p.parts.map(part => part.id === partId ? { ...part, name: value, ...(!value.trim() ? { name_en: "" } : { name_en: translateFallbackSync(value) }) } : part) } }; }) }); });
        if (!value.trim())
            return;
        trPendingAdd("part|" + categoryId + "|" + itemId + "|" + partId);
        pricePartTranslationTimers.current[key] = setTimeout(async () => {
            try {
                const tr_4 = await translateCachedResult(value, "price_part");
                const en = tr_4.good ? tr_4.text : "";
                if (pricePartTranslationSeq.current[key] !== seq)
                    return;
                if (en)
                    trPendingRemove(["part|" + categoryId + "|" + itemId + "|" + partId]);
                updateData(x => { x.categories = x.categories.map(c => c.id !== categoryId ? c : { ...c, items: c.items.map(i => { if (i.id !== itemId)
                        return i; const p = normalizePrice(i.price); return { ...i, price: { ...p, parts: p.parts.map(part => part.id === partId && part.name === value ? { ...part, name_en: en || "", ...(en ? { name_src: value } : {}) } : part) } }; }) }); });
            }
            catch (e) {
                console.warn("Fiyat parçası otomatik çevirisi başarısız:", e);
            }
        }, 350);
    }
    async function deletePricePart(categoryId, itemId, partId) {
        const next = normalizeData(data);
        next.categories = next.categories.map(c => c.id !== categoryId ? c : { ...c, items: c.items.map(i => {
                if (i.id !== itemId)
                    return i;
                const p = normalizePrice(i.price);
                return { ...i, price: { ...p, parts: p.parts.filter(part => part.id !== partId) } };
            }) });
        setData(next);
    }
    async function save(keepOpen = false) {
        if (!data || saving)
            return;
        const clean = sanitizeCatalogData(data);
        setSaving(true);
        try {
            /* Yerel kayıt: localStorage + IndexedDB (bu cihaz). */
            const result = await saveLocal(clean);
            setData(result.data);
            /* Kaydın ardından eksik İngilizce metinler arka planda otomatik çevrilir. */
            setTimeout(() => { autoTranslateMissing(result.data).catch(() => { }); }, 0);
            if (keepOpen === true) {
                /* Yeni panel: kaydettikten sonra panel açık kalır; geri dönüş noktası güncellenir. */
                panelSnapshot.current = JSON.parse(JSON.stringify(result.data));
                admBaseRef.current = result.data;
            }
            else {
                panelSnapshot.current = null;
                setPanelOpen(false);
            }
            setSaved(true);
            showToast(t(language, 'saved'));
            setTimeout(() => setSaved(false), 1200);
        }
        catch (e) {
            console.error("KAYIT HATASI:", e);
            showToast((language === "EN" ? "Save failed: " : "Kaydetme başarısız: ") + (e?.message || "") + "");
        }
        finally {
            setSaving(false);
        }
    }
    const logoPressTimer = useRef(null);
    function startLogoLongPress(e) {
        if (e?.button !== undefined && e.button !== 0)
            return;
        if (logoPressTimer.current)
            clearTimeout(logoPressTimer.current);
        logoPressTimer.current = setTimeout(() => {
            logoPressTimer.current = null;
            openAdmin();
        }, 2000);
    }
    function cancelLogoLongPress() {
        if (logoPressTimer.current) {
            clearTimeout(logoPressTimer.current);
            logoPressTimer.current = null;
        }
    }
    function openAdmin() { if (unlocked && Date.now() - adminActivityRef.current > ADMIN_IDLE_MS) {
        setUnlocked(false);
        setPinInput("");
        setPinError(false);
        setPinModal(true);
        return;
    } if (unlocked) {
        adminActivityRef.current = Date.now();
        panelSnapshot.current = JSON.parse(JSON.stringify(data));
        admBaseRef.current = data;
        setPanelOpen(true);
        return;
    } setPinInput(""); setPinError(false); setPinModal(true); }
    function hasUnsavedPanelChanges() {
        try {
            return !!panelSnapshot.current && JSON.stringify(panelSnapshot.current) !== JSON.stringify(data);
        }
        catch (_) {
            return true;
        }
    }
    /* Kaydedilmemiş değişiklik varken panel dışına / X'e dokunulursa önce sorulur (önceden sessizce siliniyordu). */
    async function requestCloseAdminPanel() {
        if (hasUnsavedPanelChanges() && !(await askConfirm("Kaydedilmemiş değişiklikler var. Kaydetmeden kapatılırsa bu değişiklikler kaybolur.\n\nKaydetmek için Vazgeç'e basıp “Kaydet ve yayınla”ya tıklayın.", { title: "Kaydedilmemiş değişiklikler", ok: "Kaydetmeden kapat", cancel: "Vazgeç", danger: true })))
            return false;
        closeAdminPanel(true);
        return true;
    }
    function closeAdminPanel(discard = true) {
        if (discard && panelSnapshot.current) {
            setData(panelSnapshot.current);
        }
        panelSnapshot.current = null;
        setSaved(false);
        setPanelOpen(false);
    }
    function uploadLogoLocal(e) { const file = e.target.files?.[0]; if (!file)
        return; try {
        validateUploadFile(file, { maxBytes: 8 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"] });
        if (!consumeClientRateLimit("admin:logo-upload", 10, 60 * 1000))
            throw new Error("Çok fazla yükleme. Biraz bekleyin.");
    }
    catch (err) {
        showToast(err.message || "Geçersiz dosya.");
        e.target.value = "";
        return;
    } const reader = new FileReader(); reader.onload = () => { const src = safeAssetSource(reader.result); if (!src) {
        showToast("Geçersiz görsel.");
        return;
    } updateData(x => { x.logo = { ...x.logo, src }; }); showToast("Logo yüklendi. Kaydet'e basın."); }; reader.onerror = () => showToast("Logo yüklenemedi."); reader.readAsDataURL(file); e.target.value = ""; }
    async function uploadPdfCoverLogo(e) { const file = e.target.files?.[0]; if (!file)
        return; try {
        const src = await pdfLogoToTransparentDataURL(file);
        updateData(x => { x.pdf = { ...x.pdf, coverLogo: { src } }; });
        showToast("PDF kapak logosu yüklendi. Kaydet'e basın.");
    }
    catch (err) {
        showToast("PDF kapak logosu yüklenemedi.");
    }
    finally {
        e.target.value = "";
    } }
    async function pdfLogoToTransparentDataURL(file) {
        validateUploadFile(file, { maxBytes: 8 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"] });
        if (file.type.includes("svg")) {
            return await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(r.error); r.readAsDataURL(file); });
        }
        const raw = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error); r.readAsDataURL(file); });
        const img = await new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => reject(new Error("Logo açılamadı")); im.src = raw; });
        const max = 1800, scale = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
        c.height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const d = ctx.getImageData(0, 0, c.width, c.height), px = d.data;
        for (let i = 0; i < px.length; i += 4) {
            const r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3];
            const min = Math.min(r, g, b), maxc = Math.max(r, g, b);
            if (a > 0 && min > 238 && maxc - min < 18)
                px[i + 3] = 0;
            else if (a > 0 && min > 220 && maxc - min < 22)
                px[i + 3] = Math.round(a * ((255 - min) / 35));
        }
        ctx.putImageData(d, 0, 0);
        return c.toDataURL("image/png");
    }
    async function removePdfCoverLogo() { if (!(await askConfirm("PDF kapak logosu kaldırılsın mı?", { title: "Logoyu kaldır", ok: "Kaldır", danger: true })))
        return; setPath(["pdf", "coverLogo"], null); }
    /* Fotoğraf sıkıştırma: WebP, uzun kenar en fazla maxSize px; kalite 0,92’den 0,76’ya kadar düşürülerek hedef boyuta (KB) inilir.
       Hedefe ulaşılamazsa görsel %10 küçültülür ama uzun kenar 1280 px altına inmez. WebP desteklenmiyorsa JPEG'e düşer. */
    async function fileToOptimizedDataURL(file, maxSize = 1200, targetKB = 80) {
        validateUploadFile(file);
        const readAsDataURL = () => new Promise((resolve, reject) => { const r = new FileReader(); r.onerror = () => reject(r.error || new Error("Dosya okunamadı")); r.onload = () => resolve(r.result); r.readAsDataURL(file); });
        const loadImage = src => new Promise((resolve, reject) => { const img = new Image(); img.onerror = () => reject(new Error("Görsel açılamadı")); img.onload = () => resolve(img); img.src = src; });
        const img = await loadImage(await readAsDataURL());
        const target = Math.max(20, targetKB) * 1024 * 1.37; /* base64 ≈ ikili boyutun 1,37 katı */
        let scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
        let best = "";
        for (let round = 0; round < 4; round++) {
            const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, w, h);
            let mime = "image/webp";
            if (!canvas.toDataURL("image/webp", .8).startsWith("data:image/webp"))
                mime = "image/jpeg";
            for (const q of [.92, .88, .84, .8, .76]) {
                const out = canvas.toDataURL(mime, q);
                best = out;
                if (out.length <= target)
                    return out;
            }
            if (Math.max(w, h) * .9 < Math.min(1280, maxSize))
                break; /* netlik için uzun kenar 1280 px altına inmez */
            scale *= .9;
        }
        return best;
    }
    async function uploadProductImage(categoryId, itemId, e) {
        const files = Array.from(e.target.files || []);
        if (!files.length)
            return;
        try {
            if (files.length > SECURITY_LIMITS.imageCount)
                throw new Error(`En fazla ${SECURITY_LIMITS.imageCount} görsel seçebilirsiniz.`);
            const valid = files.filter(f => { try {
                validateUploadFile(f);
                return true;
            }
            catch (_) {
                return false;
            } });
            if (!valid.length)
                throw new Error("Lütfen görsel dosyaları seçin.");
            const srcs = await Promise.all(valid.map(f => fileToOptimizedDataURL(f, 1600, 250)));
            const item = (data.categories.find(c => c.id === categoryId)?.items || []).find(i => i.id === itemId);
            const current = Array.isArray(item?.images) ? item.images.filter(Boolean) : (item?.image ? [item.image] : []);
            const images = [...current, ...srcs];
            updateItem(categoryId, itemId, "images", images);
            updateItem(categoryId, itemId, "image", images[0] || null);
            showToast(srcs.length > 1 ? `${srcs.length} fotoğraf eklendi. Kaydet'e basın.` : "Fotoğraf eklendi. Kaydet'e basın.");
        }
        catch (err) {
            console.error(err);
            showToast("Fotoğraf yüklenemedi: " + (err.message || "Dosya hatası"));
        }
        finally {
            e.target.value = "";
        }
    }
    async function removeProductImage(categoryId, itemId, index = 0) {
        const item = (data.categories.find(c => c.id === categoryId)?.items || []).find(i => i.id === itemId);
        const current = Array.isArray(item?.images) ? item.images.filter(Boolean) : (item?.image ? [item.image] : []);
        if (!current.length)
            return;
        if (!(await askConfirm("Bu ürün fotoğrafı kaldırılsın mı?", { title: "Fotoğrafı kaldır", ok: "Kaldır", danger: true })))
            return;
        const images = current.filter((_, i) => i !== index);
        updateItem(categoryId, itemId, "images", images);
        updateItem(categoryId, itemId, "image", images[0] || null);
        showToast("Fotoğraf kaldırıldı. Kaydet'e basın.");
    }
    async function uploadPartImage(categoryId, itemId, partId, e) {
        const file = e.target.files?.[0];
        if (!file)
            return;
        try {
            validateUploadFile(file);
            await enforceClientRateLimit("admin:part-image-upload", 20, 60 * 1000);
            const src = await fileToOptimizedDataURL(file, 1280, 150);
            updatePricePart(categoryId, itemId, partId, "image", src);
            updateItem(categoryId, itemId, "isDemo", false);
            showToast("Model fotoğrafı eklendi. Kaydet'e basın.");
        }
        catch (err) {
            showToast("Fotoğraf yüklenemedi: " + (err?.message || ""));
        }
        finally {
            e.target.value = "";
        }
    }
    function makeCoverImage(categoryId, itemId, index) {
        const item = (data.categories.find(c => c.id === categoryId)?.items || []).find(i => i.id === itemId);
        const current = Array.isArray(item?.images) ? item.images.filter(Boolean) : (item?.image ? [item.image] : []);
        if (index <= 0 || index >= current.length)
            return;
        const images = [current[index], ...current.filter((_, i) => i !== index)];
        updateItem(categoryId, itemId, "images", images);
        updateItem(categoryId, itemId, "image", images[0]);
        showToast("Kapak fotoğrafı değişti. Kaydet'e basın.");
    }
    async function removeLogo() { if (!(await askConfirm("Logo kaldırılsın mı?", { title: "Logoyu kaldır", ok: "Kaldır", danger: true })))
        return; setPath(["logo", "src"], null); }
    async function changePin() {
        const p = String(newPinInput || "").replace(/\D/g, "");
        if (!isValidPin(p)) {
            showToast("PIN 4-8 haneli olmalıdır.");
            return;
        }
        if (p === "1234") {
            showToast("Güvenlik için 1234 kullanılamaz.");
            return;
        }
        try {
            await setAdminPin(p);
            setNewPinInput("");
            showToast("Yönetim PIN'i güncellendi.");
        }
        catch (e) {
            showToast(e.message || "PIN güncellenemedi.");
        }
    }
    async function tryUnlock() {
        const now = Date.now();
        if (now < pinBlockedUntil) {
            setPinError(true);
            const remaining = Math.max(1, Math.ceil((pinBlockedUntil - now) / 60000));
            showToast(`Çok fazla hatalı PIN denemesi. Yönetim girişi ${remaining} dakika boyunca kilitli.`);
            return;
        }
        if (pinBlockedUntil) {
            clearPinLock();
        }
        if (pinCheckBusy)
            return;
        const candidate = String(pinInput || "").replace(/\D/g, "").slice(0, 8);
        if (!isValidPin(candidate)) {
            setPinError(true);
            return;
        }
        /* Kademeli bekleme: her hatalı denemeden sonra doğrulama süresi uzar (brute-force'u yavaşlatır). */
        pinCheckBusy = true;
        try {
            await new Promise(r => setTimeout(r, Math.min(8000, 400 * Math.pow(2, pinFailureCount))));
        }
        finally {
            pinCheckBusy = false;
        }
        if (!hasAdminPin()) {
            /* İlk kurulum: bu cihaz için yönetim PIN'i belirlenir. */
            if (candidate === "1234") {
                showToast("Güvenlik için 1234 kullanılamaz. Farklı bir PIN seçin.");
                setPinError(true);
                return;
            }
            try {
                await setAdminPin(candidate);
            }
            catch (e) {
                showToast(e.message || "PIN kaydedilemedi.");
                return;
            }
            showToast("Yönetim PIN'i oluşturuldu.");
        }
        else {
            let ok = false;
            try {
                ok = await verifyAdminPin(candidate);
            }
            catch (e) {
                showToast(e.message || "PIN doğrulanamadı.");
                return;
            }
            if (!ok) {
                pinFailureCount++;
                persistPinLock();
                if (pinFailureCount >= SECURITY_LIMITS.pinAttempts) {
                    pinBlockedUntil = now + 60 * 60 * 1000;
                    persistPinLock();
                    showToast("3 hatalı PIN denemesi. Yönetim girişi 1 saat boyunca kilitlendi.");
                }
                else {
                    showToast(`Hatalı PIN. Kalan deneme: ${SECURITY_LIMITS.pinAttempts - pinFailureCount}`);
                }
                setPinError(true);
                return;
            }
        }
        clearPinLock();
        adminActivityRef.current = Date.now();
        setUnlocked(true);
        setPinModal(false);
        panelSnapshot.current = JSON.parse(JSON.stringify(data));
        admBaseRef.current = data;
        setPanelOpen(true);
        setPinInput("");
    }
    function closePdfPreview() {
        setPdfPreview(prev => { if (prev?.url)
            try {
                URL.revokeObjectURL(prev.url);
            }
            catch (_) { } return null; });
    }
    function downloadPreviewPdf() {
        const p = pdfPreview;
        if (!p)
            return;
        const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent || "") || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        if (isIOS) {
            window.open(p.url, "_blank");
        }
        else {
            const a = document.createElement("a");
            a.href = p.url;
            a.download = p.fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
        showToast(language === "EN" ? "PDF downloaded." : "PDF indirildi.");
    }
    /* PDF her zaman sitenin ŞU ANKİ dilinde üretilir; indirmeden önce ön izleme penceresi açılır. */
    async function createPDF(openPreview = false, kind = "price") {
        if (pdfBusy || !data)
            return;
        kind = kind === "catalog" ? "catalog" : "price";
        if (!consumeClientRateLimit("pdf:create", 6, 60 * 1000)) {
            showToast(language === "EN" ? "Too many PDF requests. Please wait a minute." : "Çok fazla PDF isteği. Lütfen bir dakika bekleyin.");
            return;
        }
        setPdfBusy(kind);
        const siteLang = language === "EN" ? "EN" : "TR";
        try {
            let blob, fileName, title;
            if (kind === "catalog") {
                blob = await buildCatalogPDF(data, siteLang, data.pdf?.catalogTemplate);
                fileName = siteLang === "EN" ? "OFISCHI-PRODUCT-CATALOG.pdf" : "OFISCHI-URUN-KATALOGU.pdf";
                title = siteLang === "EN" ? "Product Catalog" : "Ürün Kataloğu";
            }
            else {
                const pdfData = viewCurrencyData();
                const cur = pdfData.currency?.selected || "TRY";
                blob = await buildPriceListPDF(pdfData, siteLang);
                const curTag = cur === "TRY" ? "TL" : cur;
                fileName = siteLang === "EN" ? `OFISCHI-2026-2-${curTag}-PRICE-LIST.pdf` : `OFISCHI-2026-2-${curTag}-FIYAT-LISTESI.pdf`;
                title = siteLang === "EN" ? `Price List (${curTag})` : `Fiyat Listesi (${curTag})`;
            }
            const pages = pdfLastPages;
            if (!blob || blob.size <= 0)
                throw new Error("PDF doğrulaması başarısız: dosya boyutu 0.");
            if (blob.type !== "application/pdf")
                throw new Error("PDF doğrulaması başarısız: MIME type application/pdf değil.");
            pdfValidateBlobBytes(new Uint8Array(await blob.arrayBuffer()));
            const url = URL.createObjectURL(blob);
            if (openPreview) {
                /* Yönetim panelindeki "yeni sekmede aç" düğmesi */
                const win = window.open(url, "_blank");
                if (!win)
                    window.location.href = url;
                setTimeout(() => URL.revokeObjectURL(url), 180000);
                return;
            }
            setPdfPreview(prev => { if (prev?.url)
                try {
                    URL.revokeObjectURL(prev.url);
                }
                catch (_) { } return { url, fileName, title, pages: pages || [], accent: data?.theme?.accent }; });
        }
        catch (e) {
            console.error(e);
            showToast((siteLang === "EN" ? "PDF could not be created: " : "PDF oluşturulamadı: ") + (e?.message || "PDF oluşturma hatası"));
        }
        finally {
            setPdfBusy(false);
        }
    }
    async function uploadCategoryCover(categoryId, e) {
        const file = e.target.files?.[0];
        if (!file)
            return;
        try {
            validateUploadFile(file);
            await enforceClientRateLimit("admin:category-cover-upload", 10, 60 * 1000);
            const src = await fileToOptimizedDataURL(file, 1800, 300);
            updateData(x => { x.categories = x.categories.map(c => c.id === categoryId ? { ...c, coverImage: src } : c); });
            showToast("Kategori kapak görseli yüklendi. Kaydet'e basın.");
        }
        catch (err) {
            showToast("Kapak görseli yüklenemedi.");
        }
        finally {
            e.target.value = "";
        }
    }
    async function removeCategoryCover(categoryId) { if (!(await askConfirm("Kategori kapak görseli silinsin mi?", { title: "Kapak görselini sil", ok: "Sil", danger: true })))
        return; updateData(x => { x.categories = x.categories.map(c => c.id === categoryId ? { ...c, coverImage: null } : c); }); showToast("Kapak kaldırıldı. Kaydet'e basın."); }
    async function resetDefault() {
        if (!(await askConfirm("Genel site ayarları varsayılana döndürülsün mü? Ürünler ve kategoriler korunacaktır.", { title: "Varsayılana döndür", ok: "Döndür", danger: true })))
            return;
        const base = defaultData();
        const next = normalizeData(data);
        next.siteName = base.siteName;
        next.siteName_en = base.siteName_en;
        next.subtitle = base.subtitle;
        next.subtitle_en = base.subtitle_en;
        next.eyebrow = base.eyebrow;
        next.eyebrow_en = base.eyebrow_en;
        next.phone = base.phone;
        next.logo = { ...base.logo };
        next.theme = { ...base.theme };
        next.cardImgSize = base.cardImgSize;
        next.currency = { ...base.currency };
        setData(next);
        showToast("Genel ayarlar varsayılana döndürüldü. Kaydet'e basın.");
    }
    async function handleImport(e) {
        const file = e.target.files?.[0];
        if (!file)
            return;
        try {
            await enforceClientRateLimit("admin:json-import", 5, 60 * 1000);
            const imported = await readJSONFile(file);
            if (!(await askConfirm("İçe aktarılan katalog mevcut katalogla değiştirilecek. Mevcut verinizin yedeği önce alınacak. Devam edilsin mi?", { title: "Katalog içe aktar", ok: "Devam et", danger: true })))
                return;
            if (data)
                downloadJSON(data);
            setData(imported);
            setActiveCat((imported.categories || []).find(c => (c.items || []).length)?.id || imported.categories?.[0]?.id || null);
            setSaved(false);
            showToast("Katalog içe aktarıldı. Kaydet'e basın.");
        }
        catch (err) {
            console.error(err);
            showToast("Yedek yüklenemedi: " + (err?.message || "JSON dosyası okunamadı."));
        }
        finally {
            e.target.value = "";
        }
    }
    if (loading)
        return React.createElement("div", { style: { minHeight: "100vh", background: "#141416", color: "#aaa", display: "flex", alignItems: "center", justifyContent: "center" } }, language === "EN" ? "Loading data…" : "Veriler yükleniyor…");
    if (!data)
        return React.createElement("div", { style: { minHeight: "100vh", background: "#141416", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center" } }, language === "EN" ? "Site data could not be loaded." : "Site verileri yüklenemedi.");
    const categories = data.categories || [];
    /* Ziyaretçi yalnızca ürünü olan kategorileri görür (yönetim paneli hepsini gösterir). */
    const publicCategories = categories.filter(c => (c.items || []).length > 0);
    const activeCategory = publicCategories.find(c => c.id === activeCat) || publicCategories[0] || null;
    const allProducts = categories.flatMap(c => (c.items || []).map(i => ({ ...i, categoryName: c.name, categoryName_en: c.name_en })));
    const q = safeSearchText(deferredSearch).replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
    const qWords = q ? q.split(" ").filter(Boolean) : [];
    const visibleProducts = q ? allProducts.filter(i => {
        const text = [i.name, i.name_en, i.desc, i.desc_en, i.dims, i.dims_en, i.categoryName, i.categoryName_en, ...(normalizePrice(i.price).parts || []).flatMap(p => [p.name, p.name_en])].filter(Boolean).join(" ");
        const tr = text.toLocaleLowerCase("tr-TR"), en = text.toLocaleLowerCase("en-US");
        return qWords.every(w => tr.includes(w) || en.includes(w));
    }) : (activeCategory?.items || []).map(i => ({ ...i, categoryName: activeCategory.name, categoryName_en: activeCategory.name_en }));
    /* Marka adı çevrilmez: EN alanı yalnızca yöneticinin elle girdiği farklı bir değer varsa ve otomatik bozulma değilse kullanılır. */
    const theme = data.theme, ink = inkOn(data.theme?.accent), currency = getCurrency(), siteName = data.siteName || data.siteName_en || "";
    const subtitle = getText(language, data.subtitle, data.subtitle_en, data.subtitle);
    const eyebrow = getText(language, data.eyebrow, data.eyebrow_en, data.eyebrow);
    const categoryDisplay = c => getText(language, c.name, c.name_en, c.name);
    const productDisplay = i => getText(language, i.name, i.name_en, i.name);
    const productDesc = i => getText(language, i.desc, i.desc_en, i.desc);
    /* Parça satırı olan ürünlerde ölçüler parça satırlarında gösterilir; parça yoksa ürün ölçüsü gösterilir. */
    const productDims = i => normalizePrice(i?.price).parts.length ? "" : String(getText(language, i?.dims, i?.dims_en, i?.dims) || "").trim();
    const hasContactParts = i => normalizePrice(i?.price).parts.some(p => p.contactOnly || p.amount === null);
    const itemCategoryId = new Map();
    categories.forEach(c => (c.items || []).forEach(i => itemCategoryId.set(i.id, c.id)));
    const layoutOfItem = i => categoryLayoutOf(data, itemCategoryId.get(i?.id));
    /* Ölçü/model düzenindeki ürünlerde fiyatlar alternatiftir: toplam değil "…'den başlayan" gösterilir. */
    const cardPrice = i => isVariantLayout(layoutOfItem(i)) ? variantMinPrice(i.price) : priceTotal(i.price);
    const cardPriceLabel = i => isVariantLayout(layoutOfItem(i)) ? (language === "EN" ? "From" : "Başlayan fiyat") : t(language, "total");
    const cardPriceSub = i => { const lay = layoutOfItem(i), n = normalizePrice(i.price).parts.length; if (lay === "sizes" && n)
        return language === "EN" ? `${n} sizes` : `${n} ölçü seçeneği`; if (lay === "models" && n)
        return language === "EN" ? `${n} models` : `${n} model`; return hasContactParts(i) ? (language === "EN" ? "Some items: ask for price" : "Bazı kalemler: fiyat sorunuz") : t(language, "detailedPrices"); };
    const productCategoryName = i => { const c = categories.find(c => (c.items || []).some(x => x.id === i?.id)); return c ? categoryDisplay(c) : ""; };
    const partDimensionDisplay = p => getText(language, p?.dims, p?.dims_en, p?.dims) || "";
    const partDisplay = p => {
        if (language !== "EN")
            return p.name || "";
        const source = String(p?.name || "").trim();
        const stored = String(p?.name_en || "").trim();
        // A default English placeholder must not mask a newly entered Turkish part name.
        if (stored && stored !== source && !(source !== "Yeni Parça" && stored === "New Part"))
            return stored;
        /* Price components must never remain Turkish in EN mode. Use the same
           deterministic catalog translator as the admin translation tools. */
        const exactPart = {
            "ETAJERLİ MASA": "DESK WITH RETURN",
            "DOLAP": "CABINET",
            "SEHPA": "COFFEE TABLE",
            "ÜNİTE": "UNIT",
            "MASA": "DESK",
            "ETAJER": "RETURN"
        };
        const key = source.toLocaleUpperCase("tr-TR");
        return exactPart[key] || translateFallbackSync(source) || source || "";
    };

    /* ==================== YENİ YÖNETİM PANELİ (Komuta Merkezi + Akıllı Tablo + Yan Düzenleyici) ==================== */
    const admFmt = n => (n === null || n === undefined || !Number.isFinite(Number(n))) ? "—" : Math.floor(Number(n)).toLocaleString("tr-TR") + " ₺";
    const admKey = (cid, id) => cid + "/" + id;
    const admImgs = it => (Array.isArray(it.images) && it.images.filter(Boolean).length ? it.images.filter(Boolean) : (it.image ? [it.image] : []));
    const admAll = categories.flatMap(c => (c.items || []).map(it => ({ c, it })));
    const admLayout = c => categoryLayoutOf(data, c.id);
    const admPriceInfo = (c, it) => {
        const p = normalizePrice(it.price), lay = admLayout(c);
        if (isVariantLayout(lay))
            return { label: "Başlayan", value: variantMinPrice(it.price), total: null, variant: true, p };
        return { label: "Takım", value: priceTotal(it.price), total: priceTotal(it.price), variant: false, p };
    };
    const admIssuesOf = (c, it) => {
        const out = [], p = normalizePrice(it.price);
        if (!admImgs(it).length)
            out.push("Fotoğraf yok");
        if (!String(it.name || "").trim() || it.name === "Yeni Ürün")
            out.push("Ürün adı yok");
        const priced = p.parts.some(x => x.amount !== null && !x.contactOnly);
        if (!p.parts.length || (!priced && !p.parts.some(x => x.contactOnly)))
            out.push("Fiyat yok");
        else if (!isVariantLayout(admLayout(c)) && p.parts.length > 1 && priceTotal(it.price) === null)
            out.push("Takım fiyatı yok");
        return out;
    };
    const RECENT_KEY = "ofischi_admin_recent_v1";
    const admRecentList = () => {
        try {
            const a = JSON.parse(lsGet(RECENT_KEY) || "[]");
            return Array.isArray(a) ? a.filter(x => typeof x === "string").slice(0, 8) : [];
        }
        catch (_) {
            return [];
        }
    };
    function admNoteRecent(cid, id) { const k = admKey(cid, id); const a = [k, ...admRecentList().filter(x => x !== k)].slice(0, 8); lsSet(RECENT_KEY, JSON.stringify(a)); }
    function admOpenEditor(cid, id, tab) { admNoteRecent(cid, id); setAdmEdit({ cid, id }); setAdmTab(tab || "bilgi"); }
    function admGo(section) {
        var _a;
        setAdminSection(section);
        setAdmEdit(null);
        try {
            (_a = document.querySelector(".adm-content")) === null || _a === void 0 ? void 0 : _a.scrollTo({ top: 0 });
        }
        catch (_) { }
    }
    function admAddProduct(cid) {
        if (!cid)
            return;
        const id = addItem(cid);
        setAdmAddPick(false);
        setAdmCat(cid);
        setAdminSection("urunler");
        if (id)
            setTimeout(() => admOpenEditor(cid, id, "bilgi"), 30);
    }
    function admToggleSel(k) {
        setAdmSel(prev => {
            const n = new Set(prev);
            if (n.has(k))
                n.delete(k);
            else
                n.add(k);
            return n;
        });
    }
    async function admApplyBulk(keys) {
        const v = Number(String(admBulk.value).replace(",", "."));
        if (!keys.length || !Number.isFinite(v) || v === 0) {
            showToast("Önce bir değer yazın (ör. 8 veya -5).");
            return;
        }
        if (Math.abs(v) > (admBulk.mode === "pct" ? 90 : 10000000)) {
            showToast("Değer çok büyük.");
            return;
        }
        const desc = admBulk.mode === "pct" ? `%${v > 0 ? "+" : ""}${v}` : `${v > 0 ? "+" : ""}${Math.floor(v).toLocaleString("tr-TR")} ₺`;
        if (!(await askConfirm(`${keys.length} ürünün tüm fiyatlarına ${desc} uygulansın mı?\n\nKaydet ve yayınla'ya basana kadar geri alabilirsiniz (paneli kaydetmeden kapatın).`, { title: "Toplu fiyat güncelle", ok: "Uygula", danger: false })))
            return;
        const ks = new Set(keys);
        const f = a => {
            if (a === null || a === undefined)
                return a;
            const n = admBulk.mode === "pct" ? Math.round(Number(a) * (1 + v / 100)) : Math.round(Number(a) + v);
            return Math.max(0, n);
        };
        updateData(x => {
            x.categories = x.categories.map(c => ({ ...c, items: c.items.map(it => {
                    if (!ks.has(admKey(c.id, it.id)))
                        return it;
                    const p = normalizePrice(it.price);
                    return { ...it, price: { ...p, manualTotal: f(p.manualTotal), parts: p.parts.map(pt => ({ ...pt, amount: f(pt.amount) })) } };
                }) }));
        });
        setAdmSel(new Set());
        setAdmBulk(b => ({ ...b, value: "" }));
        showToast(`${keys.length} ürünün fiyatı güncellendi. Yayınlamak için "Kaydet ve yayınla".`);
    }
    async function admBulkDelete(keys) {
        if (!keys.length)
            return;
        const ks = new Set(keys);
        const names = admAll.filter(({ c, it }) => ks.has(admKey(c.id, it.id))).map(({ it }) => it.name || "Adsız ürün");
        const list = names.slice(0, 8).join(", ") + (names.length > 8 ? ` ve ${names.length - 8} ürün daha` : "");
        if (!(await askConfirm(`${keys.length} ürün silinsin mi?\n\n${list}\n\n"Kaydet ve yayınla"ya basmadan paneli kaydetmeden kapatırsanız silme geri alınır.`, { title: "Seçilen ürünleri sil", ok: "Sil", danger: true })))
            return;
        updateData(x => { x.categories = x.categories.map(c => ({ ...c, items: c.items.filter(it => !ks.has(admKey(c.id, it.id))) })); });
        if (admEdit && ks.has(admKey(admEdit.cid, admEdit.id)))
            setAdmEdit(null);
        setAdmSel(new Set());
        showToast(`${keys.length} ürün silindi. Kalıcı olması için "Kaydet ve yayınla".`);
    }
    /* --- Sürükle-bırak ile sıralama (fare ve dokunmatik; tutamaçtan tutulur) --- */
    function admMoveTo(cid, fromId, toId) {
        if (fromId === toId)
            return;
        updateData(x => {
            x.categories = x.categories.map(c => {
                if (c.id !== cid)
                    return c;
                const l = [...c.items], i = l.findIndex(a => a.id === fromId), j = l.findIndex(a => a.id === toId);
                if (i < 0 || j < 0)
                    return c;
                const [m] = l.splice(i, 1);
                l.splice(j, 0, m);
                return { ...c, items: l };
            });
        });
    }
    function admDragStart(e, c, it) {
        if (e.button !== undefined && e.button !== 0)
            return;
        e.preventDefault();
        e.stopPropagation();
        const from = { cid: c.id, id: it.id, key: admKey(c.id, it.id) };
        let over = null, lastY = e.clientY, raf = 0;
        setAdmDrag({ from: from.key, over: null, bad: false });
        const scroller = document.querySelector(".adm-content");
        const tick = () => {
            if (!scroller)
                return;
            const r = scroller.getBoundingClientRect();
            const edge = 80;
            if (lastY < r.top + edge)
                scroller.scrollTop -= Math.ceil((r.top + edge - lastY) / 6);
            else if (lastY > r.bottom - edge)
                scroller.scrollTop += Math.ceil((lastY - (r.bottom - edge)) / 6);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        const move = ev => {
            lastY = ev.clientY;
            const el = document.elementFromPoint(ev.clientX, ev.clientY);
            const t = el && el.closest ? el.closest("[data-adm-key]") : null;
            const key = t ? t.getAttribute("data-adm-key") : null;
            const bad = !!key && key.split("/")[0] !== from.cid;
            if (key !== (over && over.key) || bad !== (over && over.bad)) {
                over = key ? { key, bad } : null;
                setAdmDrag({ from: from.key, over: key, bad });
            }
            ev.preventDefault();
        };
        const end = () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", end);
            window.removeEventListener("pointercancel", end);
            setAdmDrag(null);
            if (!over || over.key === from.key)
                return;
            if (over.bad) {
                showToast("Ürün sadece kendi kategorisi içinde taşınabilir.");
                return;
            }
            admMoveTo(from.cid, from.id, over.key.slice(from.cid.length + 1));
            showToast("Sıra değişti. Kalıcı olması için \u201CKaydet ve yayınla\u201D.");
        };
        window.addEventListener("pointermove", move, { passive: false });
        window.addEventListener("pointerup", end);
        window.addEventListener("pointercancel", end);
    }
    const admDragCls = k => !admDrag ? "" : (admDrag.from === k ? " is-dragging" : admDrag.over === k ? (admDrag.bad ? " is-dropbad" : " is-drop") : "");
    const admGrip = (c, it) => React.createElement("button", { type: "button", className: "adm-grip", "aria-label": (it.name || "Ürün") + " sırasını sürükleyerek değiştir", title: "S\u00FCr\u00FCkleyerek s\u0131rala", onPointerDown: e => admDragStart(e, c, it), onKeyDown: e => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                moveItem(c.id, it.id, e.key === "ArrowUp" ? -1 : 1);
            }
        } },
        React.createElement(AdmIcon, { name: "grip", size: 16 }));
    async function admSaveNow() {
        await save(true);
    }
    /* --- Filtrelenmiş ürün listesi --- */
    const admQ = safeSearchText(admQuery).toLocaleLowerCase("tr-TR");
    const admRows = admAll.filter(({ c, it }) => {
        if (admCat && c.id !== admCat)
            return false;
        if (admIssues && !admIssuesOf(c, it).length)
            return false;
        if (!admQ)
            return true;
        const hay = [it.name, it.desc, c.name, ...normalizePrice(it.price).parts.map(p => p.name)].join(" ").toLocaleLowerCase("tr-TR");
        return admQ.split(/\s+/).every(w => hay.includes(w));
    });
    const admEditing = admEdit ? (() => { const c = categories.find(x => x.id === admEdit.cid); const it = c && c.items.find(x => x.id === admEdit.id); return c && it ? { c, it } : null; })() : null;
    const admDirty = !!admBaseRef.current && data !== admBaseRef.current;
    /* --- Ortak parçalar --- */
    const admThumb = (it, size = 48) => {
        const src = admImgs(it)[0];
        return src
            ? React.createElement(CachedImage, { src: src, alt: "", className: "adm-thumb", style: { width: size, height: Math.round(size * .75) } })
            : React.createElement("span", { className: "adm-thumb adm-thumb-empty", style: { width: size, height: Math.round(size * .75) } },
                React.createElement(AdmIcon, { name: "image", size: 16 }));
    };
    function admRenderDashboard() {
        const photos = admAll.reduce((n, { it }) => n + admImgs(it).length, 0);
        const issues = admAll.map(r => ({ ...r, list: admIssuesOf(r.c, r.it) })).filter(r => r.list.length);
        const byType = {};
        issues.forEach(r => r.list.forEach(t => { (byType[t] = byType[t] || []).push(r); }));
        const pending = trPendingLoad().size;
        const trMissing = trMissingKeys(data).length;
        const usedCats = categories.filter(c => (c.items || []).length).length;
        const recent = admRecentList().map(k => { const [cid, id] = k.split("/"); const c = categories.find(x => x.id === cid); const it = c && c.items.find(x => x.id === id); return c && it ? { c, it } : null; }).filter(Boolean).slice(0, 6);
        const now = new Date();
        const dayStr = now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" }).toLocaleUpperCase("tr-TR");
        return React.createElement("div", { className: "adm-page" },
            React.createElement("div", { className: "adm-eyebrow" }, dayStr),
            React.createElement("h1", { className: "adm-h1" }, "Ho\u015F geldiniz, katalog haz\u0131r."),
            React.createElement("div", { className: "adm-grid4" },
                React.createElement("div", { className: "adm-card adm-stat" },
                    React.createElement("div", { className: "adm-stat-l" }, "\u00DCr\u00FCn"),
                    React.createElement("div", { className: "adm-stat-v" }, admAll.length.toLocaleString("tr-TR")),
                    React.createElement("div", { className: "adm-stat-s" },
                        usedCats,
                        " kategoride")),
                React.createElement("div", { className: "adm-card adm-stat" },
                    React.createElement("div", { className: "adm-stat-l" }, "Foto\u011Fraf"),
                    React.createElement("div", { className: "adm-stat-v" }, photos.toLocaleString("tr-TR")),
                    React.createElement("div", { className: "adm-stat-s " + ((byType["Fotoğraf yok"] || []).length ? "adm-warn" : "adm-ok") }, (byType["Fotoğraf yok"] || []).length ? `${byType["Fotoğraf yok"].length} ürün fotoğrafsız` : "Fotoğrafsız ürün yok")),
                React.createElement("div", { className: "adm-card adm-stat" },
                    React.createElement("div", { className: "adm-stat-l" }, "\u0130ngilizce \u00E7eviri"),
                    React.createElement("div", { className: "adm-stat-v" }, trMissing ? trMissing : React.createElement(AdmIcon, { name: "check", size: 28 })),
                    React.createElement("div", { className: "adm-stat-s " + (trMissing ? "adm-warn" : "adm-ok") }, trMissing ? "alanın çevirisi eksik" : "Hepsi çevrildi"),
                    React.createElement("button", { type: "button", className: "adm-linkbtn", disabled: trBusy > 0, onClick: translateMissingNow }, trBusy > 0 ? "Çevriliyor… (" + trBusy + ")" : "Eksik çevirileri tamamla")),
                React.createElement("div", { className: "adm-card adm-stat" },
                    React.createElement("div", { className: "adm-stat-l" }, "Kur (USD / EUR)"),
                    React.createElement("div", { className: "adm-stat-v" },
                        data.currency.usdRate,
                        " / ",
                        data.currency.eurRate),
                    React.createElement("button", { type: "button", className: "adm-linkbtn", onClick: () => admGo("fiyat") }, "Kurlar\u0131 g\u00FCncelle"))),
            React.createElement("div", { className: "adm-grid4" },
                React.createElement("button", { type: "button", className: "adm-action adm-action-gold", onClick: () => setAdmAddPick(true) },
                    React.createElement(AdmIcon, { name: "plus", size: 22 }),
                    React.createElement("span", { className: "adm-action-t" }, "Yeni \u00FCr\u00FCn ekle"),
                    React.createElement("span", { className: "adm-action-s" }, "Foto\u011Fraf, \u00F6l\u00E7\u00FC ve fiyat tek ekranda")),
                React.createElement("button", { type: "button", className: "adm-action", onClick: () => { admGo("urunler"); setAdmView("table"); showToast("Ürünleri seçin, alttaki çubuktan % ya da ₺ uygulayın."); } },
                    React.createElement(AdmIcon, { name: "percent", size: 22 }),
                    React.createElement("span", { className: "adm-action-t" }, "Toplu fiyat g\u00FCncelle"),
                    React.createElement("span", { className: "adm-action-s" }, "Se\u00E7ili \u00FCr\u00FCnlere % zam / indirim")),
                React.createElement("button", { type: "button", className: "adm-action", onClick: () => createPDF(false, "price"), disabled: !!pdfBusy },
                    React.createElement(AdmIcon, { name: "file", size: 22 }),
                    React.createElement("span", { className: "adm-action-t" }, pdfBusy === "price" ? "Hazırlanıyor…" : "Fiyat listesi PDF"),
                    React.createElement("span", { className: "adm-action-s" }, "\u00D6n izleme ve indirme")),
                React.createElement("button", { type: "button", className: "adm-action", onClick: () => createPDF(false, "catalog"), disabled: !!pdfBusy },
                    React.createElement(AdmIcon, { name: "book", size: 22 }),
                    React.createElement("span", { className: "adm-action-t" }, pdfBusy === "catalog" ? "Hazırlanıyor…" : "Katalog PDF"),
                    React.createElement("span", { className: "adm-action-s" }, "Fiyats\u0131z, se\u00E7ili \u015Fablonla"))),
            React.createElement("div", { className: "adm-grid-2-1" },
                React.createElement("section", { className: "adm-card" },
                    React.createElement("div", { className: "adm-card-h" },
                        React.createElement("h2", null, "Son d\u00FCzenlenenler"),
                        React.createElement("button", { type: "button", className: "adm-linkbtn", onClick: () => admGo("urunler") }, "T\u00FCm \u00FCr\u00FCnler")),
                    recent.length === 0 && React.createElement("div", { className: "adm-empty" }, "Hen\u00FCz d\u00FCzenleme yok. Bir \u00FCr\u00FCne t\u0131klad\u0131\u011F\u0131n\u0131zda burada g\u00F6r\u00FCn\u00FCr."),
                    recent.map(({ c, it }) => {
                        const pi = admPriceInfo(c, it);
                        return React.createElement("button", { type: "button", key: admKey(c.id, it.id), className: "adm-recent", onClick: () => admOpenEditor(c.id, it.id) },
                            admThumb(it, 56),
                            React.createElement("span", { className: "adm-recent-t" },
                                React.createElement("b", null, it.name || "Adsız ürün"),
                                React.createElement("span", null, c.name)),
                            React.createElement("span", { className: "adm-gold" }, pi.value === null ? "—" : admFmt(pi.value) + (pi.variant ? "'den" : "")));
                    })),
                React.createElement("section", { className: "adm-card" },
                    React.createElement("div", { className: "adm-card-h" },
                        React.createElement("h2", null, "Dikkat edilecekler")),
                    Object.keys(byType).length === 0 && React.createElement("div", { className: "adm-note adm-note-ok" },
                        React.createElement(AdmIcon, { name: "check", size: 16 }),
                        "T\u00FCm \u00FCr\u00FCnlerde foto\u011Fraf ve fiyat var."),
                    Object.entries(byType).map(([type, rows]) => React.createElement("button", { type: "button", key: type, className: "adm-note adm-note-warn", onClick: () => {
                            if (rows.length === 1)
                                admOpenEditor(rows[0].c.id, rows[0].it.id, type === "Fotoğraf yok" ? "foto" : type === "Ürün adı yok" ? "bilgi" : "fiyat");
                            else {
                                setAdmIssues(true);
                                setAdmCat("");
                                admGo("urunler");
                            }
                        } },
                        React.createElement(AdmIcon, { name: "alert", size: 16 }),
                        React.createElement("span", null,
                            React.createElement("b", null, type),
                            " \u00B7 ",
                            rows.length,
                            " \u00FCr\u00FCn: ",
                            rows.slice(0, 3).map(r => r.it.name || "Adsız").join(", "),
                            rows.length > 3 ? "…" : ""))),
                    pending > 0 && React.createElement("div", { className: "adm-note" },
                        React.createElement(AdmIcon, { name: "clock", size: 16 }),
                        pending,
                        " metnin \u0130ngilizcesi internet gelince otomatik \u00E7evrilecek."))));
    }
    function admRenderProducts() {
        const shown = admRows.slice(0, admLimit);
        const selKeys = [...admSel];
        const allShownSelected = shown.length > 0 && shown.every(({ c, it }) => admSel.has(admKey(c.id, it.id)));
        return React.createElement("div", { className: "adm-page adm-page-wide" },
            React.createElement("div", { className: "adm-headrow" },
                React.createElement("div", null,
                    React.createElement("h1", { className: "adm-h1" }, "\u00DCr\u00FCnler & Fiyatlar"),
                    React.createElement("p", { className: "adm-sub" }, admView === "table" ? "Fiyata tıklayıp yazın; satıra tıklayınca ürün sağda açılır. Sırayı değiştirmek için ⋮⋮ tutamacından sürükleyin." : "Karta tıklayınca ürün sağda açılır. Sırayı değiştirmek için sağ üstteki ⋮⋮ tutamacından sürükleyin.")),
                React.createElement("div", { className: "adm-row-gap" },
                    React.createElement("div", { className: "adm-seg", role: "group", "aria-label": "G\u00F6r\u00FCn\u00FCm" },
                        React.createElement("button", { type: "button", "aria-pressed": admView === "table", onClick: () => setAdmView("table") },
                            React.createElement(AdmIcon, { name: "table", size: 16 }),
                            "Tablo"),
                        React.createElement("button", { type: "button", "aria-pressed": admView === "cards", onClick: () => setAdmView("cards") },
                            React.createElement(AdmIcon, { name: "cards", size: 16 }),
                            "Kartlar")),
                    React.createElement("button", { type: "button", className: "adm-btn adm-btn-gold", onClick: () => admCat ? admAddProduct(admCat) : setAdmAddPick(true) },
                        React.createElement(AdmIcon, { name: "plus", size: 16 }),
                        "\u00DCr\u00FCn ekle"))),
            React.createElement("div", { className: "adm-filters" },
                React.createElement("label", { className: "adm-search" },
                    React.createElement(AdmIcon, { name: "search", size: 16 }),
                    React.createElement("input", { type: "search", "aria-label": "\u00DCr\u00FCnlerde ara", placeholder: "\u00DCr\u00FCn, mod\u00FCl veya kategori ara\u2026", value: admQuery, onChange: e => { setAdmQuery(safeText(e.target.value, SECURITY_LIMITS.search)); setAdmLimit(80); } })),
                React.createElement("select", { className: "adm-select", "aria-label": "Kategori filtresi", value: admCat, onChange: e => { setAdmCat(e.target.value); setAdmLimit(80); } },
                    React.createElement("option", { value: "" },
                        "T\u00FCm kategoriler \u00B7 ",
                        admAll.length),
                    categories.map(c => React.createElement("option", { key: c.id, value: c.id },
                        c.name,
                        " \u00B7 ",
                        c.items.length))),
                React.createElement("button", { type: "button", className: "adm-chip" + (admIssues ? " is-on" : ""), "aria-pressed": admIssues, onClick: () => setAdmIssues(v => !v) },
                    React.createElement(AdmIcon, { name: "alert", size: 14 }),
                    "Sadece eksikler"),
                React.createElement("span", { className: "adm-count" },
                    admRows.length,
                    " \u00FCr\u00FCn")),
            admView === "table" ? React.createElement("div", { className: "adm-tablewrap" },
                React.createElement("table", { className: "adm-table" },
                    React.createElement("thead", null,
                        React.createElement("tr", null,
                            React.createElement("th", { style: { width: 36 }, "aria-label": "S\u0131rala" }),
                            React.createElement("th", { style: { width: 40 } },
                                React.createElement("input", { type: "checkbox", "aria-label": "G\u00F6r\u00FCnenlerin hepsini se\u00E7", checked: allShownSelected, onChange: e => setAdmSel(prev => { const n = new Set(prev); shown.forEach(({ c, it }) => e.target.checked ? n.add(admKey(c.id, it.id)) : n.delete(admKey(c.id, it.id))); return n; }) })),
                            React.createElement("th", { style: { width: 64 } }, "Foto"),
                            React.createElement("th", null, "\u00DCr\u00FCn"),
                            React.createElement("th", null, "Kategori"),
                            React.createElement("th", null, "Kalemler"),
                            React.createElement("th", { style: { width: 170 } }, "Fiyat"),
                            React.createElement("th", { style: { width: 160 } }, "Tak\u0131m / ba\u015Flayan"),
                            React.createElement("th", { style: { width: 120 } }, "Durum"))),
                    React.createElement("tbody", null, shown.map(({ c, it }) => {
                        var _a, _b;
                        const k = admKey(c.id, it.id), pi = admPriceInfo(c, it), parts = pi.p.parts, iss = admIssuesOf(c, it), sel = admSel.has(k), single = parts.length === 1 ? parts[0] : null;
                        return React.createElement("tr", { key: k, "data-adm-key": k, className: (sel ? "is-sel " : "") + (admEdit && admEdit.id === it.id && admEdit.cid === c.id ? "is-open" : "") + admDragCls(k) },
                            React.createElement("td", null, admGrip(c, it)),
                            React.createElement("td", null,
                                React.createElement("input", { type: "checkbox", "aria-label": (it.name || "Ürün") + " seç", checked: sel, onChange: () => admToggleSel(k) })),
                            React.createElement("td", null,
                                React.createElement("button", { type: "button", className: "adm-cellbtn", "aria-label": (it.name || "Ürün") + " düzenle", onClick: () => admOpenEditor(c.id, it.id, "foto") }, admThumb(it, 48))),
                            React.createElement("td", null,
                                React.createElement("button", { type: "button", className: "adm-namebtn", onClick: () => admOpenEditor(c.id, it.id) }, it.name || "Adsız ürün")),
                            React.createElement("td", { className: "adm-muted" }, c.name),
                            React.createElement("td", { className: "adm-muted adm-ellipsis" }, parts.length ? parts.slice(0, 3).map(p => p.name).join(" · ") + (parts.length > 3 ? ` +${parts.length - 3}` : "") : "—"),
                            React.createElement("td", null, single ? React.createElement("span", { className: "adm-priceedit" },
                                React.createElement("input", { type: "text", inputMode: "numeric", "aria-label": (it.name || "Ürün") + " fiyatı", value: (_a = single.amount) !== null && _a !== void 0 ? _a : "", placeholder: "\u2014", disabled: single.contactOnly, onChange: e => updatePricePart(c.id, it.id, single.id, "amount", e.target.value === "" ? null : priceNumber(e.target.value)) }),
                                React.createElement("span", null, "\u20BA"))
                                : React.createElement("button", { type: "button", className: "adm-linkbtn", onClick: () => admOpenEditor(c.id, it.id, "fiyat") },
                                    parts.length,
                                    " kalem d\u00FCzenle")),
                            React.createElement("td", null, !pi.variant && pi.p.autoCollect === false && parts.length > 1
                                ? React.createElement("span", { className: "adm-priceedit is-total" },
                                    React.createElement("input", { type: "text", inputMode: "numeric", "aria-label": (it.name || "Ürün") + " takım fiyatı", value: (_b = pi.p.manualTotal) !== null && _b !== void 0 ? _b : "", placeholder: "Tak\u0131m fiyat\u0131 gir", onChange: e => updateItem(c.id, it.id, "price", { ...pi.p, manualTotal: priceNumber(e.target.value) }) }),
                                    React.createElement("span", null, "\u20BA"))
                                : React.createElement("span", { className: "adm-gold" }, pi.value === null ? "—" : admFmt(pi.value) + (pi.variant ? "'den" : ""))),
                            React.createElement("td", null, iss.length ? React.createElement("span", { className: "adm-badge adm-badge-warn", title: iss.join(", ") }, iss[0]) : React.createElement("span", { className: "adm-badge adm-badge-ok" }, "Tamam")));
                    }))),
                shown.length === 0 && React.createElement("div", { className: "adm-empty adm-pad" }, "Bu filtreyle \u00FCr\u00FCn bulunamad\u0131."))
                : React.createElement("div", { className: "adm-cards" },
                    shown.map(({ c, it }) => {
                        const k = admKey(c.id, it.id), pi = admPriceInfo(c, it), iss = admIssuesOf(c, it), src = admImgs(it)[0];
                        return React.createElement("div", { key: k, "data-adm-key": k, className: "adm-pcard" + (admEdit && admEdit.id === it.id && admEdit.cid === c.id ? " is-open" : "") + (admSel.has(k) ? " is-sel" : "") + admDragCls(k) },
                            React.createElement("span", { className: "adm-pcard-grip" }, admGrip(c, it)),
                            React.createElement("label", { className: "adm-pcard-check" },
                                React.createElement("input", { type: "checkbox", "aria-label": (it.name || "Ürün") + " seç", checked: admSel.has(k), onChange: () => admToggleSel(k) })),
                            React.createElement("button", { type: "button", className: "adm-pcard-btn", onClick: () => admOpenEditor(c.id, it.id) },
                                React.createElement("span", { className: "adm-pcard-img" }, src ? React.createElement(CachedImage, { src: src, alt: "" }) : React.createElement(AdmIcon, { name: "image", size: 28 })),
                                React.createElement("span", { className: "adm-pcard-body" },
                                    React.createElement("b", null, it.name || "Adsız ürün"),
                                    React.createElement("span", { className: "adm-muted" }, c.name),
                                    React.createElement("span", { className: "adm-pcard-price" }, pi.value === null ? "Fiyat yok" : admFmt(pi.value) + (pi.variant ? "'den" : "")),
                                    iss.length > 0 && React.createElement("span", { className: "adm-badge adm-badge-warn" }, iss[0]))));
                    }),
                    shown.length === 0 && React.createElement("div", { className: "adm-empty adm-pad" }, "Bu filtreyle \u00FCr\u00FCn bulunamad\u0131.")),
            admRows.length > shown.length && React.createElement("div", { className: "adm-more" },
                React.createElement("button", { type: "button", className: "adm-btn", onClick: () => setAdmLimit(n => n + 120) },
                    "Daha fazla g\u00F6ster (",
                    admRows.length - shown.length,
                    " \u00FCr\u00FCn daha)")),
            selKeys.length > 0 && React.createElement("div", { className: "adm-bulk", role: "region", "aria-label": "Toplu i\u015Flem" },
                React.createElement("b", null,
                    selKeys.length,
                    " \u00FCr\u00FCn se\u00E7ildi"),
                React.createElement("span", { className: "adm-sep" }),
                React.createElement("span", { className: "adm-muted-l" }, "Fiyatlar\u0131"),
                React.createElement("div", { className: "adm-seg adm-seg-dark", role: "group", "aria-label": "De\u011Fi\u015Fim t\u00FCr\u00FC" },
                    React.createElement("button", { type: "button", "aria-pressed": admBulk.mode === "pct", onClick: () => setAdmBulk(b => ({ ...b, mode: "pct" })) }, "%"),
                    React.createElement("button", { type: "button", "aria-pressed": admBulk.mode === "amt", onClick: () => setAdmBulk(b => ({ ...b, mode: "amt" })) }, "\u20BA")),
                React.createElement("input", { className: "adm-bulk-in", type: "text", inputMode: "decimal", "aria-label": "De\u011Fi\u015Fim miktar\u0131", placeholder: admBulk.mode === "pct" ? "ör. 8 veya -5" : "ör. 1000", value: admBulk.value, onChange: e => setAdmBulk(b => ({ ...b, value: e.target.value.replace(/[^0-9.,-]/g, "").slice(0, 12) })), onKeyDown: e => {
                        if (e.key === "Enter")
                            admApplyBulk(selKeys);
                    } }),
                React.createElement("button", { type: "button", className: "adm-btn adm-btn-gold", onClick: () => admApplyBulk(selKeys) }, "Uygula"),
                React.createElement("button", { type: "button", className: "adm-btn adm-danger-btn", onClick: () => admBulkDelete(selKeys) },
                    React.createElement(AdmIcon, { name: "trash", size: 16 }),
                    "Se\u00E7ilenleri sil"),
                React.createElement("button", { type: "button", className: "adm-btn adm-btn-ghost", onClick: () => setAdmSel(new Set()) }, "Se\u00E7imi kald\u0131r")));
    }
    function admRenderEditor() {
        var _a;
        if (!admEditing)
            return null;
        const { c, it } = admEditing, lay = admLayout(c), p = normalizePrice(it.price), imgs = admImgs(it), idx = c.items.findIndex(x => x.id === it.id);
        const close = () => setAdmEdit(null);
        return React.createElement("div", { className: "adm-drawer-wrap" },
            React.createElement("div", { className: "adm-drawer-bg", onClick: close }),
            React.createElement("aside", { className: "adm-drawer", role: "dialog", "aria-modal": "true", "aria-label": (it.name || "Ürün") + " düzenleniyor", onKeyDown: e => {
                    if (e.key === "Escape") {
                        e.stopPropagation();
                        close();
                    }
                } },
                React.createElement("div", { className: "adm-drawer-h" },
                    React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                        React.createElement("div", { className: "adm-eyebrow" }, c.name),
                        React.createElement("h2", { className: "adm-h2" }, it.name || "Adsız ürün")),
                    React.createElement("button", { type: "button", className: "adm-iconbtn", "aria-label": "Kapat", onClick: close },
                        React.createElement(AdmIcon, { name: "x", size: 18 }))),
                React.createElement("div", { className: "adm-tabs", role: "tablist", "aria-label": "D\u00FCzenleme b\u00F6l\u00FCmleri" }, [["bilgi", "Bilgiler"], ["foto", `Fotoğraflar · ${imgs.length}`], ["fiyat", lay === "models" ? "Modeller & Fiyatlar" : lay === "sizes" ? "Ölçüler & Fiyatlar" : "Modüller & Fiyatlar"]].map(([id, label]) => React.createElement("button", { key: id, type: "button", role: "tab", "aria-selected": admTab === id, className: admTab === id ? "is-on" : "", onClick: () => setAdmTab(id) }, label))),
                React.createElement("div", { className: "adm-drawer-body" },
                    admTab === "bilgi" && React.createElement("div", { className: "adm-form" },
                        React.createElement("label", { className: "adm-field" },
                            React.createElement("span", null, "\u00DCr\u00FCn ad\u0131"),
                            React.createElement("input", { className: "adm-input adm-input-lg", value: it.name, onChange: e => editTurkishField(c.id, it, "name", e.target.value), placeholder: "\u00DCr\u00FCn ad\u0131" })),
                        React.createElement("label", { className: "adm-field" },
                            React.createElement("span", null, "A\u00E7\u0131klama"),
                            React.createElement("textarea", { className: "adm-input", rows: "4", value: it.desc, onChange: e => editTurkishField(c.id, it, "desc", e.target.value), placeholder: "K\u0131sa a\u00E7\u0131klama (\u00F6r. 3+1+1 tak\u0131m)" })),
                        p.parts.length === 0 && React.createElement("label", { className: "adm-field" },
                            React.createElement("span", null, "\u00D6l\u00E7\u00FCler"),
                            React.createElement("input", { className: "adm-input", value: it.dims, onChange: e => { const v = e.target.value; updateItem(c.id, it.id, "dims", v); updateItem(c.id, it.id, "dims_en", v); }, placeholder: "\u00D6r. 200\u00D790\u00D775 cm" })),
                        React.createElement("div", { className: "adm-info" }, "\u0130ngilizce kar\u015F\u0131l\u0131klar yazmay\u0131 b\u0131rakt\u0131\u011F\u0131n\u0131zda otomatik \u00E7evrilir; ayr\u0131ca bir \u015Fey yapman\u0131z gerekmez."),
                        React.createElement("div", { className: "adm-field" },
                            React.createElement("span", null, "S\u0131radaki yeri"),
                            React.createElement("div", { className: "adm-row-gap" },
                                React.createElement("button", { type: "button", className: "adm-btn", disabled: idx <= 0, onClick: () => moveItem(c.id, it.id, -1) },
                                    React.createElement(AdmIcon, { name: "up", size: 16 }),
                                    "Yukar\u0131"),
                                React.createElement("button", { type: "button", className: "adm-btn", disabled: idx >= c.items.length - 1, onClick: () => moveItem(c.id, it.id, 1) },
                                    React.createElement(AdmIcon, { name: "down", size: 16 }),
                                    "A\u015Fa\u011F\u0131"),
                                React.createElement("span", { className: "adm-muted" },
                                    idx + 1,
                                    ". s\u0131rada / ",
                                    c.items.length)))),
                    admTab === "foto" && React.createElement("div", { className: "adm-form" },
                        React.createElement("button", { type: "button", className: "adm-drop", onClick: () => { var _a; return (_a = document.getElementById("adm-photo-input")) === null || _a === void 0 ? void 0 : _a.click(); } },
                            React.createElement(AdmIcon, { name: "upload", size: 30 }),
                            React.createElement("b", null, "Foto\u011Fraf ekle"),
                            React.createElement("span", null, "Birden fazla se\u00E7ebilirsiniz \u00B7 otomatik net WebP'ye \u00E7evrilir \u00B7 ilk foto\u011Fraf kapak olur")),
                        React.createElement("input", { id: "adm-photo-input", type: "file", accept: "image/*", multiple: true, className: "hidden", onChange: e => uploadProductImage(c.id, it.id, e) }),
                        React.createElement("div", { className: "adm-photos" }, imgs.map((src, i) => React.createElement("div", { key: i + "-" + String(src).length, className: "adm-photo" + (i === 0 ? " is-cover" : "") },
                            React.createElement(CachedImage, { src: src, alt: `${i + 1}. fotoğraf` }),
                            i === 0 ? React.createElement("span", { className: "adm-photo-tag" }, "KAPAK") : React.createElement("button", { type: "button", className: "adm-photo-cover", onClick: () => makeCoverImage(c.id, it.id, i) }, "Kapak yap"),
                            React.createElement("button", { type: "button", className: "adm-photo-del", "aria-label": `${i + 1}. fotoğrafı sil`, onClick: () => removeProductImage(c.id, it.id, i) },
                                React.createElement(AdmIcon, { name: "x", size: 14 }))))),
                        imgs.length === 0 && React.createElement("div", { className: "adm-empty" }, "Bu \u00FCr\u00FCnde hen\u00FCz foto\u011Fraf yok.")),
                    admTab === "fiyat" && React.createElement("div", { className: "adm-form" },
                        React.createElement("div", { className: "adm-info" },
                            lay === "models" ? "Her satır bir model (Müdür, Şef, Misafir…) ve kendi fotoğrafı. Sitede en düşük fiyat “başlayan fiyat” olarak görünür." : lay === "sizes" ? "Her satır bir ölçü seçeneği. Fiyatlar toplanmaz; sitede en düşük fiyat “başlayan fiyat” olarak görünür." : "Her satır bir modül. Takım fiyatı otomatik toplanabilir ya da elle girilebilir.",
                            " Fiyatlar TL, KDV hari\u00E7."),
                        p.parts.map((part, pi) => {
                            var _a;
                            return React.createElement("div", { key: part.id, className: "adm-part" },
                                lay === "models" && React.createElement("button", { type: "button", className: "adm-part-img", "aria-label": part.image ? "Model fotoğrafını değiştir" : "Model fotoğrafı ekle", onClick: () => { var _a; return (_a = document.getElementById("adm-part-img-" + part.id)) === null || _a === void 0 ? void 0 : _a.click(); } }, part.image ? React.createElement(CachedImage, { src: part.image, alt: "" }) : React.createElement(AdmIcon, { name: "image", size: 18 })),
                                lay === "models" && React.createElement("input", { id: "adm-part-img-" + part.id, type: "file", accept: "image/jpeg,image/png,image/webp", className: "hidden", onChange: e => uploadPartImage(c.id, it.id, part.id, e) }),
                                React.createElement("label", { className: "adm-field adm-grow" },
                                    React.createElement("span", null, lay === "models" ? "Model" : lay === "sizes" ? "Seçenek" : "Modül"),
                                    React.createElement("input", { className: "adm-input", value: part.name, onChange: e => updatePricePart(c.id, it.id, part.id, "name", e.target.value) })),
                                React.createElement("label", { className: "adm-field adm-w140" },
                                    React.createElement("span", null, "\u00D6l\u00E7\u00FC (cm)"),
                                    React.createElement("input", { className: "adm-input", value: part.dims || "", placeholder: "200x90x75", onChange: e => { const v = e.target.value; updatePricePart(c.id, it.id, part.id, "dims", v); updatePricePart(c.id, it.id, part.id, "dims_en", v); } })),
                                React.createElement("label", { className: "adm-field adm-w130" },
                                    React.createElement("span", null, "Fiyat (\u20BA)"),
                                    React.createElement("input", { className: "adm-input adm-num", type: "text", inputMode: "numeric", value: (_a = part.amount) !== null && _a !== void 0 ? _a : "", disabled: part.contactOnly, placeholder: part.contactOnly ? "Sorunuz" : "—", onChange: e => updatePricePart(c.id, it.id, part.id, "amount", e.target.value === "" ? null : priceNumber(e.target.value)) })),
                                React.createElement("div", { className: "adm-part-tools" },
                                    React.createElement("label", { className: "adm-mini" },
                                        React.createElement("input", { type: "checkbox", checked: !!part.contactOnly, onChange: e => updatePricePart(c.id, it.id, part.id, "contactOnly", e.target.checked) }),
                                        "Fiyat sorunuz"),
                                    React.createElement("button", { type: "button", className: "adm-iconbtn adm-danger", "aria-label": (part.name || "Kalem") + " sil", onClick: () => deletePricePart(c.id, it.id, part.id) },
                                        React.createElement(AdmIcon, { name: "trash", size: 15 }))));
                        }),
                        React.createElement("button", { type: "button", className: "adm-btn adm-btn-dashed", onClick: () => addPricePart(c.id, it.id) },
                            React.createElement(AdmIcon, { name: "plus", size: 16 }),
                            lay === "models" ? "Model ekle" : lay === "sizes" ? "Ölçü ekle" : "Modül ekle"),
                        !isVariantLayout(lay) && React.createElement("div", { className: "adm-total" },
                            React.createElement("div", { style: { flex: 1 } },
                                React.createElement("b", null, "Tak\u0131m fiyat\u0131"),
                                React.createElement("label", { className: "adm-mini" },
                                    React.createElement("input", { type: "checkbox", checked: p.autoCollect !== false, onChange: e => setPriceAutoCollect(c.id, it.id, e.target.checked) }),
                                    "Mod\u00FClleri otomatik topla")),
                            p.autoCollect === false
                                ? React.createElement("input", { className: "adm-input adm-num adm-w160", type: "text", inputMode: "numeric", "aria-label": "Tak\u0131m fiyat\u0131", value: (_a = p.manualTotal) !== null && _a !== void 0 ? _a : "", placeholder: "Tak\u0131m fiyat\u0131", onChange: e => updateItem(c.id, it.id, "price", { ...p, manualTotal: priceNumber(e.target.value) }) })
                                : React.createElement("span", { className: "adm-gold adm-big" }, admFmt(priceTotal(it.price)))))),
                React.createElement("div", { className: "adm-drawer-f" },
                    React.createElement("button", { type: "button", className: "adm-btn adm-danger-btn", onClick: () => { deleteItem(c.id, it.id); setAdmEdit(null); } },
                        React.createElement(AdmIcon, { name: "trash", size: 15 }),
                        "\u00DCr\u00FCn\u00FC sil"),
                    React.createElement("span", { style: { flex: 1 } }),
                    React.createElement("button", { type: "button", className: "adm-btn", onClick: close }, "Kapat"),
                    React.createElement("button", { type: "button", className: "adm-btn adm-btn-gold", disabled: saving, onClick: admSaveNow },
                        React.createElement(AdmIcon, { name: "save", size: 16 }),
                        saving ? "Kaydediliyor…" : "Kaydet ve yayınla"))));
    }
    function admRenderAddPicker() {
        if (!admAddPick)
            return null;
        return React.createElement("div", { className: "adm-modal-wrap", onClick: () => setAdmAddPick(false) },
            React.createElement("div", { className: "adm-modal", role: "dialog", "aria-modal": "true", "aria-label": "Kategori se\u00E7in", onClick: e => e.stopPropagation() },
                React.createElement("div", { className: "adm-card-h" },
                    React.createElement("h2", null, "Yeni \u00FCr\u00FCn hangi kategoriye?"),
                    React.createElement("button", { type: "button", className: "adm-iconbtn", "aria-label": "Kapat", onClick: () => setAdmAddPick(false) },
                        React.createElement(AdmIcon, { name: "x", size: 18 }))),
                React.createElement("div", { className: "adm-catgrid" }, categories.map(c => React.createElement("button", { type: "button", key: c.id, className: "adm-catbtn", onClick: () => admAddProduct(c.id) },
                    React.createElement("b", null, c.name),
                    React.createElement("span", null,
                        c.items.length,
                        " \u00FCr\u00FCn"))))));
    }
    /* ================= KATEGORİLER: ekle · yeniden adlandır · sürükleyerek sırala · sil ================= */
    function catAdd() {
        const id = "kat-" + uid();
        updateData(x => { x.categories = [...x.categories, { id, name: "Yeni Kategori", name_en: "", items: [], coverImage: null }]; });
        trPendingAdd("cat|" + id);
        showToast("Kategori eklendi. Adını yazın; İngilizcesi otomatik çevrilir.");
        setTimeout(() => {
            try {
                const el = document.querySelector('[data-adm-catname="' + id + '"]');
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    el.focus({ preventScroll: true });
                    el.select();
                }
            }
            catch (_) { }
        }, 120);
    }
    function catRename(id, value) {
        const v = String(value).slice(0, 120);
        updateData(x => { x.categories = x.categories.map(c => c.id === id ? { ...c, name: v, name_en: "" } : c); });
        if (catRenameTimer.current)
            clearTimeout(catRenameTimer.current);
        if (!v.trim()) {
            trPendingRemove(["cat|" + id]);
            return;
        }
        trPendingAdd("cat|" + id);
        /* Yazmayı bırakınca (0,8 sn) yalnızca bu kategori çevrilir. */
        catRenameTimer.current = setTimeout(() => {
            if (dataRef.current)
                autoTranslateMissing(dataRef.current).catch(() => { });
        }, 800);
    }
    function catMoveTo(fromId, toId) {
        if (fromId === toId)
            return;
        updateData(x => {
            const l = [...x.categories], i = l.findIndex(c => c.id === fromId), j = l.findIndex(c => c.id === toId);
            if (i < 0 || j < 0)
                return;
            const [m] = l.splice(i, 1);
            l.splice(j, 0, m);
            x.categories = l;
        });
    }
    function catStep(id, dir) {
        updateData(x => {
            const l = [...x.categories], i = l.findIndex(c => c.id === id), j = i + dir;
            if (i < 0 || j < 0 || j >= l.length)
                return;
            [l[i], l[j]] = [l[j], l[i]];
            x.categories = l;
        });
    }
    async function catDelete(id) {
        const c = categories.find(x => x.id === id);
        if (!c)
            return;
        if (categories.length <= 1) {
            showToast("Son kategori silinemez. Önce yeni bir kategori ekleyin.");
            return;
        }
        const n = c.items.length;
        const msg = n ? "\u201C" + c.name + "\u201D kategorisi ve içindeki " + n + " ürün silinecek.\n\nEmin misiniz?\n(Kaydet'e basmadan panelden çıkıp değişiklikleri atarsanız geri gelir.)" : "\u201C" + c.name + "\u201D kategorisi silinsin mi?";
        if (!(await askConfirm(msg, { title: "Kategoriyi sil", ok: "Sil", danger: true })))
            return;
        updateData(x => {
            x.categories = x.categories.filter(k => k.id !== id);
            if (x.pdf && x.pdf.categoryLayouts)
                delete x.pdf.categoryLayouts[id];
        });
        trPendingRemove(["cat|" + id]);
        if (admCat === id)
            setAdmCat("");
        setAdmSel(prev => { const nx = new Set([...prev].filter(k => !k.startsWith(id + "/"))); return nx; });
        showToast("Kategori silindi. Kalıcı olması için \u201CKaydet ve yayınla\u201D.");
    }
    function catDragStart(e, c) {
        if (e.button !== undefined && e.button !== 0)
            return;
        e.preventDefault();
        e.stopPropagation();
        let over = null, lastY = e.clientY, raf = 0;
        setAdmCatDrag({ from: c.id, over: null });
        const scroller = document.querySelector(".adm-content");
        const tick = () => {
            if (!scroller)
                return;
            const r = scroller.getBoundingClientRect();
            const edge = 80;
            if (lastY < r.top + edge)
                scroller.scrollTop -= Math.ceil((r.top + edge - lastY) / 6);
            else if (lastY > r.bottom - edge)
                scroller.scrollTop += Math.ceil((lastY - (r.bottom - edge)) / 6);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        const move = ev => {
            lastY = ev.clientY;
            const el = document.elementFromPoint(ev.clientX, ev.clientY);
            const t = el && el.closest ? el.closest("[data-adm-cat]") : null;
            const id = t ? t.getAttribute("data-adm-cat") : null;
            if (id !== over) {
                over = id;
                setAdmCatDrag({ from: c.id, over: id });
            }
            ev.preventDefault();
        };
        const end = () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", end);
            window.removeEventListener("pointercancel", end);
            setAdmCatDrag(null);
            if (!over || over === c.id)
                return;
            catMoveTo(c.id, over);
            showToast("Kategori sırası değişti. Kalıcı olması için \u201CKaydet ve yayınla\u201D.");
        };
        window.addEventListener("pointermove", move, { passive: false });
        window.addEventListener("pointerup", end);
        window.addEventListener("pointercancel", end);
    }
    function admRenderCategories() {
        const cls = id => !admCatDrag ? "" : (admCatDrag.from === id ? " is-dragging" : admCatDrag.over === id ? " is-drop" : "");
        return React.createElement("div", { className: "adm-page" },
            React.createElement("div", { className: "adm-eyebrow" }, "Kategoriler"),
            React.createElement("div", { className: "adm-row-between" },
                React.createElement("h1", { className: "adm-h1" }, "Kategorileri d\u00FCzenleyin"),
                React.createElement("button", { type: "button", className: "adm-btn adm-btn-gold", onClick: catAdd },
                    React.createElement(AdmIcon, { name: "plus", size: 16 }),
                    "Kategori ekle")),
            React.createElement("p", { className: "adm-muted adm-catnote" },
                "Sol taraftaki tutama\u00E7tan ",
                React.createElement("b", null, "s\u00FCr\u00FCkleyerek"),
                " s\u0131ray\u0131 de\u011Fi\u015Ftirin; ad\u0131 do\u011Frudan yazarak de\u011Fi\u015Ftirin. S\u0131ra ve adlar sitede, fiyat listesinde ve katalogda ayn\u0131 olur. \u0130ngilizce kar\u015F\u0131l\u0131klar otomatik \u00E7evrilir."),
            React.createElement("div", { className: "adm-catlist" }, categories.map((c, i) => {
                const last = categories.length <= 1;
                return React.createElement("div", { key: c.id, "data-adm-cat": c.id, className: "adm-catrow" + cls(c.id) },
                    React.createElement("button", { type: "button", className: "adm-grip", "aria-label": (c.name || "Kategori") + " sırasını sürükleyerek değiştir", title: "S\u00FCr\u00FCkleyerek s\u0131rala", onPointerDown: e => catDragStart(e, c), onKeyDown: e => {
                            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                                e.preventDefault();
                                catStep(c.id, e.key === "ArrowUp" ? -1 : 1);
                            }
                        } },
                        React.createElement(AdmIcon, { name: "grip", size: 16 })),
                    React.createElement("span", { className: "adm-catno" }, i + 1),
                    React.createElement("div", { className: "adm-catmain" },
                        React.createElement("input", { className: "adm-input adm-catname", "data-adm-catname": c.id, "aria-label": "Kategori adı " + (i + 1), value: c.name, maxLength: 120, onChange: e => catRename(c.id, e.target.value), placeholder: "Kategori ad\u0131" }),
                        React.createElement("small", { className: "adm-muted" },
                            c.name_en ? "EN: " + c.name_en : (c.name.trim() ? "İngilizcesi çevriliyor…" : ""),
                            " \u00B7 ",
                            c.items.length,
                            " \u00FCr\u00FCn")),
                    React.createElement("div", { className: "adm-catbtns" },
                        React.createElement("button", { type: "button", className: "adm-iconbtn adm-hide-sm", "aria-label": "Yukar\u0131 ta\u015F\u0131", disabled: i === 0, onClick: () => catStep(c.id, -1) },
                            React.createElement(AdmIcon, { name: "up", size: 16 })),
                        React.createElement("button", { type: "button", className: "adm-iconbtn adm-hide-sm", "aria-label": "A\u015Fa\u011F\u0131 ta\u015F\u0131", disabled: i === categories.length - 1, onClick: () => catStep(c.id, 1) },
                            React.createElement(AdmIcon, { name: "down", size: 16 })),
                        React.createElement("button", { type: "button", className: "adm-btn", onClick: () => { setAdmCat(c.id); admGo("urunler"); } }, "\u00DCr\u00FCnler"),
                        React.createElement("button", { type: "button", className: "adm-iconbtn adm-danger-btn", "aria-label": (c.name || "Kategori") + " kategorisini sil", disabled: last, onClick: () => catDelete(c.id) },
                            React.createElement(AdmIcon, { name: "trash", size: 16 }))));
            })),
            React.createElement("button", { type: "button", className: "adm-btn adm-btn-gold adm-catadd", onClick: catAdd },
                React.createElement(AdmIcon, { name: "plus", size: 16 }),
                "Kategori ekle"));
    }
    function admShell(legacy) {
        window.__ofAccent = theme.accent;
        const NAV = [["panel", "Genel Bakış", "grid"], ["urunler", "Ürünler", "box"], ["fiyat", "Fiyatlar & Kurlar", "tag"], ["katalog", "Kategoriler & Kapaklar", "list"], ["pdf", "PDF & Katalog", "file"], ["genel", "Görünüm & Ayarlar", "palette"]];
        const isNew = adminSection === "panel" || adminSection === "urunler" || adminSection === "katalog";
        return React.createElement("div", { className: "adm-shell", role: "dialog", "aria-modal": "true", "aria-label": "Y\u00F6netim Paneli", style: { accentColor: theme.accent, "--adm-accent": theme.accent, "--adm-ink": ink } },
            React.createElement("nav", { className: "adm-side", "aria-label": "Y\u00F6netim men\u00FCs\u00FC" },
                React.createElement("div", { className: "adm-brand" },
                    React.createElement("span", { className: "adm-logo" }, "o"),
                    React.createElement("span", null,
                        React.createElement("b", null, data.siteName || "ofischi"),
                        React.createElement("small", null, "Y\u00F6netim"))),
                NAV.map(([id, label, icon]) => React.createElement("button", { key: id, type: "button", className: "adm-nav" + (adminSection === id ? " is-on" : ""), "aria-current": adminSection === id ? "page" : undefined, onClick: () => admGo(id) },
                    React.createElement(AdmIcon, { name: icon, size: 18 }),
                    React.createElement("span", null, label),
                    id === "urunler" && React.createElement("small", null, admAll.length))),
                React.createElement("div", { className: "adm-side-spacer" }),
                React.createElement("div", { className: "adm-status" },
                    React.createElement("div", null,
                        React.createElement("span", { className: "adm-dot" + (admDirty ? " is-warn" : "") }),
                        admDirty ? "Kaydedilmemiş değişiklik var" : "Her şey kaydedildi",
                        trBusy > 0 ? " · İngilizce çeviri yapılıyor (" + trBusy + ")" : ""),
                    React.createElement("small", null, "De\u011Fi\u015Fiklikler \u201CKaydet ve yay\u0131nla\u201D ile bu cihaza kaydedilir."))),
            React.createElement("div", { className: "adm-main" },
                React.createElement("header", { className: "adm-top" },
                    React.createElement("label", { className: "adm-search adm-search-top" },
                        React.createElement(AdmIcon, { name: "search", size: 16 }),
                        React.createElement("input", { type: "search", "aria-label": "\u00DCr\u00FCn ara", placeholder: "\u00DCr\u00FCn ara\u2026", value: admQuery, onChange: e => {
                                setAdmQuery(safeText(e.target.value, SECURITY_LIMITS.search));
                                setAdmLimit(80);
                                if (adminSection !== "urunler")
                                    setAdminSection("urunler");
                            } })),
                    React.createElement("span", { className: "adm-top-spacer" }),
                    React.createElement("button", { type: "button", className: "adm-btn adm-hide-sm", onClick: () => requestCloseAdminPanel() },
                        React.createElement(AdmIcon, { name: "eye", size: 16 }),
                        "Siteye d\u00F6n"),
                    React.createElement("button", { type: "button", className: "adm-btn adm-btn-gold", disabled: saving, onClick: admSaveNow },
                        React.createElement(AdmIcon, { name: "save", size: 16 }),
                        saving ? "Kaydediliyor…" : React.createElement("span", null,
                            "Kaydet",
                            React.createElement("span", { className: "adm-hide-sm" }, " ve yay\u0131nla"))),
                    React.createElement("button", { type: "button", className: "adm-iconbtn adm-show-sm", "aria-label": "Paneli kapat", onClick: () => requestCloseAdminPanel() },
                        React.createElement(AdmIcon, { name: "x", size: 18 }))),
                React.createElement("div", { className: "adm-content" },
                    adminSection === "panel" && admRenderDashboard(),
                    adminSection === "urunler" && admRenderProducts(),
                    adminSection === "katalog" && admRenderCategories(),
                    React.createElement("div", { className: "adm-legacy" + (isNew ? " hidden" : "") }, legacy))),
            admRenderEditor(),
            admRenderAddPicker());
    }

    return React.createElement("div", { className: "luxury-bg", style: { minHeight: "100vh", backgroundColor: theme.bg, backgroundImage: cssUrl(theme.bgImage) ? `linear-gradient(${theme.bg}cc,${theme.bg}f5),${cssUrl(theme.bgImage)}` : undefined, backgroundSize: "cover", backgroundPosition: "center", color: theme.text, fontFamily: "Inter,system-ui,sans-serif" } },
        React.createElement("div", { "aria-hidden": "true", className: "fixed inset-x-0 top-0 z-30 pointer-events-none", style: { height: "calc(max(40px, env(safe-area-inset-top, 0px) + 32px) + 50px)", background: theme.bg, opacity: (pageScrolled || searchOpen) ? 1 : 0, transition: "opacity .2s ease" } }),
        React.createElement("div", { className: "fixed left-4 right-4 z-40", style: { top: "max(40px,calc(env(safe-area-inset-top, 0px) + 32px))" } },
            React.createElement("div", { className: "max-w-5xl mx-auto flex justify-end items-center gap-2" },
                React.createElement("button", { type: "button", "aria-label": language === "TR" ? "Switch to English" : "Türkçeye geç", onClick: () => switchLanguage(language === "TR" ? "EN" : "TR"), className: "h-11 px-3.5 rounded-full flex items-center justify-center gap-1.5 font-bold text-xs border", style: { background: theme.card, color: theme.text, borderColor: theme.text + "20" } },
                    React.createElement(Icon, { type: "globe", size: 14 }),
                    React.createElement("span", { style: { opacity: language === "TR" ? 1 : .72 } }, "TR"),
                    React.createElement("span", { "aria-hidden": "true", style: { opacity: .35 } }, "|"),
                    React.createElement("span", { style: { opacity: language === "EN" ? 1 : .72 } }, "EN")),
                React.createElement("div", { className: "relative" },
                    React.createElement("button", { type: "button", "aria-haspopup": "menu", "aria-expanded": currencyMenuOpen, "aria-label": (language === "EN" ? "Currency: " : "Para birimi: ") + currency.name, onClick: () => setCurrencyMenuOpen(p => !p), className: "h-11 min-w-[58px] px-3 rounded-full flex items-center justify-center gap-1.5 font-bold text-sm", style: { background: theme.accent, color: ink } },
                        currency.symbol,
                        React.createElement("span", { className: "hidden sm:inline" }, currency.name)),
                    currencyMenuOpen && React.createElement("div", { role: "menu", className: "absolute right-0 mt-2 w-36 rounded-2xl overflow-hidden shadow-2xl border", style: { background: theme.card, borderColor: theme.text + "18", zIndex: 1000 } },
                        React.createElement("div", { className: "px-3 py-2 text-[9px] uppercase tracking-widest font-bold opacity-40 border-b" }, t(language, "currency")),
                        CURRENCIES.map(c => React.createElement("button", { key: c.id, onClick: () => { chooseViewCurrency(c.id); setCurrencyMenuOpen(false); }, className: "w-full px-3 py-3 flex items-center justify-between text-sm font-semibold", style: { background: currency.id === c.id ? theme.accent + "18" : "transparent", color: theme.text } },
                            React.createElement("span", { className: "flex items-center gap-2" },
                                React.createElement("span", { className: "w-8 h-8 rounded-full flex items-center justify-center font-bold", style: { background: currency.id === c.id ? theme.accent : theme.accent + "18", color: currency.id === c.id ? ink : theme.accent } }, c.symbol),
                                React.createElement("span", null, c.name)),
                            currency.id === c.id && React.createElement(Icon, { type: "check", size: 15 }))))),
                React.createElement("button", { type: "button", "aria-label": searchOpen ? (language === "EN" ? "Close search" : "Aramayı kapat") : (language === "EN" ? "Search products" : "Ürün ara"), "aria-expanded": searchOpen, onClick: () => { if (searchOpen) {
                        setSearchOpen(false);
                        setSearch("");
                    }
                    else
                        setSearchOpen(true); }, className: "w-11 h-11 rounded-full flex items-center justify-center", style: { background: "rgba(0,0,0,.25)", backdropFilter: "blur(15px)", color: theme.text } },
                    React.createElement(Icon, { type: "search", size: 18 })))),
        searchOpen && React.createElement("div", { className: "fixed inset-x-0 z-40 px-4 pb-3 pt-1", style: { top: "calc(max(40px, env(safe-area-inset-top, 0px) + 32px) + 50px)", background: theme.bg, boxShadow: `0 14px 20px -12px ${theme.bg}` } },
            React.createElement("div", { className: "max-w-5xl mx-auto relative" },
                React.createElement(Icon, { type: "search", size: 16, className: "search-input-icon" }),
                React.createElement("input", { autoFocus: true, type: "search", "aria-label": t(language, "search"), value: search, onChange: e => setSearch(safeText(e.target.value, SECURITY_LIMITS.search)), onKeyDown: e => { if (e.key === "Escape") {
                        setSearchOpen(false);
                        setSearch("");
                    } }, placeholder: t(language, "search"), className: "search-input", style: { color: theme.text, background: theme.card + "f2" } }))),
        React.createElement("header", { className: "px-6 pt-28 pb-8 max-w-5xl mx-auto" },
            React.createElement("div", { onPointerDown: e => { if (e.pointerType === "mouse" && e.button !== 0)
                    return; e.preventDefault(); startLogoLongPress(e); }, onPointerUp: cancelLogoLongPress, onPointerCancel: cancelLogoLongPress, onPointerLeave: cancelLogoLongPress, onContextMenu: e => e.preventDefault(), title: "", style: { width: "100%", display: "flex", justifyContent: data.logo.position === "left" ? "flex-start" : data.logo.position === "right" ? "flex-end" : "center", marginBottom: 18, cursor: "pointer", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", touchAction: "manipulation" } }, data.logo.src && !logoFailed ? React.createElement(CachedImage, { loading: "eager", decoding: "async", src: data.logo.src, onError: () => setLogoFailed(true), alt: siteName || "Logo", draggable: "false", style: { width: data.logo.width || data.logo.size || 110, height: data.logo.height || data.logo.size || 110, maxWidth: "70vw", objectFit: "contain", display: "block", pointerEvents: "none" } }) : React.createElement("div", { "aria-hidden": "true", style: { width: 64, height: 64, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800, color: theme.accent, border: `1px solid ${theme.accent}55`, background: theme.accent + "14", pointerEvents: "none" } }, (siteName || "O").trim().charAt(0).toLocaleUpperCase("tr-TR"))),
            React.createElement("div", { className: "text-center" },
                React.createElement("div", { className: "text-[10px] font-bold tracking-[.28em] mb-2", style: { color: theme.accent } }, eyebrow),
                React.createElement("h1", { className: "text-3xl font-bold leading-tight" }, siteName),
                React.createElement("p", { className: "text-sm opacity-80 mt-2" }, subtitle),
                React.createElement("div", { className: "mt-4 flex flex-wrap items-center justify-center gap-2" },
                    data.phone && React.createElement("a", { href: "tel:" + data.phone.replace(/\s/g, ""), className: "inline-flex items-center gap-2 px-5 min-h-[44px] rounded-full text-sm font-semibold", style: { background: theme.accent, color: ink } },
                        React.createElement(Icon, { type: "phone", size: 15 }),
                        data.phone),
                    [["catalog", language === "EN" ? "Catalog" : "Katalog", language === "EN" ? "Download the product catalog without prices (PDF)" : "Fiyatsız ürün kataloğunu indir (PDF)"], ["price", language === "EN" ? "Price List" : "Fiyat Listesi", language === "EN" ? "Download the price list (PDF)" : "Fiyat listesini indir (PDF)"]].map(([kind, label, aria]) => React.createElement("button", { key: kind, type: "button", "aria-label": aria, onClick: () => createPDF(false, kind), disabled: !!pdfBusy, className: "inline-flex items-center gap-2 px-5 min-h-[44px] rounded-full text-sm font-semibold border disabled:opacity-60", style: { borderColor: theme.accent + "80", color: theme.text, background: theme.card + "99" } },
                        React.createElement(Icon, { type: "download", size: 15 }),
                        pdfBusy === kind ? (language === "EN" ? "Preparing…" : "Hazırlanıyor…") : label,
                        React.createElement("span", { className: "text-[10px] font-bold opacity-80" }, "PDF")))))),
        React.createElement("div", { className: "max-w-5xl mx-auto px-4 mb-2" },
            React.createElement("div", { className: "flex items-center justify-between gap-3" },
                React.createElement("div", { className: "min-w-0" },
                    React.createElement("h2", { className: "text-xl font-bold truncate" }, q ? (language === "EN" ? "Search results" : "Arama sonuçları") : (activeCategory ? categoryDisplay(activeCategory) : t(language, "premium"))),
                    React.createElement("div", { className: "text-xs opacity-80 mt-1", "aria-live": "polite" }, q ? (language === "EN" ? `${visibleProducts.length} ${visibleProducts.length === 1 ? "product" : "products"} found for “${search.trim()}”` : `“${search.trim()}” için ${visibleProducts.length} ürün bulundu`) : `${visibleProducts.length} ${t(language, "products")}`)),
                q && React.createElement("button", { type: "button", onClick: () => setSearch(""), className: "text-xs opacity-70 underline underline-offset-4 min-h-[44px] px-2 shrink-0" }, t(language, "clearSearch")))),
        !q && React.createElement("div", { ref: categoryBarRef, className: "sticky z-20 px-4 pt-2 pb-2 category-bar" + (barStuck ? " is-stuck" : ""), style: { top: "calc(max(40px, env(safe-area-inset-top, 0px) + 32px) + 50px)", "--catbar-bg": theme.bg } },
            React.createElement("div", { className: "max-w-5xl mx-auto category-scroll", ref: el => {
                    /* Fare tekerleği şeridi yatay kaydırır. React'in tekerlek dinleyicisi "passive" olduğu için
                       preventDefault çalışmıyordu (konsol hatası + sayfa da kayıyordu); yerel, pasif olmayan dinleyici kullanılır. */
                    if (!el || el.__wheelBound)
                        return;
                    el.__wheelBound = true;
                    el.addEventListener("wheel", e => { if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                        e.preventDefault();
                        el.scrollLeft += e.deltaY;
                    } }, { passive: false });
                }, onMouseDown: e => { const el = e.currentTarget; el.dataset.dragging = "1"; el.dataset.dragStartX = String(e.clientX); el.dataset.dragStartScroll = String(el.scrollLeft); }, onMouseMove: e => { const el = e.currentTarget; if (el.dataset.dragging === "1") {
                    el.scrollLeft = Number(el.dataset.dragStartScroll) - (e.clientX - Number(el.dataset.dragStartX));
                } }, onMouseUp: e => { e.currentTarget.dataset.dragging = "0"; }, onMouseLeave: e => { e.currentTarget.dataset.dragging = "0"; } }, publicCategories.map((category, index) => { const active = category.id === activeCat; return React.createElement("button", { type: "button", key: category.id, "aria-pressed": active, onClick: e => goToCategory(category.id, e.currentTarget), className: "category-chip " + (active ? "active" : ""), style: { background: active ? `linear-gradient(135deg,${theme.accent},${theme.accent}dd)` : `${theme.accent}14`, color: active ? ink : theme.text, borderColor: active ? theme.accent + "70" : theme.text + "12", opacity: active ? 1 : .78, boxShadow: active ? `0 6px 18px ${theme.accent}30` : "none", animation: `categoryEnter .4s cubic-bezier(.22,1,.36,1) ${index * 45}ms both` } }, categoryDisplay(category)); }))),
        React.createElement("div", { ref: productsTopRef, "aria-hidden": "true", style: { height: 0 } }),
        React.createElement("main", { key: q ? `search-${q}` : activeCat, className: "product-grid px-4 pt-4 pb-28 max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 gap-3" },
            visibleProducts.length === 0 && React.createElement("div", { className: "col-span-full text-center py-16 opacity-60" }, q ? t(language, "notFound") : t(language, "empty")),
            visibleProducts.map((item, index) => React.createElement("article", { key: item.id, role: "button", tabIndex: 0, "aria-label": productDisplay(item), onClick: () => { setSelectedProduct(item); setDetailGalleryIndex(0); }, onKeyDown: e => { if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedProduct(item);
                    setDetailGalleryIndex(0);
                } }, className: "product-card rounded-2xl overflow-hidden cursor-pointer", style: { background: theme.card, boxShadow: "0 5px 18px rgba(0,0,0,.14)", animationDelay: `${Math.min(index, 8) * 45}ms` } },
                React.createElement("div", { className: "product-image", style: { height: data.cardImgSize, backgroundColor: theme.accent + "12", display: "block", position: "relative" } }, (() => { const g = Array.isArray(item.images) && item.images.length ? item.images : (item.image ? [item.image] : []); const idx = (galleryIndex[item.id] || 0) % Math.max(g.length, 1); if (!g.length)
                    return React.createElement("div", { style: { height: "100%", display: "flex", alignItems: "center", justifyContent: "center" } },
                        React.createElement(Icon, { type: "image", size: 28 })); return React.createElement("div", { className: "product-gallery-frame", onPointerDown: e => { if (g.length < 2)
                        return; e.currentTarget.setPointerCapture?.(e.pointerId); e.currentTarget.dataset.sx = String(e.clientX); e.currentTarget.dataset.sy = String(e.clientY); }, onPointerUp: e => { if (g.length < 2)
                        return; const el = e.currentTarget, sx = Number(el.dataset.sx || 0), sy = Number(el.dataset.sy || 0), dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) {
                        el.dataset.swiped = "1";
                        setGalleryIndex(p => ({ ...p, [item.id]: (idx + (dx < 0 ? 1 : -1) + g.length) % g.length }));
                    } }, onClick: e => { if (e.currentTarget.dataset.swiped === "1") {
                        e.stopPropagation();
                        delete e.currentTarget.dataset.swiped;
                    } }, style: { touchAction: "pan-y" } },
                    React.createElement(CachedImage, { key: `${item.id}-${idx}`, className: "product-gallery-img", src: g[idx], alt: productDisplay(item), loading: "lazy", decoding: "async", fetchpriority: "low", draggable: "false" }),
                    g.length > 1 && React.createElement("div", { className: "gallery-dots" }, g.slice(0, 7).map((_, i) => React.createElement("span", { key: i, className: 'gallery-dot ' + (i === idx ? 'active' : '') })))); })()),
                React.createElement("div", { className: "p-3 flex flex-col" },
                    q && React.createElement("div", { className: "text-[9px] uppercase tracking-wider font-bold mb-1 truncate", style: { color: theme.accent } }, getText(language, item.categoryName, item.categoryName_en, item.categoryName)),
                    React.createElement("div", { className: "font-semibold text-sm leading-tight line-clamp-3" }, productDisplay(item)),
                    productDims(item) && React.createElement("div", { className: "text-[11px] opacity-70 mt-1 tabular-nums" }, productDims(item)),
                    productDesc(item) && React.createElement("div", { className: "text-xs opacity-65 mt-1 leading-snug line-clamp-2" }, productDesc(item)),
                    cardPrice(item) !== null ? React.createElement("div", { className: "mt-3 pt-3 border-t", style: { borderColor: theme.text + "14" } },
                        React.createElement("div", { className: "flex items-center justify-between flex-wrap", style: { columnGap: 8, rowGap: 2 } },
                            React.createElement("span", { className: "text-[10px] uppercase tracking-wider font-bold opacity-75 whitespace-nowrap" }, cardPriceLabel(item)),
                            React.createElement("span", { className: "text-[13px] font-bold whitespace-nowrap tabular-nums", style: { color: theme.accent } }, formatAmount(cardPrice(item)))),
                        React.createElement("div", { className: "mt-1 text-[11px] opacity-75 flex items-center gap-1" },
                            cardPriceSub(item),
                            React.createElement(Icon, { type: "arrow", size: 11 }))) : React.createElement("div", { className: "mt-3 pt-3 border-t text-[11px] font-semibold", style: { borderColor: theme.text + "14", color: theme.accent } }, t(language, "contactPrice")))))),
        selectedProduct && React.createElement("div", { className: "fixed inset-0 z-[100] modal-backdrop flex items-end sm:items-center justify-center p-0 sm:p-5", onClick: () => setSelectedProduct(null) },
            React.createElement("div", { role: "dialog", "aria-modal": "true", "aria-label": productDisplay(selectedProduct), className: "relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl", style: { background: theme.card, color: theme.text, animation: "pop .22s ease" }, onClick: e => e.stopPropagation() },
                React.createElement("div", { className: "sticky top-0 z-10 h-0 flex justify-end" },
                    React.createElement("button", { type: "button", autoFocus: true, "aria-label": language === "EN" ? "Close" : "Kapat", onClick: () => setSelectedProduct(null), className: "mt-4 mr-4 w-11 h-11 rounded-full flex items-center justify-center shadow-lg", style: { background: "rgba(0,0,0,.6)", color: "#fff", backdropFilter: "blur(8px)" } },
                        React.createElement(Icon, { type: "x", size: 20 }))),
                React.createElement("div", { className: "relative" },
                    React.createElement("div", { className: "detail-gallery", onPointerDown: e => { e.currentTarget.setPointerCapture?.(e.pointerId); e.currentTarget.dataset.sx = String(e.clientX); e.currentTarget.dataset.sy = String(e.clientY); e.currentTarget.dataset.moved = "0"; }, onPointerMove: e => { const sx = Number(e.currentTarget.dataset.sx || e.clientX), sy = Number(e.currentTarget.dataset.sy || e.clientY); if (Math.hypot(e.clientX - sx, e.clientY - sy) > 10)
                            e.currentTarget.dataset.moved = "1"; }, onPointerUp: e => { const sx = Number(e.currentTarget.dataset.sx || e.clientX), sy = Number(e.currentTarget.dataset.sy || e.clientY), dx = e.clientX - sx, dy = e.clientY - sy, g = Array.isArray(selectedProduct.images) && selectedProduct.images.length ? selectedProduct.images : (selectedProduct.image ? [selectedProduct.image] : []); if (g.length > 1 && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
                            setDetailGalleryIndex(v => (v + (dx < 0 ? 1 : -1) + g.length) % g.length);
                        }
                        else if (e.currentTarget.dataset.moved !== "1" && g.length) {
                            setFullScreenImage({ images: g, index: (detailGalleryIndex || 0) % g.length });
                            setLightboxZoom(1);
                        } }, style: { backgroundColor: theme.accent + "12", touchAction: "pan-y" } }, (() => { const g = Array.isArray(selectedProduct.images) && selectedProduct.images.length ? selectedProduct.images : (selectedProduct.image ? [selectedProduct.image] : []); const idx = (detailGalleryIndex || 0) % Math.max(g.length, 1); return g.length ? React.createElement(CachedImage, { key: `detail-${selectedProduct.id}-${idx}`, loading: "lazy", src: g[idx], alt: productDisplay(selectedProduct), className: "detail-gallery-img", decoding: "async", draggable: "false" }) : React.createElement("div", { style: { height: "100%", display: "flex", alignItems: "center", justifyContent: "center" } },
                        React.createElement(Icon, { type: "image", size: 40 })); })()),
                    (() => { const g = Array.isArray(selectedProduct.images) && selectedProduct.images.length ? selectedProduct.images : (selectedProduct.image ? [selectedProduct.image] : []); return g.length > 1 && React.createElement("div", { className: "detail-gallery-dots" }, g.map((_, i) => React.createElement("span", { key: i, className: 'detail-gallery-dot ' + (i === detailGalleryIndex ? 'active' : '') }))); })()),
                React.createElement("div", { className: "p-5" },
                    React.createElement("div", { className: "text-[11px] uppercase tracking-widest font-bold mb-2", style: { color: theme.accent } }, productCategoryName(selectedProduct) || t(language, "premium")),
                    React.createElement("h2", { className: "text-2xl font-bold" }, productDisplay(selectedProduct)),
                    productDims(selectedProduct) && React.createElement("div", { className: "text-sm mt-2" },
                        React.createElement("span", { className: "text-[11px] uppercase tracking-wide opacity-80" },
                            t(language, "dimensions"),
                            ":"),
                        " ",
                        React.createElement("span", { className: "font-medium tabular-nums" }, productDims(selectedProduct))),
                    productDesc(selectedProduct) && React.createElement("p", { className: "text-sm opacity-75 mt-2 leading-relaxed" }, productDesc(selectedProduct)),
                    React.createElement("div", { className: "mt-5" },
                        React.createElement("div", { className: "text-[11px] uppercase tracking-widest font-bold opacity-60 mb-3" }, t(language, "prices")),
                        normalizePrice(selectedProduct.price).parts.length > 0 ? React.createElement("div", { className: "space-y-2" }, normalizePrice(selectedProduct.price).parts.map(part => React.createElement("div", { key: part.id, className: "price-row rounded-xl p-3 flex items-center justify-between gap-3" },
                            layoutOfItem(selectedProduct) === "models" && part.image && React.createElement("button", { type: "button", "aria-label": (partDisplay(part) || "") + (language === "EN" ? " photo" : " fotoğrafı"), onClick: () => { setFullScreenImage({ images: [part.image], index: 0 }); setLightboxZoom(1); }, className: "shrink-0 w-14 h-14 rounded-lg overflow-hidden", style: { background: "#f4f2ee" } },
                                React.createElement(CachedImage, { src: part.image, alt: "", className: "w-full h-full object-contain", loading: "lazy", decoding: "async" })),
                            React.createElement("div", { className: "text-sm font-medium flex-1 min-w-0" },
                                React.createElement("div", null, partDisplay(part)),
                                partDimensionDisplay(part) && React.createElement("div", { className: "text-[11px] opacity-80 mt-1" },
                                    React.createElement("span", { className: "uppercase tracking-wide opacity-90" },
                                        t(language, "dimensions"),
                                        ":"),
                                    " ",
                                    partDimensionDisplay(part))),
                            React.createElement("div", { className: "text-sm font-bold whitespace-nowrap", style: { color: theme.accent } }, priceText(part))))) : React.createElement("div", { className: "rounded-xl p-4 text-center", style: { background: theme.accent + "12", color: theme.accent } }, t(language, "contactPrice")),
                        !isVariantLayout(layoutOfItem(selectedProduct)) && priceTotal(selectedProduct.price) !== null && React.createElement("div", { className: "mt-3 rounded-xl p-4 flex items-center justify-between", style: { background: theme.accent + "12", border: "1px solid " + theme.accent + "28" } },
                            React.createElement("span", { className: "text-[11px] uppercase tracking-widest font-bold opacity-65" }, t(language, "total")),
                            React.createElement("span", { className: "text-base font-bold", style: { color: theme.accent } }, productMainPrice(selectedProduct))),
                        !isVariantLayout(layoutOfItem(selectedProduct)) && priceTotal(selectedProduct.price) !== null && hasContactParts(selectedProduct) && React.createElement("div", { className: "text-[11px] opacity-65 mt-2" }, language === "EN" ? "* Total excludes items marked “contact for price”." : "* Toplama, fiyatı sorulacak kalemler dahil değildir.")),
                    data.phone && React.createElement("a", { href: "tel:" + data.phone.replace(/\s/g, ""), className: "mt-5 w-full py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm", style: { background: theme.accent, color: ink } },
                        React.createElement(Icon, { type: "phone", size: 16 }),
                        t(language, "call"))))),
        pdfPreview && React.createElement(PdfPreviewModal, { preview: pdfPreview, language: language, onClose: closePdfPreview, onDownload: downloadPreviewPdf }),
        toast && React.createElement("div", { role: "status", "aria-live": "polite", style: panelOpen ? { top: 80, bottom: "auto", zIndex: 260 } : { bottom: 24 }, className: "fixed left-1/2 -translate-x-1/2 max-w-[calc(100vw-32px)] z-[250] bg-neutral-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-sm flex items-center gap-2" },
            React.createElement(Icon, { type: "check", size: 15 }),
            toast),
        React.createElement(ProductImageLightbox, { fullScreenImage: fullScreenImage, setFullScreenImage: setFullScreenImage, onClose: () => { setFullScreenImage(null); setLightboxZoom(1); } }),
        pinModal && React.createElement("div", { className: "fixed inset-0 z-[200] bg-black/75 flex items-center justify-center p-4" },
            React.createElement("div", { className: "w-full max-w-xs bg-neutral-950 border border-neutral-800 rounded-2xl p-6" },
                React.createElement("div", { className: "flex items-center gap-2 mb-4 text-white" },
                    React.createElement(Icon, { type: "lock", size: 18 }),
                    React.createElement("h2", { className: "font-bold" }, t("TR", "admin"))),
                React.createElement("input", { autoFocus: true, type: "password", inputMode: "numeric", maxLength: "8", value: pinInput, onChange: e => { setPinInput(e.target.value.replace(/\D/g, "")); setPinError(false); }, onKeyDown: e => e.key === "Enter" && tryUnlock(), placeholder: "PIN", className: "admin-input tracking-[.3em]" }),
                pinError && React.createElement("div", { className: "text-xs text-red-400 mt-2" }, t("TR", "wrongPin")),
                React.createElement("div", { className: "text-[11px] text-neutral-500 mt-2 mb-4" }, hasAdminPin() ? "Yönetim PIN'inizi girin." : "İlk kurulum: bu cihaz için 4-8 haneli yeni bir PIN belirleyin."),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement("button", { onClick: () => setPinModal(false), className: "flex-1 py-2.5 bg-neutral-800 rounded-lg text-sm text-neutral-300" }, t("TR", "cancel")),
                    React.createElement("button", { onClick: tryUnlock, className: "flex-1 py-2.5 rounded-lg text-sm font-bold", style: { background: theme.accent, color: ink } }, hasAdminPin() ? t("TR", "login") : "PIN Oluştur")))),
        panelOpen && unlocked && admShell(
                React.createElement("div", { className: "p-5" },
                    React.createElement("div", { className: adminSection === "genel" ? "" : "hidden" },
                        React.createElement("label", { className: "block mb-4" },
                            React.createElement(AdminLabel, null, "Site Ad\u0131"),
                            React.createElement("input", { className: "admin-input", value: data.siteName ?? "", onChange: e => editGeneralTurkishField("siteName", e.target.value) })),
                        React.createElement("label", { className: "block mb-4" },
                            React.createElement(AdminLabel, null, "Alt Ba\u015Fl\u0131k"),
                            React.createElement("input", { className: "admin-input", value: data.subtitle ?? "", onChange: e => editGeneralTurkishField("subtitle", e.target.value), placeholder: "Ofis Mobilyalar\u0131" })),
                        React.createElement("label", { className: "block mb-4" },
                            React.createElement(AdminLabel, null, "\u00DCst Etiket"),
                            React.createElement("input", { className: "admin-input", value: data.eyebrow ?? "", onChange: e => editGeneralTurkishField("eyebrow", e.target.value) })),
                        React.createElement("label", { className: "block mb-5" },
                            React.createElement(AdminLabel, null, t("TR", "phone")),
                            React.createElement("input", { className: "admin-input", value: data.phone || "", onChange: e => setPath(["phone"], e.target.value), placeholder: "+90 5xx xxx xx xx" })),
                        React.createElement("div", { className: "h-px bg-neutral-800 my-5" }),
                        React.createElement("div", { className: "text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-3" }, "Premium Logo"),
                        React.createElement("div", { className: "bg-neutral-900 rounded-xl p-4 mb-5" },
                            React.createElement("div", { className: "rounded-xl bg-neutral-800 min-h-[120px] flex items-center justify-center mb-3 overflow-hidden" }, data.logo.src && !logoFailed ? React.createElement(CachedImage, { loading: "lazy", decoding: "async", src: data.logo.src, onError: () => setLogoFailed(true), alt: "Logo \u00F6nizleme", style: { width: Math.min(data.logo.width || 110, 260), height: Math.min(data.logo.height || 110, 140), maxWidth: "90%", objectFit: "contain" } }) : React.createElement("div", { className: "text-xs text-neutral-400 text-center px-4" }, data.logo.src ? "Logo dosyası bulunamadı. Yeni bir logo yükleyin." : "Logo eklenmedi")),
                            React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-3" },
                                React.createElement("button", { onClick: () => document.getElementById("local-logo-input")?.click(), className: "py-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs font-bold flex items-center justify-center gap-2" },
                                    React.createElement(Icon, { type: "upload", size: 14 }),
                                    "Logo Ekle / De\u011Fi\u015Ftir"),
                                React.createElement("button", { disabled: !data.logo.src, onClick: removeLogo, className: "py-2.5 rounded-lg bg-red-950 text-red-400 text-xs font-bold disabled:opacity-30" }, "Logo Sil")),
                            React.createElement("input", { id: "local-logo-input", type: "file", accept: "image/png,image/jpeg,image/webp,image/svg+xml", className: "hidden", onChange: uploadLogoLocal }),
                            React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                                React.createElement("label", null,
                                    React.createElement(AdminLabel, null,
                                        "Logo Geni\u015Fli\u011Fi \u2014 ",
                                        data.logo.width || 110,
                                        "px"),
                                    React.createElement("input", { type: "range", min: "40", max: "360", value: data.logo.width || 110, onChange: e => setPath(["logo", "width"], Number(e.target.value)), className: "w-full" })),
                                React.createElement("label", null,
                                    React.createElement(AdminLabel, null,
                                        "Logo Y\u00FCksekli\u011Fi \u2014 ",
                                        data.logo.height || 110,
                                        "px"),
                                    React.createElement("input", { type: "range", min: "40", max: "220", value: data.logo.height || 110, onChange: e => setPath(["logo", "height"], Number(e.target.value)), className: "w-full" }))),
                            React.createElement("div", { className: "mt-4" },
                                React.createElement(AdminLabel, null, "Logo Konumu"),
                                React.createElement("div", { className: "grid grid-cols-3 gap-2" }, [["left", "Sol"], ["center", "Orta"], ["right", "Sağ"]].map(([v, l]) => React.createElement("button", { key: v, onClick: () => setPath(["logo", "position"], v), className: "py-2 rounded-lg text-xs font-semibold", style: { background: data.logo.position === v ? theme.accent : "#1c1c1c", color: "#fff" } }, l))))),
                        React.createElement("div", { className: "bg-neutral-900 rounded-xl p-4 mb-5" },
                            React.createElement("div", { className: "text-[10px] uppercase tracking-widest font-bold text-amber-500 mb-3" }, "Katalog Yedekleme"),
                            React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                                React.createElement("button", { type: "button", onClick: () => downloadJSON(data), className: "min-h-[44px] py-2.5 rounded-lg text-xs font-bold bg-neutral-800 flex items-center justify-center gap-2" },
                                    React.createElement(Icon, { type: "download", size: 14 }),
                                    "Yede\u011Fi \u0130ndir (JSON)"),
                                React.createElement("button", { type: "button", onClick: () => importRef?.click(), className: "min-h-[44px] py-2.5 rounded-lg text-xs font-bold bg-neutral-800 flex items-center justify-center gap-2" },
                                    React.createElement(Icon, { type: "upload", size: 14 }),
                                    "Yedekten Y\u00FCkle")),
                            React.createElement("input", { ref: setImportRef, type: "file", accept: "application/json,.json", className: "hidden", onChange: handleImport })),
                        React.createElement("div", { className: "h-px bg-neutral-800 my-5" }),
                        React.createElement("div", { className: "text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-3" }, "Haz\u0131r Temalar"),
                        React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-5" }, THEMES.map(tt => React.createElement("button", { key: tt.id, onClick: () => updateData(x => { x.theme = { ...x.theme, id: tt.id, name: tt.name, bg: tt.bg, card: tt.card, accent: tt.accent, text: tt.text }; }), "aria-pressed": theme.bg === tt.bg && theme.accent === tt.accent, "aria-label": "Tema: " + tt.name, className: "rounded-xl overflow-hidden border-2", style: { borderColor: theme.bg === tt.bg && theme.accent === tt.accent ? tt.accent : "#292524" } },
                            React.createElement("div", { style: { height: 35, background: tt.bg, display: "flex", alignItems: "center", justifyContent: "center" } },
                                React.createElement("span", { style: { width: 15, height: 15, borderRadius: "50%", background: tt.accent } })),
                            React.createElement("div", { className: "bg-neutral-900 py-1 text-[9px]" }, tt.name)))),
                        React.createElement(ColorInput, { label: "Arka Plan Rengi", value: theme.bg, onChange: v => setPath(["theme", "bg"], v) }),
                        React.createElement(ColorInput, { label: "Kart Rengi", value: theme.card, onChange: v => setPath(["theme", "card"], v) }),
                        React.createElement(ColorInput, { label: "Vurgu Rengi", value: theme.accent, onChange: v => setPath(["theme", "accent"], v) }),
                        React.createElement(ColorInput, { label: "Yaz\u0131 Rengi", value: theme.text, onChange: v => setPath(["theme", "text"], v) }),
                        React.createElement(AdminLabel, null,
                            "\u00DCr\u00FCn G\u00F6rsel Y\u00FCksekli\u011Fi \u2014 ",
                            data.cardImgSize,
                            "px"),
                        React.createElement("input", { type: "range", min: "100", max: "320", value: data.cardImgSize, onChange: e => setPath(["cardImgSize"], Number(e.target.value)), className: "w-full mb-5" }),
                        React.createElement(AdminLabel, null, "Y\u00F6netim PIN'ini De\u011Fi\u015Ftir"),
                        React.createElement("div", { className: "flex gap-2 mb-5" },
                            React.createElement("input", { className: "admin-input flex-1", type: "password", value: newPinInput, placeholder: "Yeni PIN (4-8 hane)", inputMode: "numeric", maxLength: "8", autoComplete: "new-password", onChange: e => setNewPinInput(e.target.value.replace(/\D/g, "")), style: { letterSpacing: ".3em" } }),
                            React.createElement("button", { type: "button", onClick: changePin, className: "px-4 rounded-lg text-sm font-bold shrink-0", style: { background: theme.accent, color: ink } }, "G\u00FCncelle")),
                        React.createElement("button", { onClick: resetDefault, className: "w-full py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-red-400" }, "Varsay\u0131lan Ayarlara D\u00F6n")),
                    React.createElement("div", { className: adminSection === "fiyat" ? "" : "hidden" },
                        React.createElement("div", { className: "text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-3" }, t("TR", "currency")),
                        React.createElement("div", { className: "bg-neutral-900 rounded-xl p-4 mb-5" },
                            React.createElement("div", { className: "text-xs text-neutral-400 mb-3" }, "Fiyatlar TL olarak girilir. Kur de\u011Ferleri manuel belirlenir."),
                            React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-4" }, CURRENCIES.map(c => React.createElement("button", { key: c.id, onClick: () => setPath(["currency", "selected"], c.id), className: "py-2.5 rounded-lg text-xs font-bold", style: { background: currency.id === c.id ? theme.accent : "#171717", color: currency.id === c.id ? "#fff" : "#999", border: "1px solid " + (currency.id === c.id ? theme.accent : "#333") } },
                                c.symbol,
                                " ",
                                c.name))),
                            React.createElement("label", { className: "block mb-3" },
                                React.createElement(AdminLabel, null, "1 USD = Ka\u00E7 TL?"),
                                React.createElement(RateInput, { value: data.currency.usdRate, label: "USD kuru", onCommit: n => setPath(["currency", "usdRate"], n) })),
                            React.createElement("label", { className: "block" },
                                React.createElement(AdminLabel, null, "1 EUR = Ka\u00E7 TL?"),
                                React.createElement(RateInput, { value: data.currency.eurRate, label: "EUR kuru", onCommit: n => setPath(["currency", "eurRate"], n) })))),
                    React.createElement("div", { className: adminSection === "katalog" ? "" : "hidden" },
                        React.createElement("div", { id: "catalog-tab" },
                            React.createElement("div", { className: "mb-4 rounded-xl p-3", style: { background: theme.accent + "12", border: "1px solid " + theme.accent + "25" } },
                                React.createElement("div", { className: "text-[10px] uppercase tracking-widest opacity-50 mb-2" }, "\u00DCr\u00FCn Ara ve D\u00FCzenle"),
                                React.createElement("div", { className: "relative" },
                                    React.createElement("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none flex" },
                                        React.createElement(Icon, { type: "search", size: 15 })),
                                    React.createElement("input", { type: "search", "aria-label": "\u00DCr\u00FCn ara", value: adminSearch, onChange: e => { const v = safeText(e.target.value, SECURITY_LIMITS.search); setAdminSearch(v); if (v.trim()) {
                                            const next = { ...openCategories };
                                            categories.forEach(c => { if (c.items.some(i => (i.name || "").toLocaleLowerCase("tr-TR").includes(v.trim().toLocaleLowerCase("tr-TR"))))
                                                next[c.id] = true; });
                                            setOpenCategories(next);
                                        } }, placeholder: "\u00DCr\u00FCn ad\u0131n\u0131 yaz\u0131n...", className: "admin-input", style: { padding: "10px 10px 10px 34px", fontSize: "12px" } })),
                                adminSearch.trim() && React.createElement("div", { className: "text-[10px] opacity-50 mt-2" },
                                    categories.reduce((n, c) => n + c.items.filter(i => (i.name || "").toLocaleLowerCase("tr-TR").includes(adminSearch.trim().toLocaleLowerCase("tr-TR"))).length, 0),
                                    " \u00FCr\u00FCn bulundu")),
                            React.createElement("div", { className: "text-[11px] text-neutral-400 mb-3" }, "Kategoriler sabittir; s\u0131ras\u0131 ve adlar\u0131 sitede, fiyat listesinde ve katalogda ayn\u0131d\u0131r. \u00DCr\u00FCn eklemek i\u00E7in kategorinin \"\u00DCr\u00FCnler\" d\u00FC\u011Fmesine dokunun."),
                            categories.map((category, categoryIndex) => React.createElement("div", { key: category.id, className: "bg-neutral-900 border border-neutral-800 rounded-xl mb-3 overflow-hidden" },
                                React.createElement("div", { className: "p-2 flex items-center gap-1.5" },
                                    React.createElement("div", { className: "flex-1 min-w-0 px-2" },
                                        React.createElement("div", { className: "text-[13px] font-bold truncate" }, category.name),
                                        React.createElement("div", { className: "text-[11px] text-neutral-500" },
                                            category.items.length,
                                            " \u00FCr\u00FCn")),
                                    React.createElement("button", { type: "button", "aria-expanded": !!openCategories[category.id], onClick: () => toggleCategory(category.id), className: "h-10 shrink-0 px-3 rounded-lg text-[11px] whitespace-nowrap flex items-center gap-1.5 font-semibold", style: { background: openCategories[category.id] ? theme.accent : "#262626", color: openCategories[category.id] ? ink : "#aaa" } },
                                        t("TR", "productsBtn"),
                                        React.createElement(Icon, { type: openCategories[category.id] ? "up" : "down", size: 13 }))),
                                openCategories[category.id] && React.createElement("div", { className: "p-2 pt-0" },
                                    category.items.length > 3 && React.createElement("button", { type: "button", onClick: () => addItem(category.id), className: "w-full mb-2 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5", style: { background: theme.accent, color: ink } },
                                        React.createElement(Icon, { type: "plus", size: 14 }),
                                        "Ürün Ekle (listenin sonuna)"),
                                    category.items.length === 0 && React.createElement("div", { className: "bg-neutral-800 rounded-xl p-4 mb-2 text-center text-xs text-neutral-500" }, "Bu kategoride hen\u00FCz \u00FCr\u00FCn yok."),
                                    category.items.filter(item => !adminSearch.trim() || (item.name || "").toLocaleLowerCase("tr-TR").includes(adminSearch.trim().toLocaleLowerCase("tr-TR"))).map((item, itemIndex) => React.createElement("div", { key: item.id, className: "bg-neutral-800 rounded-xl p-3 mb-2" },
                                        React.createElement("div", { className: "flex flex-wrap sm:flex-nowrap gap-2 mb-2" },
                                            React.createElement("div", { className: "w-16 h-16 rounded-lg bg-neutral-700 flex-shrink-0 overflow-hidden flex items-center justify-center", style: { backgroundImage: cssUrl(item.image) || undefined, backgroundSize: "cover", backgroundPosition: "center" } }, !item.image && React.createElement(Icon, { type: "image", size: 18 })),
                                            React.createElement("div", { className: "flex flex-col gap-1 flex-shrink-0" },
                                                React.createElement("button", { type: "button", onClick: () => document.getElementById("product-image-" + category.id + "-" + item.id)?.click(), className: "min-h-[36px] px-2.5 py-1.5 rounded-lg bg-neutral-700 border border-neutral-600 text-[11px] font-bold flex items-center gap-1" },
                                                    React.createElement(Icon, { type: "upload", size: 12 }),
                                                    "Foto\u011Fraf"),
                                                React.createElement("input", { id: "product-image-" + category.id + "-" + item.id, type: "file", accept: "image/*", multiple: true, className: "hidden", onChange: e => uploadProductImage(category.id, item.id, e) })),
                                            React.createElement("div", { className: "flex-1 min-w-0 basis-full sm:basis-auto grid gap-2" },
                                                React.createElement("div", null,
                                                    React.createElement("input", { "aria-label": "\u00DCr\u00FCn ad\u0131", value: item.name, onChange: e => editTurkishField(category.id, item, "name", e.target.value), placeholder: "\u00DCr\u00FCn ad\u0131", className: "admin-input", style: { padding: "8px 9px", fontSize: "12px" } })),
                                                React.createElement("div", null,
                                                    React.createElement("input", { "aria-label": "\u00DCr\u00FCn \u00F6l\u00E7\u00FCleri", value: item.dims, onChange: e => { const v = e.target.value; updateItem(category.id, item.id, "dims", v); updateItem(category.id, item.id, "dims_en", v); }, placeholder: t("TR", "dimsPlaceholder"), className: "admin-input", style: { padding: "8px 9px", fontSize: "12px" } })))),
                                        (() => {
                                            const imgs = Array.isArray(item.images) && item.images.length ? item.images.filter(Boolean) : (item.image ? [item.image] : []);
                                            return imgs.length > 0 && React.createElement("div", { className: "mb-2" },
                                                React.createElement("div", { className: "text-[10px] text-neutral-400 mb-1.5" },
                                                    "Foto\u011Fraflar (",
                                                    imgs.length,
                                                    ") \u00B7 ilk foto\u011Fraf kapak olarak kullan\u0131l\u0131r"),
                                                React.createElement("div", { className: "flex flex-wrap gap-1.5" }, imgs.map((src, i) => React.createElement("div", { key: i + "-" + String(src).length, className: "relative w-16 h-16 rounded-md overflow-hidden border-2", style: { borderColor: i === 0 ? theme.accent : "#404040", backgroundImage: cssUrl(src) || undefined, backgroundSize: "cover", backgroundPosition: "center" } },
                                                    React.createElement("button", { type: "button", "aria-label": `${i + 1}. fotoğrafı sil`, onClick: () => removeProductImage(category.id, item.id, i), className: "thumb-btn absolute top-0 right-0 w-7 h-7 bg-black/75 text-white flex items-center justify-center rounded-bl-md" },
                                                        React.createElement(Icon, { type: "x", size: 13 })),
                                                    i === 0 ? React.createElement("span", { className: "absolute bottom-0 inset-x-0 text-[9px] font-bold text-center", style: { background: theme.accent, color: ink } }, "KAPAK") : React.createElement("button", { type: "button", "aria-label": `${i + 1}. fotoğrafı kapak yap`, onClick: () => makeCoverImage(category.id, item.id, i), className: "thumb-btn absolute bottom-0 inset-x-0 h-5 text-[9px] font-bold bg-black/70 text-white" }, "Kapak yap")))));
                                        })(),
                                        React.createElement("div", { className: "mb-2" },
                                            React.createElement("textarea", { "aria-label": "\u00DCr\u00FCn a\u00E7\u0131klamas\u0131", value: item.desc, onChange: e => editTurkishField(category.id, item, "desc", e.target.value), placeholder: t("TR", "description"), className: "admin-input" })),
                                        React.createElement("div", { className: "rounded-xl border border-neutral-700 bg-neutral-900 p-3 mb-2" },
                                            React.createElement("div", { className: "flex items-center justify-between mb-3" },
                                                React.createElement("div", null,
                                                    React.createElement("div", { className: "text-[10px] uppercase tracking-widest font-bold", style: { color: theme.accent } }, t("TR", "parts")),
                                                    React.createElement("div", { className: "text-[10px] text-neutral-400 mt-1" }, ({ sizes: "Ölçü Kartları düzeni: her satır bir ölçü (ad: 6 kişilik · ölçü: 240x120 · fiyat). Fiyatlar toplanmaz.", models: "Model Sırası düzeni: her satır bir model (Müdür, Şef, Personel, Misafir…) ve kendi fotoğrafı. Fiyatlar toplanmaz." })[categoryLayoutOf(data, category.id)] || t("TR", "partHint"))),
                                                React.createElement("button", { onClick: () => addPricePart(category.id, item.id), className: "px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1", style: { background: theme.accent, color: ink } },
                                                    React.createElement(Icon, { type: "plus", size: 12 }),
                                                    t("TR", "addPrice"))),
                                            !isVariantLayout(categoryLayoutOf(data, category.id)) && React.createElement("div", { className: "rounded-lg bg-neutral-800 p-2.5 mb-3" },
                                                React.createElement("label", { className: "flex items-center justify-between gap-3 text-[11px] font-semibold text-neutral-200" },
                                                    React.createElement("span", null, "Otomatik Topla"),
                                                    React.createElement("input", { type: "checkbox", checked: normalizePrice(item.price).autoCollect !== false, onChange: e => setPriceAutoCollect(category.id, item.id, e.target.checked) })),
                                                normalizePrice(item.price).autoCollect === false ? React.createElement("label", { className: "block mt-2" },
                                                    React.createElement(AdminLabel, null, "Manuel Toplam Fiyat"),
                                                    React.createElement("input", { type: "text", inputMode: "decimal", value: normalizePrice(item.price).manualTotal ?? "", onChange: e => updateItem(category.id, item.id, "price", { ...normalizePrice(item.price), manualTotal: priceNumber(e.target.value) }), placeholder: "\u00D6rn. 18.500", className: "admin-input", style: { padding: "8px", fontSize: "11px" } })) : React.createElement("div", { className: "mt-2 text-[10px] text-neutral-400" },
                                                    "G\u00FCncel toplam: ",
                                                    React.createElement("strong", { style: { color: theme.accent } }, priceTotal(item.price) !== null ? formatAmount(priceTotal(item.price)) : "—"))),
                                            normalizePrice(item.price).parts.length === 0 && React.createElement("div", { className: "text-[10px] text-neutral-500 py-2 text-center" }, "Hen\u00FCz fiyat kalemi eklenmedi."),
                                            normalizePrice(item.price).parts.map(part => React.createElement("div", { key: part.id, className: "bg-neutral-800 rounded-lg p-2 mb-2" },
                                                React.createElement("div", { className: "mb-2" },
                                                    React.createElement("input", { "aria-label": "Par\u00E7a ad\u0131", value: part.name, onChange: e => updatePricePart(category.id, item.id, part.id, "name", e.target.value), placeholder: "Par\u00E7a ad\u0131", className: "admin-input", style: { padding: "8px", fontSize: "11px" } })),
                                                React.createElement("div", { className: "grid grid-cols-[1fr_105px_auto] gap-2 items-center" },
                                                    React.createElement("input", { "aria-label": "Par\u00E7a \u00F6l\u00E7\u00FCs\u00FC", value: part.dims || "", onChange: e => { const v = e.target.value; updatePricePart(category.id, item.id, part.id, "dims", v); updatePricePart(category.id, item.id, part.id, "dims_en", v); }, placeholder: "\u00D6l\u00E7\u00FC", className: "admin-input", style: { padding: "8px", fontSize: "11px" } }),
                                                    React.createElement("input", { type: "number", min: "0", step: "any", inputMode: "decimal", "aria-label": "Par\u00E7a fiyat\u0131 (TL)", value: part.amount ?? "", disabled: part.contactOnly, onChange: e => updatePricePart(category.id, item.id, part.id, "amount", e.target.value === "" ? null : priceNumber(e.target.value)), placeholder: "\u20BA", className: "admin-input", style: { padding: "8px", fontSize: "11px", opacity: part.contactOnly ? .4 : 1 } }),
                                                    React.createElement("button", { type: "button", "aria-label": "Fiyat kalemini sil", onClick: () => deletePricePart(category.id, item.id, part.id), className: "w-9 h-9 flex items-center justify-center bg-red-950 text-red-400 rounded-lg" },
                                                        React.createElement(Icon, { type: "trash", size: 13 }))),
                                                React.createElement("label", { className: "flex items-center gap-2 mt-2 text-[10px] text-neutral-400" },
                                                    React.createElement("input", { type: "checkbox", checked: !!part.contactOnly, onChange: e => updatePricePart(category.id, item.id, part.id, "contactOnly", e.target.checked) }),
                                                    t("TR", "contactOnly")),
                                                categoryLayoutOf(data, category.id) === "models" && React.createElement("div", { className: "flex items-center gap-2 mt-2" },
                                                    React.createElement("div", { className: "w-12 h-12 rounded-md shrink-0 border border-neutral-700", style: { backgroundColor: "#1c1c1c", backgroundImage: cssUrl(part.image) || undefined, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center" } }),
                                                    React.createElement("button", { type: "button", onClick: () => document.getElementById("part-image-" + part.id)?.click(), className: "h-9 px-3 rounded-lg bg-neutral-700 border border-neutral-600 text-[11px] font-bold flex items-center gap-1.5" },
                                                        React.createElement(Icon, { type: "upload", size: 12 }),
                                                        part.image ? "Fotoğrafı Değiştir" : "Fotoğraf Ekle"),
                                                    part.image && React.createElement("button", { type: "button", "aria-label": "Model foto\u011Fraf\u0131n\u0131 kald\u0131r", onClick: () => updatePricePart(category.id, item.id, part.id, "image", null), className: "w-9 h-9 flex items-center justify-center bg-red-950 text-red-400 rounded-lg" },
                                                        React.createElement(Icon, { type: "x", size: 13 })),
                                                    React.createElement("input", { id: "part-image-" + part.id, type: "file", accept: "image/jpeg,image/png,image/webp", className: "hidden", onChange: e => uploadPartImage(category.id, item.id, part.id, e) }))))),
                                        React.createElement("div", { className: "flex justify-end gap-1" }, (() => {
                                            const fullIndex = category.items.findIndex(x => x.id === item.id);
                                            return React.createElement(React.Fragment, null,
                                                React.createElement("button", { type: "button", "aria-label": "\u00DCr\u00FCn\u00FC yukar\u0131 ta\u015F\u0131", onClick: () => moveItem(category.id, item.id, -1), disabled: fullIndex === 0, className: "w-9 h-9 flex items-center justify-center bg-neutral-700 rounded-lg disabled:opacity-20" },
                                                    React.createElement(Icon, { type: "up", size: 14 })),
                                                React.createElement("button", { type: "button", "aria-label": "\u00DCr\u00FCn\u00FC a\u015Fa\u011F\u0131 ta\u015F\u0131", onClick: () => moveItem(category.id, item.id, 1), disabled: fullIndex === category.items.length - 1, className: "w-9 h-9 flex items-center justify-center bg-neutral-700 rounded-lg disabled:opacity-20" },
                                                    React.createElement(Icon, { type: "down", size: 14 })),
                                                React.createElement("button", { type: "button", "aria-label": "\u00DCr\u00FCn\u00FC sil", onClick: () => deleteItem(category.id, item.id), className: "ml-3 h-9 px-3 flex items-center gap-1.5 bg-red-950 text-red-400 rounded-lg text-[11px] font-bold" },
                                                    React.createElement(Icon, { type: "trash", size: 14 }),
                                                    "\u00DCr\u00FCn\u00FC Sil"));
                                        })()))),
                                    React.createElement("button", { onClick: () => addItem(category.id), className: "w-full py-2.5 bg-neutral-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5" },
                                        React.createElement(Icon, { type: "plus", size: 14 }),
                                        t("TR", "addProduct"))))))),
                    React.createElement("div", { className: adminSection === "pdf" ? "" : "hidden" },
                        React.createElement("div", { className: "mt-2 mb-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4" },
                            React.createElement("div", { className: "text-[10px] uppercase tracking-widest font-bold text-amber-500 mb-2" }, "Katalog (Fiyats\u0131z)"),
                            React.createElement("div", { className: "text-xs text-neutral-400 mb-3" }, "Fiyat i\u00E7ermez. \u00DCr\u00FCn g\u00F6rselleri, a\u00E7\u0131klamalar ve \u00F6l\u00E7\u00FCler kullan\u0131l\u0131r. Sitedeki \"Katalog\" d\u00FC\u011Fmesi bu \u015Fablonu kullan\u0131r."),
                            React.createElement("div", { role: "radiogroup", "aria-label": "Katalog \u015Fablonu", className: "grid grid-cols-2 gap-2 mb-4" }, PDF_CATALOG_TEMPLATES.map(tp => {
                                const active = (data.pdf?.catalogTemplate || "vitrin") === tp.id;
                                return React.createElement("button", { key: tp.id, type: "button", role: "radio", "aria-checked": active, onClick: () => setPath(["pdf", "catalogTemplate"], tp.id), className: "text-left rounded-xl p-2.5 border transition-colors", style: { borderColor: active ? theme.accent : "#333", background: active ? theme.accent + "18" : "#141414" } },
                                    React.createElement(CatalogTemplateThumb, { id: tp.id, accent: theme.accent }),
                                    React.createElement("div", { className: "mt-2 text-xs font-bold flex items-center gap-1.5" },
                                        active && React.createElement(Icon, { type: "check", size: 13 }),
                                        tp.name),
                                    React.createElement("div", { className: "text-[11px] text-neutral-400 leading-snug mt-0.5" }, tp.desc));
                            })),
                            React.createElement("label", { className: "block mb-4" },
                                React.createElement(AdminLabel, null, "Katalog Kapak Ba\u015Fl\u0131\u011F\u0131"),
                                React.createElement("input", { className: "admin-input", value: data.pdf?.catalogTitle ?? "", onChange: e => setPath(["pdf", "catalogTitle"], e.target.value), placeholder: "\u00DCR\u00DCN KATALO\u011EU" })),
                            React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                                React.createElement("button", { type: "button", onClick: () => createPDF(false, "catalog"), disabled: !!pdfBusy, className: "min-h-[44px] py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50", style: { background: theme.accent, color: ink } },
                                    React.createElement(Icon, { type: "download", size: 14 }),
                                    pdfBusy === "catalog" ? "Oluşturuluyor…" : "Katalog Önizle ve İndir"),
                                React.createElement("button", { type: "button", onClick: () => createPDF(true, "catalog"), disabled: !!pdfBusy, className: "min-h-[44px] py-3 rounded-xl text-xs font-bold bg-neutral-800 border border-neutral-700 flex items-center justify-center gap-2 disabled:opacity-50" },
                                    React.createElement(Icon, { type: "image", size: 14 }),
                                    "Yeni sekmede a\u00E7"))),
                        React.createElement("div", { className: "rounded-2xl border border-neutral-800 bg-neutral-900 p-4" },
                            React.createElement("div", { className: "text-[10px] uppercase tracking-widest font-bold text-amber-500 mb-2" }, "PDF Fiyat Listesi"),
                            React.createElement("div", { className: "rounded-xl bg-neutral-950 border border-neutral-800 p-3 mb-4" },
                                React.createElement("div", { className: "text-xs font-bold mb-1" }, "Kategori D\u00FCzenleri"),
                                React.createElement("div", { className: "text-[11px] text-neutral-400 mb-3" },
                                    "Her kategori fiyat listesinde se\u00E7ti\u011Finiz d\u00FCzende bas\u0131l\u0131r. ",
                                    React.createElement("b", null, "Tak\u0131m Tablosu"),
                                    ": mod\u00FCller toplan\u0131r. ",
                                    React.createElement("b", null, "\u00D6l\u00E7\u00FC Kartlar\u0131"),
                                    ": her \u00F6l\u00E7\u00FCn\u00FCn ayr\u0131 fiyat\u0131. ",
                                    React.createElement("b", null, "Model S\u0131ras\u0131"),
                                    ": M\u00FCd\u00FCr, \u015Eef, Misafir\u2026 her modelin kendi foto\u011Fraf\u0131 ve fiyat\u0131."),
                                categories.map(category => React.createElement("label", { key: category.id, className: "flex items-center justify-between gap-2 py-1.5 border-t border-neutral-800 first:border-t-0" },
                                    React.createElement("span", { className: "text-[12px] font-semibold truncate" },
                                        category.name,
                                        React.createElement("span", { className: "ml-1.5 text-[10px] font-normal text-neutral-500" },
                                            category.items.length,
                                            " \u00FCr\u00FCn")),
                                    React.createElement("select", { "aria-label": category.name + " fiyat listesi düzeni", value: categoryLayoutOf(data, category.id), onChange: e => setPath(["pdf", "categoryLayouts", category.id], e.target.value), className: "admin-input shrink-0", style: { width: 150, padding: "7px 8px", fontSize: 12 } }, PDF_CATEGORY_LAYOUTS.map(l => React.createElement("option", { key: l.id, value: l.id }, l.name)))))),
                            React.createElement("div", { className: "text-xs text-neutral-400 mb-4" }, "Web sitesindeki kategori, \u00FCr\u00FCn, g\u00F6rsel, \u00F6l\u00E7\u00FC, fiyat, dil ve para birimi s\u0131ras\u0131 aynen PDF'ye aktar\u0131l\u0131r. KG ve M\u00B3 kullan\u0131lmaz."),
                            React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-4" },
                                React.createElement("button", { type: "button", onClick: () => createPDF(false, "price"), disabled: !!pdfBusy, className: "min-h-[44px] py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50", style: { background: theme.accent, color: ink } },
                                    React.createElement(Icon, { type: "download", size: 14 }),
                                    pdfBusy === "price" ? "Oluşturuluyor…" : "Fiyat Listesi Önizle ve İndir"),
                                React.createElement("button", { type: "button", onClick: () => createPDF(true, "price"), disabled: !!pdfBusy, className: "min-h-[44px] py-3 rounded-xl text-xs font-bold bg-neutral-800 border border-neutral-700 flex items-center justify-center gap-2 disabled:opacity-50" },
                                    React.createElement(Icon, { type: "image", size: 14 }),
                                    "Yeni sekmede a\u00E7")),
                            React.createElement("div", { className: "grid grid-cols-2 gap-3 mb-4" },
                                React.createElement("label", null,
                                    React.createElement(AdminLabel, null, "PDF Ba\u015Fl\u0131\u011F\u0131"),
                                    React.createElement("input", { className: "admin-input", value: data.pdf?.title || "", onChange: e => setPath(["pdf", "title"], e.target.value) })),
                                React.createElement("label", null,
                                    React.createElement(AdminLabel, null, "Web Sitesi"),
                                    React.createElement("input", { className: "admin-input", value: data.pdf?.website || "", onChange: e => setPath(["pdf", "website"], e.target.value) }))),
                            React.createElement("label", { className: "block mb-4" },
                                React.createElement(AdminLabel, null, "PDF Alt Bilgisi"),
                                React.createElement("input", { className: "admin-input", value: data.pdf?.footer || "", onChange: e => setPath(["pdf", "footer"], e.target.value) })),
                            React.createElement("label", { className: "flex items-center gap-2 text-xs text-neutral-300 mb-5" },
                                React.createElement("input", { type: "checkbox", checked: data.pdf?.showPageNumbers !== false, onChange: e => setPath(["pdf", "showPageNumbers"], e.target.checked) }),
                                " Sayfa numaras\u0131 g\u00F6ster"),
                            React.createElement("label", { className: "flex items-center gap-2 text-xs text-neutral-300 mb-5" },
                                React.createElement("input", { type: "checkbox", checked: !!data.pdf?.useCategoryCovers, onChange: e => setPath(["pdf", "useCategoryCovers"], e.target.checked) }),
                                " Her kategorinin ba\u015F\u0131na kapak sayfas\u0131 ekle"),
                            React.createElement("div", { className: "border-t border-neutral-800 pt-4 mb-5" },
                                React.createElement("div", { className: "text-[10px] uppercase tracking-widest font-bold text-amber-500 mb-2" }, "PDF Kapak Logosu"),
                                React.createElement("div", { className: "text-[10px] text-neutral-500 mb-3" }, "Bu logo PDF kapa\u011F\u0131nda ve t\u00FCm kategori kapaklar\u0131nda kullan\u0131l\u0131r. Web sitesindeki logo ve \u00FCr\u00FCn g\u00F6rsellerinden ba\u011F\u0131ms\u0131zd\u0131r."),
                                React.createElement("div", { className: "h-32 rounded-lg bg-black border border-neutral-800 overflow-hidden flex items-center justify-center mb-3" }, data.pdf?.coverLogo?.src ? React.createElement(CachedImage, { loading: "lazy", decoding: "async", src: data.pdf.coverLogo.src, alt: "PDF Kapak Logosu", className: "max-w-[90%] max-h-[90%] object-contain" }) : React.createElement("span", { className: "text-[10px] text-neutral-600" }, "PDF KAPAK LOGOSU EKLENMED\u0130")),
                                React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                                    React.createElement("button", { onClick: () => document.getElementById("pdf-cover-logo-input")?.click(), className: "py-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-[10px] font-bold" }, data.pdf?.coverLogo?.src ? "Logoyu Değiştir" : "Logo Ekle"),
                                    React.createElement("button", { disabled: !data.pdf?.coverLogo?.src, onClick: removePdfCoverLogo, className: "py-2.5 rounded-lg bg-red-950 text-red-400 text-[10px] font-bold disabled:opacity-30" }, "Logoyu Sil")),
                                React.createElement("input", { id: "pdf-cover-logo-input", type: "file", accept: "image/png,image/jpeg,image/webp,image/svg+xml", className: "hidden", onChange: uploadPdfCoverLogo })),
                            React.createElement("div", { className: "border-t border-neutral-800 pt-4" },
                                React.createElement("div", { className: "text-[10px] uppercase tracking-widest font-bold text-amber-500 mb-3" }, "Kategori Kapaklar\u0131"),
                                React.createElement("div", { className: "text-[11px] text-neutral-400 mb-3" },
                                    "Kapak sayfas\u0131; \u00FCstte foto\u011Fraf, altta kategori ad\u0131 ve \u00FCr\u00FCn say\u0131s\u0131ndan olu\u015Fur. Foto\u011Fraf y\u00FCklenmeyen kategorilerde foto\u011Fraf alan\u0131nda PDF kapak logosu yer al\u0131r. En iyi sonu\u00E7 i\u00E7in ",
                                    React.createElement("b", null, "yatay"),
                                    " ve en az 1600 piksel geni\u015Fli\u011Finde foto\u011Fraf kullan\u0131n; foto\u011Fraf k\u0131rp\u0131l\u0131r, asla gerilmez. Fiyat listesi ve katalog i\u00E7in ge\u00E7erlidir."),
                                categories.map(category => React.createElement("div", { key: category.id, className: "rounded-xl bg-neutral-950 border border-neutral-800 p-3 mb-3" },
                                    React.createElement("div", { className: "flex items-center justify-between gap-3 mb-3" },
                                        React.createElement("div", { className: "font-semibold text-sm" }, category.name),
                                        React.createElement("div", { className: "text-[10px] text-neutral-500" },
                                            category.items?.length || 0,
                                            " \u00FCr\u00FCn")),
                                    React.createElement("div", { className: "rounded-lg bg-neutral-900 overflow-hidden flex items-center justify-center mb-3", style: { aspectRatio: "595 / 488" } }, category.coverImage ? React.createElement(CachedImage, { loading: "lazy", decoding: "async", src: category.coverImage, alt: "Kapak", className: "w-full h-full object-cover" }) : React.createElement("span", { className: "text-[10px] text-neutral-600" }, "Kapak g\u00F6rseli yok")),
                                    React.createElement("div", { className: "grid grid-cols-3 gap-2" },
                                        React.createElement("button", { type: "button", onClick: () => document.getElementById("cover-image-" + category.id)?.click(), className: "min-h-[36px] py-2 rounded-lg bg-neutral-800 text-[11px] font-bold" }, category.coverImage ? "Değiştir" : "Kapak Yükle"),
                                        React.createElement("button", { type: "button", disabled: !category.coverImage, onClick: () => { if (category.coverImage) {
                                                setFullScreenImage({ images: [category.coverImage], index: 0 });
                                                setLightboxZoom(1);
                                            } }, className: "min-h-[36px] py-2 rounded-lg bg-neutral-800 text-[11px] font-bold disabled:opacity-30" }, "\u00D6nizle"),
                                        React.createElement("button", { type: "button", disabled: !category.coverImage, onClick: () => removeCategoryCover(category.id), className: "min-h-[36px] py-2 rounded-lg bg-red-950 text-red-400 text-[11px] font-bold disabled:opacity-30" }, "Sil")),
                                    React.createElement("input", { id: "cover-image-" + category.id, type: "file", accept: "image/*", className: "hidden", onChange: e => uploadCategoryCover(category.id, e) })))))),
                    React.createElement("div", { className: "sticky bottom-0 bg-neutral-950 border-t border-neutral-800 p-4" },
                        React.createElement("button", { type: "button", onClick: save, disabled: saving || !data, className: "w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50", style: { background: saved ? "#12B76A" : theme.accent, animation: saved ? "pop .3s ease" : saving ? "none" : "pulse 2.2s infinite" } },
                            saved ? React.createElement(Icon, { type: "check", size: 17 }) : React.createElement(Icon, { type: "save", size: 17 }),
                            " ",
                            saved ? t("TR", "saved") : saving ? t("TR", "saving") : t("TR", "save"))))));
}
