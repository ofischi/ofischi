const { useState, useEffect, useRef, useDeferredValue } = React;
/*
  OFISCHI PREMIUM
  - Katalog verisi bu cihazda tutulur (localStorage + IndexedDB)
  - Görseller katalog verisinin içinde saklanır
  - Yönetim PIN'i katalog verisinde DEĞİL; ayrı bir anahtarda PBKDF2 hash olarak tutulur
  - İngilizce alanlar Türkçe alanlardan ayrı tutulur
*/
const DB_KEY = "ofischi_premium_catalog_v4";
/* Tarayıcı depolaması engelliyse (gizli mod, kapalı çerezler) site çökmesin. */
function lsGet(k) { try {
    return window.localStorage.getItem(k);
}
catch (_) {
    return null;
} }
function lsSet(k, v) { try {
    window.localStorage.setItem(k, v);
    return true;
}
catch (_) {
    return false;
} }
function lsRemove(k) { try {
    window.localStorage.removeItem(k);
}
catch (_) { } }
